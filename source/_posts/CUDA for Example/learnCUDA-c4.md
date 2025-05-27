---
title: GPU高性能编程CUDA实战第四章
date: 2024-09-23 15:45:50
tags: CUDA
categories: CUDA-Examples
description: CUDA for example chapter 4
mathjax: true
---

# CUDA并行编程

本章中，我们将看到如何启动一个并行执行的核函数。

## 矢量求和运算

假设有两组数据，我们需要将这两组数据中对应的元素两两相加，并且将结果保存到第三个数组中
<img src="/blog/img/CUDA/04/01.png" alt="两个矢量求和" style="zoom:100%;" />

C的写法：
```c++
#define N 10
void add(int *a,int *b,int *c)
{
    int tid = 0;   //第0个CPU,索引从0开始
    while(tid<N)
    {
        c[tid]=a[tid]+b[tid];
        tid+=1;
    }
}
```
其实这段代码完全可以直接写一个for循环来实现，但这里是为了让代码可以在拥有多个CPU或者CPU核的系统上并行运行，如下
<img src="/blog/img/CUDA/04/02.png" alt="两个CPU核的计算" style="zoom:100%;" />

实际执行的时候，还要写代码来创建线程，每个线程执行，并且假设线程是并行的，但是线程调度的实际情况不是这样的。

## 基于GPU的矢量求和

```c++
__global__ void add(int *a,int *b,int *c)
{
	int tid = blockIdx.x;
	if (tid<N)
	{
		c[tid] = a[tid] + b[tid];
	}
}
int main()
{
	int a[N], b[N], c[N];
	int *d_a, *d_b, *d_c;

	checkCudaErrors(cudaMalloc((void**)&d_a, sizeof(int) * N));
	checkCudaErrors(cudaMalloc((void**)&d_b, sizeof(int) * N));
	checkCudaErrors(cudaMalloc((void**)&d_c, sizeof(int) * N));

	for (int i = 0; i < N; i++)
	{
		a[i] = -i;
		b[i] = i * i;
	}

	checkCudaErrors(cudaMemcpy(d_a, a, sizeof(int) * N,cudaMemcpyHostToDevice));
	checkCudaErrors(cudaMemcpy(d_b, b, sizeof(int) * N,cudaMemcpyHostToDevice));

	add << <N, 1 >> > (d_a, d_b, d_c);
	checkCudaErrors(cudaMemcpy(c, d_c, sizeof(int) * N, cudaMemcpyDeviceToHost));

	for (int i = 0; i < N; i++)
	{
		std::cout << a[i] << " + " << b[i] << " = " << c[i] << std::endl;
	}

	cudaFree(d_a);
	cudaFree(d_b);
	cudaFree(d_c);

	return 0;
}
```

关于尖括号里面的两个数值，可以理解成创建了几个核函数的副本，每个并行执行环境都称为一个Block，并且每个Block都有它对应的Index，通过`threadIdx`和`blockIdx`以及`blockDim`进行计算，维度不同，计算方法也不一样，例如二维是`Index = threadIdx.x + blockIdx.x * blockDim.x;`这几个都是CUDA内置的变量
<img src="/blog/img/CUDA/04/03.png" alt="Device划分" style="zoom:100%;" />

### 有趣的示例
我们来画一个Julia集
迭代等式：
<div>$$Z_{n+1}=Z_n^2+C$$</div>

```c++
struct cuComplex {
	float r;
	float i;
	__host__ __device__ cuComplex(float a,float b):r(a),i(b){}
	__device__ float magnitude2() 
	{
		return r * r + i * i;
	}
	__host__ __device__ cuComplex operator*(const cuComplex& a)
	{
		return cuComplex(r * a.r - i * a.i, i * a.r + r * a.i);
	}
	__host__ __device__ cuComplex operator+(const cuComplex& a)
	{
		return cuComplex(r + a.r, i + a.i);
	}
};

__device__ int julia(int x, int y)
{
	const float scale = 1.5;
	float jx = scale * (float)(DIM / 2 - x) / (DIM / 2);
	float jy = scale * (float)(DIM / 2 - y) / (DIM / 2);

	cuComplex c(-0.8, 0.156);
	cuComplex a(jx, jy);

	for (int i = 0; i < 200; i++)
	{
		a = a * a + c;
		if (a.magnitude2() > 1000)
			return 0;
	}
	return 1;
}

__global__ void kernel(unsigned char* ptr)
{
	int x = blockIdx.x;
	int y = blockIdx.y;
	int offset = x + y * gridDim.x;

	int juliaValue = julia(x, y);
	ptr[offset * 4 + 0] = 255 * juliaValue;
	ptr[offset * 4 + 1] = 0;
	ptr[offset * 4 + 2] = 0;
	ptr[offset * 4 + 3] = 255;
}

int main()
{
	CPUBitmap bitmap(DIM,DIM);
	unsigned char* d_bitmap;
	checkCudaErrors(cudaMalloc((void**)&d_bitmap, bitmap.image_size()));

	dim3 grid(DIM, DIM);
	kernel << <grid, 1 >> > (d_bitmap);
	checkCudaErrors(cudaMemcpy(bitmap.get_ptr(), d_bitmap, bitmap.image_size(), cudaMemcpyDeviceToHost));
	bitmap.display_and_exit();
	checkCudaErrors(cudaFree(d_bitmap));
	return 0;
}
```
