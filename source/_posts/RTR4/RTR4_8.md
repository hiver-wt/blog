---
title: RTR4 Chapter 8(Light and Color)
date: 2024-06-28 16:20:20
tags: CG
categories: RTR4
description: RTR4 Chapter 8 Light and Color
mathjax: true
---
# Light and Color

> 本章主要是PBR的前置理论

## 光量

### radiometry

- 前置知识
  1. 常用物理量总结：
  <img src="/blog/img/RTR4/c8/202306131534243.png" alt="辐射量及其单位" style="zoom:50%;" />

  2. 球面坐标：
  <img src="/blog/img/RTR4/c8/20240320122411.png" alt="球面坐标" style="zoom:50%;" />

  3. 投影面积：
  <img src="/blog/img/RTR4/c8/20240320122536.png" alt="投影面积" style="zoom:50%;" />


- 名词解释：
  
Radiant Flux：是最基本的单位，指辐射
能量随时间的流动变化，又叫做功率，通常用Φ来表示，单位是 W，瓦特。
<div>$$\Phi=\frac{dQ}{dt}$$</div>

Radiance：

Radiant Intensity：每单位立体角的Radiant Flux，用符号 I 表示，单位 $W·sr^{-1}$，瓦特每球面度
<div>$$I=\frac{d\Phi}{d\omega}$$</div>

Irradiance：指入射表面的Radiant Flux，即单位时间内到达单位面积的Radiant Flux，或到达单位面积的Radiant Flux
用符号 E 表示，单位$W/𝑚^2$，瓦特每平方米。

> Irradiance可以写成Radiance在入射光所形成的半球上的积分：
<div>$$\frac{d\Phi}{dA}=E=\int_\Omega L(\omega)cos\theta d\omega$$</div>
