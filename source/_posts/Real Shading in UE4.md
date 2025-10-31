---
title: Real Shading in Unreal Engine 4
date: 2024-07-10 09:58:20
tags: CG, paper
mathjax: true
---

Real Shading in Unreal Engine 4
by Brian Karis, Epic Games

虽然是13年的paper了，但是也值得读一下

# Shading Model

## Diffues BRDF

Burley和Lambertian的diffuse model只有微小的差异，其他更复杂的model很难有效的使用IBL或者球谐光照
Lambertian Diffuse :
<div>$$ f(l,v)=\frac{c_{diff} } {\pi} $$</div>
$c_{diff}$是albedo

## Microfacet Specular BRDF

Cook-Torrance microfacet specular shading model:
<div>$$ f(l,v)=\frac{D(h)F(v,h)G(l,v,h)} {4(n·l)(n·v)} $$</div>

我们从Disney的model开始，评估每一项与更有效的代替方案相比的重要性


### Specular D
D项为法线分布项( normal distribution function (NDF))，Disney用的GGX/Trowbridge-Reitz，效果对得起开销，使用Blinn-Phong的额外开销相当小，而且由于较长的“尾部”产生的明显、自然的视觉效果吸引了艺术家。我们还采用了Disney的$α = Roughness^2$的重新参数化。
$$D(h)=\frac{\alpha^2} {\pi((n·h)^2)(\alpha^2-1)+1}^2$$

### Specular G
G项，几何阴影遮蔽项，评估了很多之后选了Schlick model，不过让$k=/alpha /2$，以更好地适配GGX模型中的Smith模型（一种用于计算微表面几何对遮挡效应的影响的数学模型）
通过修改k，当$\alpha=1$的时候，Schlick model和Smith完全匹配，在[0-1]的范围内，非常接近
我们依然使用Disney's modification来减少 "hotness"（过于光滑或反射过强的现象），在平方之前使用$\frac{Roughness+1}{2}$来remapping粗糙度，很重要的一点是，这个操作只用来分析光源，如果应用到IBL里面，在glancing angles(光线与表面接触的角度非常接近于平行)的结果会很黑
<div>$$ k=\frac{(Roughness+1)^2}{8} $$</div>
<div>$$ G_1(v)=\frac{n·v}{(n·v)(1-k)+k} $$</div>
<div>$$ G(l,v,h)=G_1(l)G_1(v) $$</div>

### Specular F
对于Fresnel，我们用最典型的Schlick's approximation，但是做了一个小修改：我们用球面高斯(Spherical Gaussian)近似来替代power。它的计算效率略高并且没啥差异（imperceptible）公式是：
<div> $$F(v·h)=F_0+(1-F_0)2^{(-5.55473(v·n)-6.98316)(v·h)} $$</div>
其中$F_0$是在法线入射时的镜面反射率(与法线平行)


# Image-Based Lighting

要将这种着色模型与IBL结合使用，需要解决radiance积分问题，通常使用重要性采样进行处理。下面的方程描述了这种数值积分过程：
<div>$$ ∫_{H}{L_i(l)f(l, v)cosθ_ldl} ≈\frac{1}{N}∑_{k=1}^{N} \frac{L_i(l_k)f(l-k, v) cosθ_{l_k}} {p(l_k, v)} $$</div>

