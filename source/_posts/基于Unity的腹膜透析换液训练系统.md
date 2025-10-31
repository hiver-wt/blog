---
title: 基于Unity的腹膜透析换液训练系统
date: 2024-07-27 13:19:10
tags: Unity
categories: Unity
description: 实习的时候做的项目，记录一下开发过程
mathjax: true
---


# 基于Unity的腹膜透析换液训练系统

实习做的第一个项目，记录一下开发过程和一部分个人觉得有用的技术

## Shader相关

### Kawase高性能模糊


参考：{% link 十种图像模糊算法的总结与实现, https://cloud.tencent.com/developer/article/1614858 %}

Kawase Blur最初用于Bloom后处理特效，但其可以推广作为专门的模糊算法使用，且在模糊外观表现上与高斯模糊非常接近。

主要思路是对距离当前像素越来越远的地方对四个角进行采样，且在两个大小相等的纹理之间进行乒乓式的blit。创新点在于，采用了随迭代次数移动的blur kernel，而不是类似高斯模糊，或box blur一样从头到尾固定的blur kernel。
<img src="/blog/image/1.1.jpeg" alt="1.1" style="zoom:75%;" />
<img src="/blog/image/1.2.jpeg" alt="1.1" style="zoom:75%;" />

实践数据表明，在相似的模糊表现下，Kawase Blur比经过优化的高斯模糊的性能约快1.5倍到3倍。

具体思路是在runtime层，基于当前迭代次数，对每次模糊的半径进行设置，而Shader层实现一个4 tap的Kawase Filter即可：

```c++
half4 frag(v2f i):SV_TARGET
    {
        float4 col;
        half4 tex=SAMPLE_TEXTURE2D(_MainTex,sampler_MainTex,i.texcoord);
        tex+=SAMPLE_TEXTURE2D(_MainTex,sampler_MainTex,i.texcoord+float2(-1,-1)*_MainTex_TexelSize.xy*_Blur);
        tex+=SAMPLE_TEXTURE2D(_MainTex,sampler_MainTex,i.texcoord+float2(1,-1)*_MainTex_TexelSize.xy*_Blur);
        tex+=SAMPLE_TEXTURE2D(_MainTex,sampler_MainTex,i.texcoord+float2(-1,1)*_MainTex_TexelSize.xy*_Blur);
        tex+=SAMPLE_TEXTURE2D(_MainTex,sampler_MainTex,i.texcoord+float2(1,1)*_MainTex_TexelSize.xy*_Blur);
        return tex/5.0;
    }
```
效果如下:
<img src="/blog/image/1.3.png   " alt="1.1" style="zoom:75%;" />


## Unity相关

### 协程

参考：{% link Unity协程, https://blog.csdn.net/xinzhilinger/article/details/116240688 %}

在使用Unity进行游戏开发时，一般（注意是一般）不考虑多线程，因为在Unity中，只能在主线程中获取物体的组件、方法、对象，如果脱离这些，Unity的很多功能无法实现，那么多线程的存在与否意义就不大了

线程与协程有什么区别呢：

- 对于协程而言，同一时间只能执行一个协程，而线程则是并发的，可以同时有多个线程在运行
- 两者在内存的使用上是相同的，共享堆，不共享栈
- 最简单的区别是微观上线程是并行（对于多核CPU）的，而协程是串行的


协程，从字面意义上理解就是协助程序的意思，我们在主任务进行的同时，需要一些分支任务配合工作来达到最终的效果

协程是通过迭代器来实现功能的，通过关键字`IEnumerator`来定义一个迭代方法
```c#
void Interact()
{
    // 延迟2秒后调用 SwitchCamera 方法
    StartCoroutine(DelayedSwitchCamera(1.5f));
    // StartCoroutine("DelayedSwitchCamera", 1.5);
}

IEnumerator DelayedSwitchCamera(float delayTime)
{
    yield return new WaitForSeconds(delayTime);
    cm.SwitchCamera();
}
```
项目中一个很简单的方法，用来延迟相机的切换

补充：untiy生命周期图
<img src="/blog/image/2.1.png   " alt="1.1" style="zoom:75%;" />
> 位于Update与LateUpdate之间这些yield 的含义：
- `yield return null`; 暂停协程等待下一帧继续执行
- `yield return 0`或其他数字; 暂停协程等待下一帧继续执行
- `yield return new WairForSeconds`(时间); 等待规定时间后继续执行
- `yield return StartCoroutine`("协程方法名");开启一个协程（嵌套协程)


> 接下来看几个特殊的yield，他们是用在一些特殊的区域，一般不会有机会去使用，但是对于某些特殊情况的应对会很方便
- `yield return GameObject`; 当游戏对象被获取到之后执行
- `yield return new WaitForFixedUpdate()`：等到下一个固定帧数更新
- `yield return new WaitForEndOfFrame()`:等到所有相机画面被渲染完毕后更新
- `yield break`; 跳出协程对应方法，其后面的代码不会被执行