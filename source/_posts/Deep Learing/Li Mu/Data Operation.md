---
title: Data Processing
date: 2025-11-03 15:32:40
tags: AI; Deep Learing
categories: Deep Learing
description: Data Processing For PyTorch
mathjax: true
---

# 数据处理

```python
x = torch.arange(12)
# tensor([ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11])

X = x.reshape(3, 4)
# tensor([[ 0,  1,  2,  3],
#        [ 4,  5,  6,  7],
#        [ 8,  9, 10, 11]])

torch.randn(3, 4)
# tensor([[-0.0135,  0.0665,  0.0912,  0.3212],
#        [ 1.4653,  0.1843, -1.6995, -0.3036],
#        [ 1.7646,  1.0450,  0.2457, -0.7732]])

X = torch.arange(12, dtype=torch.float32).reshape((3,4))
Y = torch.tensor([[2.0, 1, 4, 3], [1, 2, 3, 4], [4, 3, 2, 1]])
torch.cat((X, Y), dim=0), torch.cat((X, Y), dim=1)
# dim = 0 : 竖着连接 
# dim = 1 : 横着连接
# (tensor([[ 0.,  1.,  2.,  3.],
#         [ 4.,  5.,  6.,  7.],
#         [ 8.,  9., 10., 11.],
#         [ 2.,  1.,  4.,  3.],
#         [ 1.,  2.,  3.,  4.],
#         [ 4.,  3.,  2.,  1.]]),
# tensor([[ 0.,  1.,  2.,  3.,  2.,  1.,  4.,  3.],
#         [ 4.,  5.,  6.,  7.,  1.,  2.,  3.,  4.],
#         [ 8.,  9., 10., 11.,  4.,  3.,  2.,  1.]]))

X[-1], X[1:3]
# 与任何Python数组一样：第一个元素的索引是0，最后一个元素索引是-1； 可以指定范围以包含第一个元素和最后一个之前的元素。

# (tensor([ 8.,  9., 10., 11.]),
# tensor([[ 4.,  5.,  6.,  7.],
#         [ 8.,  9., 10., 11.]]))
```

# 数据预处理

```python
# 创建一个csv文件
import os

os.makedirs(os.path.join('..', 'data'), exist_ok=True)
data_file = os.path.join('..', 'data', 'house_tiny.csv')
with open(data_file, 'w') as f:
    f.write('NumRooms,Alley,Price\n')  # 列名
    f.write('NA,Pave,127500\n')  # 每行表示一个数据样本
    f.write('2,NA,106000\n')
    f.write('4,NA,178100\n')
    f.write('NA,NA,140000\n')

# 读取
import pandas as pd

data = pd.read_csv(data_file)
print(data)

#    NumRooms Alley   Price
# 0       NaN  Pave  127500
# 1       2.0   NaN  106000
# 2       4.0   NaN  178100
# 3       NaN   NaN  140000

# 处理缺失的数据
inputs, outputs = data.iloc[:, 0:2], data.iloc[:, 2] # index location
inputs = inputs.fillna(inputs.mean())
print(inputs)

#   NumRooms Alley
# 0       3.0  Pave
# 1       2.0   NaN
# 2       4.0   NaN
# 3       3.0   NaN

# 对于string 可以把NaN单独看成一个特征
inputs = pd.get_dummies(inputs, dummy_na=True)
print(inputs)
#    NumRooms  Alley_Pave  Alley_nan
# 0       3.0           1          0
# 1       2.0           0          1
# 2       4.0           0          1
# 3       3.0           0          1

# 最后转换成tensor
import torch

X = torch.tensor(inputs.to_numpy(dtype=float))
y = torch.tensor(outputs.to_numpy(dtype=float))
X, y
# (tensor([[3., 1., 0.],
#          [2., 0., 1.],
#          [4., 0., 1.],
#          [3., 0., 1.]], dtype=torch.float64),
#  tensor([127500., 106000., 178100., 140000.], dtype=torch. float64))

# 删除NaN最多的列
nan_counts = data.isnull().sum()
max_nan_column = nan_counts.idxmax()
data_cleaned = data.drop(columns=[max_nan_column])
```