基于GGX的镜面反射计算，并结合了IBL来模拟光照效果。
```C++
float3 ImportanceSampleGGX( float2 Xi, float Roughness, float3 N )
{
    float a = Roughness * Roughness;
    float Phi = 2 * PI * Xi.x;
    float CosTheta = sqrt( (1 - Xi.y) / ( 1 + (a*a - 1) * Xi.y ) );
    float SinTheta = sqrt( 1 - CosTheta * CosTheta );
    float3 H;

    H.x = SinTheta * cos( Phi );
    H.y = SinTheta * sin( Phi );
    H.z = CosTheta;

    float3 UpVector = abs(N.z) < 0.999 ? float3(0,0,1) : float3(1,0,0);
    float3 TangentX = normalize( cross( UpVector, N ) );
    float3 TangentY = cross( N, TangentX );

    // Tangent to world space
    return TangentX * H.x + TangentY * H.y + N * H.z;
}
float3 SpecularIBL( float3 SpecularColor , float Roughness, float3 N, float3 V )
{
    float3 SpecularLighting = 0;
    const uint NumSamples = 1024;
    for( uint i = 0; i < NumSamples; i++ )
    {
        float2 Xi = Hammersley( i, NumSamples );
        float3 H = ImportanceSampleGGX( Xi, Roughness, N );
        float3 L = 2 * dot( V, H ) * H - V;

        float NoV = saturate( dot( N, V ) );
        float NoL = saturate( dot( N, L ) );
        float NoH = saturate( dot( N, H ) );
        float VoH = saturate( dot( V, H ) );
        if( NoL > 0 )
        {
            float3 SampleColor = EnvMap.SampleLevel( EnvMapSampler , L, 0 ).rgb;

            float G = G_Smith( Roughness, NoV, NoL );
            float Fc = pow( 1 - VoH, 5 );
            float3 F = (1 - Fc) * SpecularColor + Fc;

            // Incident light = SampleColor * NoL
            // Microfacet specular = D*G*F / (4*NoL*NoV)
            // pdf = D * NoH / (4 * VoH)
            SpecularLighting += SampleColor * F * G * VoH / (NoH * NoV);
        }
    }
    return SpecularLighting / NumSamples;
}
```
即使使用重要性采样，仍然需要进行许多样本的采集。通过使用 mip map 可以显著减少样本数量，但是为了保证足够的质量，仍然需要大于16个样本。由于我们对每个像素进行局部反射的多个环境贴图之间进行混合，因此我们实际上只能负担得起每个像素的单一采样。

##  Split Sum Approximation
我们把上面那个公式拆成两个，每一部分都能预计算，这个近似对于恒定的$L_i(l)$是准确的，并且对于普遍环境而言相当准确
<div>$$ \frac{1}{N}∑_{k=1}^{N} \frac{L_i(l_k)f(l_k, v) cosθ_{l_k}} {p(l_k, v)} = (\frac{1}{N}∑_{k=1}^{N}L_i(l_k) ) (\frac{1}{N}∑_{k=1}^{N}\frac{f(l_k,v)cos\theta_{l_k}} {p(l_k,v)} )$$</div>

##  Pre-Filtered Environment Map
我们计算第一个部分的不同的roughness values并且把结果存到cubemap的mip-map levels里面，这种方法在工业界很常用。一个很小的区别是我们用重要性采样将cubemap和GGX分布进行卷积，因为这个是微表面模型，所有分布的形状会根据观察表面的角度而改变，我们假设角度为0，也就是$n=v=r$，这种各向同性的假设是第二个近似的来源，不幸的是，这意味着我们在接近水平角度（grazing angles）时无法获得漫长的反射（lengthy reflections）与 split sum approximation相比，这实际上是我们基于IBL解决方案中更大的误差来源。如下所示的代码显示，通过 $cos𝜃_{𝑙_𝑘}$加权可以实现更好的结果。

代码如下：
```c++
float3 PrefilterEnvMap( float Roughness, float3 R )
{
    float3 N = R;
    float3 V = R;
    float3 PrefilteredColor = 0;
    const uint NumSamples = 1024;
    for( uint i = 0; i < NumSamples; i++ )
    {
        float2 Xi = Hammersley( i, NumSamples );
        float3 H = ImportanceSampleGGX( Xi, Roughness, N );
        float3 L = 2 * dot( V, H ) * H - V;
        float NoL = saturate( dot( N, L ) );
        if( NoL > 0 )
        {
            PrefilteredColor += EnvMap.SampleLevel( EnvMapSampler , L, 0 ).rgb * NoL;
            TotalWeight += NoL;
        }
    }
    return PrefilteredColor / TotalWeight;
}
```

