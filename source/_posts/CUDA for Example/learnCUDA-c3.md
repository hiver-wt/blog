---
title: GPU高性能编程CUDA实战第三章
date: 2024-09-13 11:02:55
tags: CUDA
categories: CUDA-Examples
description: CUDA for example chapter 3
mathjax: true
---

# 第一个程序
当然是hello world

## hello world和核函数

```c++
__global__ void kernel()
{
	printf("hello world from cuda!\n");
}
int main()
{
	kernel <<<1, 1 >>> ();
}
```
`__global__`：这个修饰符告诉编译器，这个函数在设备(device)上运行，而不是在主机(host)上

这里关键在于如何在主机代中调用设备代码，后面会解释

## 传递参数


```c++
#include "cuda_runtime.h"
#include "device_launch_parameters.h"
#include <iostream>
#define checkCudaErrors(val) check_cuda( (val), #val, __FILE__, __LINE__ )

void check_cuda(cudaError_t result, char const* const func, const char* const file, int const line) {
	if (result) {
		std::cerr << "CUDA error = " << static_cast<unsigned int>(result) << " at " <<
			file << ":" << line << " '" << func << "' \n";
		// Make sure we call CUDA Device Reset before exiting
		cudaDeviceReset();
		exit(99);
	}
}
__global__ void add(int a,int b,int *c)
{
	*c = a + b;
}
int main()
{
	int c;
	int* dev_c;
	checkCudaErrors(cudaMalloc((void**)&dev_c, sizeof(int)));
	add << <1, 1 >> > (2, 7, dev_c);
	checkCudaErrors(cudaMemcpy(&c, dev_c, sizeof(int), cudaMemcpyDeviceToHost));
	std::cout << "2 + 7 = " << c << std::endl;
	cudaFree(dev_c);
	return 0;
}
```
当设备执行任何有用的操作的时候，都需要分配内存，例如将计算机的值返回给主机。

需要注意的
- `cudaMalloc()`：类似于C的malloc，告诉CUDA运行时在device上分配内存，第一个参数是一个`(void**)`的指针，指向用于保存新分配内存地址的变量，第二个参数是分配内存的大小，返回类型是`void*`
- `checkCudaErrors()`：判断函数是否返回了一个错误值，并且输出相关信息

这里引出了一个重要的问题，<font color="red">一定不能在host代码中对cudaMalloc()返回的指针进行Dereference。</font>host代码可以将这个指针作为参数传递，对其进行算术运算，甚至可以将其转换为另一种不同的类型，<font color="red">但是，绝对不可以使用这个指针读取或者写入内存</font>

- `cudaMalloc()` 返回的指针是指向设备（GPU）内存的，而主机代码（运行在 CPU 上）无法直接访问 GPU 内存。
- CUDA 通过 PCIe（或其他高速接口）将 CPU 和 GPU 连接起来，但它们各自的内存访问权限是严格受限的。设备指针仅能在 GPU 内部的核函数中使用，主机代码没有直接访问这些指针的权限。如果在主机代码中解引用这些指针，会导致未定义行为，通常表现为程序崩溃或数据错误。

总的来说，主机指针只能访问主机代码中的内存，设备指针也只能访问设备代码中的内存

不过，在主机代码中可以通过`cudaMemcpy()`来访问设备上的内存，类似于memcpy，但是多了一个指定设备内存指针是源指针还是目标指针的，这里是`cudaMemcpyDeviceToHost` 也就是告诉运行时源指针是设备指针，目标指针是主机指针。

# 查询设备

我们希望知道系统中有多少个设备是支持CUDA架构的，并且这些设备能运行基于CUDA C编写的kernel
```c++
int count;
checkCudaErrors(cudaGetDeviceCount(&count));
```

CUDA运行时将返回一个cudaDeviceProp类型的结构体
  <img src="/blog/img/CUDA/01/01.png" alt="CUDA设备属性" style="zoom:75%;" />

目前来说，不会详细介绍，当开始编写应用程序时，这些属性会很有用。

# 设备属性的使用

如果我们希望编写出的软件是最快的，那么可能需要选择处理器最多的GPU，如果核函数与CPU之间需要进行密集交互，那么可能需要在集成的GPU上运行代码，因为它可以和CPU共享内存，这两个属性可以通过`cudaGetDeviceProperies()`查询

假设我们正在编写一个需要double计算的app，GPU设备至少需要支持1.3或者更高版本的计算功能集。

```c++
int main()
{
	cudaDeviceProp prop;
	int dev;

	checkCudaErrors(cudaGetDevice(&dev));
	std::cout << "ID of current CUDA device:  " << dev << std::endl;

	memset(&prop, 0, sizeof(cudaDeviceProp));
	prop.major = 1;
	prop.minor = 3;
	checkCudaErrors(cudaChooseDevice(&dev, &prop));
	std::cout<< "ID of CUDA device closest to revision 1.3:  " << dev << std::endl;
	checkCudaErrors(cudaSetDevice(dev));
	return 0;
}
```
首先，找出我们希望设备拥有的属性并且填充到`prop`里，然后传递给`cudaChooseDevice()`，返回一个设备ID，然后就可以传递给`cudaSetDevice()了`