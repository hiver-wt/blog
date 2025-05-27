---
title: GPU高性能编程CUDA实战第五章
date: 2024-09-23 17:25:31
tags: CUDA
categories: CUDA-Examples
description: CUDA for example chapter 5
mathjax: true
---

# 并行线程块的分解

在矢量加法的时候，我们为矢量中的每个元素（共有N个元素）都启动了一个线程块
`add<<<N,1>>>(dev_a,dev_b,dev_c);` 第二个参数表示CUDA运行时每个线程块中创建的线程数量。

总共启动的线程数量可以按以下公司计算：
<div>$$ N个线程块 * 1个线程/线程块 = N个并行线程 $$</div>

## 矢量求和

### 更长的矢量求和
书中案例是许多图形处理器而言，每个线程块512个线程。
`tid = threadIdx.x+blockIdx.x*blockDim.x;`
我们在每个线程块中包含的线程数量固定为128，然后可以启动`N/128`个线程块，这样N个线程就同时启动了。

问题在于，`N/128`是整数除法，如果N等于127，那么`N/128`就等于0，所以计算方法应该改成`(N+127)/128`

核函数调用就变成
`add<<<(N+127)/128,128>>>(dev_a,dev_b,dev_c)`

当N不是128的整数倍时，将启用过多的线程。在核函数中已经解决了这个问题，在访问输入数组和输出数组之前，必须检查线程的便宜是否位于0-N之间
```c++
if(tid<N)
    c[tid]=a[tid]+b[tid];
```

### 对任意长度的矢量求和

除了在线程数量上存在限制外，在线程块的数量上同样存在一个硬件限制，线程格每一维的大小都不能超过65535。

这对矢量加法的实现带来一个问题。如果启动N/128个线程将矢量相加，那么当矢量长度超过65535*128=8388480时，核函数调用会失败。（ N/128 的值将超过 65535。而网格在X方向的最大线程块数不能超过 65535。）

解决方法很简单，首先修改核函数
```c++
__global__ void add(int *a,int *b,int *c)
{
    int tid = threadIdx.x+blockIdx.x*blockDim.x;
    while(tid<N)
    {
        c[tid]=a[tid]+b[tid];
        tid+=blockDim.x*gridDim.x;
    }
}
```

我们对数据进行迭代，将并行线程的数量看成是处理器的数量，尽管GPU的处理单元数量可能大于或者小于这个值，但我们认为每个线程在逻辑上都可以并行，并且硬件可以调度这些线程以便实际执行。

在每个线程计算完成当前索引上的任务之后，接着需要对索引进行递增，步长为线程格中正在运行的线程数量，也就是`blockDim.x*gridDim.x`

为了确保不会启动过多的线程块，我们将线程块的数量固定为某个较小的值
`add<<<128,128>>>(dev_a,dev_b,dev_c)`
目前来说128够了，后面会讨论性能相关的，现在，矢量的长度限制只取决于GPU上的内存容量