## Environment BRDF

第二个sum包括了其他所有东西，它其实就是specular BRDF和纯白色环境的结合，即$L_i(l_k)=1$,代入 Schlick’s Fresnel：$F(v, h) = F_0 + (1 −F_0)(1 − v · h)^5$，观察发现$F_0$可以提到积分外面
<div>$$\int_{H} f(\mathbf{l}, \mathbf{v}) \cos \theta_{\mathbf{l} } \mathrm{d} \mathbf{l}=F_{0} \int_{H} \frac{f(\mathbf{l}, \mathbf{v})}{F(\mathbf{v}, \mathbf{h} ) }\left(1-(1-\mathbf{v} \cdot \mathbf{h})^{5}\right) \cos \theta_{\mathbf{l} } \mathrm{d} \mathbf{l}+\int_{H} \frac{f(\mathbf{l}, \mathbf{v}) } {F(\mathbf{v}, \mathbf{h} ) }(1-\mathbf{v} \cdot \mathbf{h} )^{5} \cos \theta_{\mathbf{l}} \mathrm{d} \mathbf{l}$$</div>

这就剩下两个输入（$Roughness and cos\theta-$）和两个输出对𝐹0的缩放和偏置（bias），所有的这些都在[0,1]之内，我们预计算出这个方程的结果并且把它存到一张2D的look-up table里面(LUT)

在完成这项工作之后，我们发现了既有的同时进行的研究，这些研究得出了几乎与我们的解决方案完全相同的结果。尽管 Gotanda 使用了一个3D LUT，而Drobot 将其优化为一个2D的，与我们的方法非常相似。此外，在这门课程的一部分中，Lazarov 迈出了更进一步，通过提出了几个类似积分的解析近似方法。

代码：
```c++
float2 IntegrateBRDF( float Roughness, float NoV )
{
    float3 V;
    V.x = sqrt( 1.0f - NoV * NoV ); // sin
    V.y = 0;
    V.z = NoV; // cos
    float A = 0;
    float B = 0;
    const uint NumSamples = 1024;
    for( uint i = 0; i < NumSamples; i++ )
    {
        float2 Xi = Hammersley( i, NumSamples );
        float3 H = ImportanceSampleGGX( Xi, Roughness, N );
        float3 L = 2 * dot( V, H ) * H - V;
        float NoL = saturate( L.z );
        float NoH = saturate( H.z );
        float VoH = saturate( dot( V, H ) );
        if( NoL > 0 )
        {
            float G = G_Smith( Roughness, NoV, NoL );
            float G_Vis = G * VoH / (NoH * NoV);
            float Fc = pow( 1 - VoH, 5 );
            A += (1 - Fc) * G_Vis;
            B += Fc * G_Vis;
        }
    }
    return float2( A, B ) / NumSamples;
}
```

最后，为了把重要性采样的抽样参考，我们把两个预计算结果相乘：
```c++
float3 ApproximateSpecularIBL( float3 SpecularColor , float Roughness, float3 N, float3 V )
{
    float NoV = saturate( dot( N, V ) );
    float3 R = 2 * dot( V, N ) * N - V;
    float3 PrefilteredColor = PrefilterEnvMap( Roughness, R );
    float2 EnvBRDF = IntegrateBRDF( Roughness, NoV );
    return PrefilteredColor * ( SpecularColor * EnvBRDF.x + EnvBRDF.y );
}
```

# Material Model
我们的材质模型是对Disney模型的简化，注重实时渲染的效率，限制参数的数量很重要，它可以优化G-buffer的空间，减少纹理存储和读取，最小化在片元着色器中混合材质层(material layers)的消耗。

material base：
 - BaseColor：没啥好说的
 - Metallic：无需理解介质和导体的反射率，因此错误的可能性更小。
 - Roughness: 比gloss好理解
 - Cavity: 用于小规模阴影（small-scale shadowing）.
