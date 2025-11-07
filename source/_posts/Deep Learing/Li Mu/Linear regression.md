---
title: Linear Regression
date: 2025-11-05 16:25:31
tags: AI; Deep Learing
categories: Deep Learing
description: Linear regression
mathjax: true
---

# 线性模型

在机器学习中，我们需要真实的数据集，称为训练数据集（training data set） 或训练集（training set）。 每行数据（比如一次房屋交易相对应的数据）称为样本（sample）， 也可以称为数据点（data point）或数据样本（data instance）。 我们把试图预测的目标（比如预测房屋价格）称为标签（label）或目标（target）。 预测所依据的自变量（面积和房龄）称为特征（feature）或协变量（covariate）。

线性模型：目标（房屋价格）可以表示为特征（面积和房龄）的加权和，如下面的式子：

<div>
$$
\text{price} = w_{\text{area}} \cdot \text{area} + w_{\text{age}} \cdot \text{age} + b
$$
</div>

其中$w$称为权重（weight），权重决定了每个特征对我们预测值的影响。 $b$称为偏置（bias），偏置是指当所有特征都取值为0时，预测值应该为多少。 

# 损失函数

损失函数（loss function）能够量化目标的实际值与预测值之间的差距。通常我们会选择非负数作为损失，且数值越小表示损失越小，完美预测时的损失为0。回归问题中最常用的损失函数是平方误差函数。

<div> 
$$
l^{(i)}(\mathbf{w}, b) = \frac{1}{2} \left( \hat{y}^{(i)} - y^{(i)} \right)^2
$$
</div>

二分之一不会带来本质的差别，但这样在形式上稍微简单一些 （这样对损失函数求导后常数系数为1）

<img src="/blog/img/fit-linreg.svg" alt="用线性模型拟合数据" style="zoom:75%;" />

为了评估模型在整个数据集上的质量，我们需计算在训练集n个样本上的损失均值

<div>
$$
L(\mathbf{w}, b) = \frac{1}{n} \sum_{i=1}^{n} l^{(i)}(\mathbf{w}, b) = \frac{1}{n} \sum_{i=1}^{n} \frac{1}{2} \left( \mathbf{w}^\top \mathbf{x}^{(i)} + b - y^{(i)} \right)^2
$$
</div>

在训练模型时，我们希望寻找一组参数$(\mathbf{w}_0, b_0)$， 这组参数能最小化在所有训练样本上的总损失。如下式：

<div>
$$
\mathbf{w}_0, b_0 = \underset{\mathbf{w}, b}{\operatorname{argmin}} \ L(\mathbf{w}, b)
$$
</div>

# 解析解