### 波纹效果
```c++
#include "cuda_runtime.h"
#include "device_launch_parameters.h"
#include <iostream>
#include <cmath>
#include <stdio.h>
#include "common/cpu_bitmap.h"
#include "common/cpu_anim.h"

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

#define DIM 128

struct DataBlock
{
	unsigned char* dev_bitmap;
	CPUAnimBitmap* bitmap;
};

__global__ void kernel(unsigned char* ptr, int ticks)
{
	int x = threadIdx.x + blockIdx.x * blockDim.x;
	int y = threadIdx.y + blockIdx.y * blockDim.y;
	int offset = x + y * blockDim.x * gridDim.x;
	float fx = x - DIM / 2;
	float fy = y - DIM / 2;
	float d = sqrtf(fx * fx + fy * fy);
	unsigned char grey = (unsigned char)(128.0f + 127.0f * cos(d / 10.0f - ticks / 7.0f) / (d / 10.0f + 1.0f));

	ptr[offset * 4 + 0] = grey;
	ptr[offset * 4 + 1] = grey;
	ptr[offset * 4 + 2] = grey;
	ptr[offset * 4 + 3] = 255;
}

void cleanUp(DataBlock* d)
{
	cudaFree(d->dev_bitmap);
}

void generate_frame(DataBlock* d, int ticks)
{
	dim3 blocks(DIM / 16, DIM / 16);
	dim3 threads(16, 16);
	kernel << <blocks, threads >> > (d->dev_bitmap, ticks);
	checkCudaErrors(cudaMemcpy(d->bitmap->get_ptr(), d->dev_bitmap, d->bitmap->image_size(), cudaMemcpyDeviceToHost));
}

int main()
{
	DataBlock data;
	CPUAnimBitmap bitmap(DIM, DIM, &data);
	data.bitmap = &bitmap;
	checkCudaErrors(cudaMalloc((void**)&data.dev_bitmap, bitmap.image_size()));
	bitmap.anim_and_exit((void(*)(void*, int))generate_frame, (void(*)(void*))cleanUp);
}
```
## 共享内存和同步

CUDA C编译器对共享内存中的变量与普通变量将分别采取不同的处理方式。对于在GPU上启动的每个线程块，CUDA C编译器都将创建该变量的一个副本。线程块中的每一个线程都共享这块内存，但线程却无法看到也不能修改其他线程块的变量副本。这就实现了一种非常好的方式，使得一个线程块中的多个线程都够在计算上进行通信和协作。而且，共享内存缓存区是在物理GPU上，所以访问共享内存时的延迟要远远低于访问普通缓存区的延迟，使得共享内存想每个线程块的高速缓存或者中间结果暂存器那样高校。

如果线程A将一个值写入到共享内存，并且我们希望线程B对这个值进行操作，那么只有线程A的写入操作完成之后，B才能开始。如果没有这个同步，那么将发生竞态条件（Race Condition），在这种情况下，代码执行结果的正确性将取决于硬件的不确定性。

### 点积运算

```c++
#define imin(a,b) (a<b?a:b)

const int N = 33 * 1024;
const int threadsPerBlock = 256;
__global__ void dot(float* a, float* b, float* c)
{
	__shared__ float cache[threadsPerBlock];
	int tid = threadIdx.x + blockIdx.x * blockDim.x;
	int cacheIndex = threadIdx.x;
	float temp;
	while (tid < N)
	{
		temp += a[tid] * b[tid];
		tid += blockDim.x * gridDim.x;
	}
	cache[cacheIndex] = temp;
}
```

声明了一个共享内存缓存区，名字为cache。用于保存每个线程计算的加和值。相当于在C里面声明一个static或者volatile `__shared__ float cache[threadsPerBlock];`

共享内存缓存中的偏移就等于线程索引，线程块都拥有该共享内存的私有副本。

当我们把cache中所有的值加起来的时候，需要通过一个线程来读取保存在cache里面的值，但是这很危险 _（竞态条件： 如果多个线程同时访问或修改共享内存中的同一个位置，而没有同步机制，那么访问顺序是不确定的，可能会导致线程之间的冲突，）_

我们需要某种方法来确保所有对共享数组cache[]的写入操作在读取cache之前完成
```c++
// 对线程块中的线程进行同步
__syncthreads();
````
这个函数确保每个线程都执行完了该函数前面的语句之后，才会执行后面的。

这个相加的过程，也叫归约（Reduction）。最简单的方法是，由一个线程在共享内存上进行迭代并且计算出总和。计算时间和数组长度成正比。这里的例子由数百个线程可以用，因此我们可以用并行的方式来执行，这样所花费的时间和数组长度的对数成正比

```c++
int i = blockDim.x/2;
while(i != 0)
{
	if(cacheIndex < i)
		cache[cacheIndex] += cache[cacheIndex + i];
	__syncthreads();
	i /= 2;
}
```
