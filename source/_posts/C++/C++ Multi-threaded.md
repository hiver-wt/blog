---
title: C++ Multi-threaded
date: 2024-11-27 15:25:27
tags: Cpp
mathjax: true
---

# 多线程

**更多的是并发**

进程：一整个exe文件，独立内存空间
线程：进程里面的一个实体。共享同样的内存

多线程也能让程序变成异步，比如一些GUI程序，浏览器在后台下载的时候，用户依然能操作UI界面
```c++
#include <iostream>
#include <thread>
#include <string>

void Download(std::string file)
{
	for (int i = 0; i < 10; i++)
	{
		std::cout << "Downloading " << file << " (" << i * 10 << "%)..." << std::endl;
		std::this_thread::sleep_for(std::chrono::milliseconds(400));
	}
	std::cout << "Download complete: " << file << std::endl;
}

void Interact()
{
	std::string name;
	std::cin >> name;
	std::cout << "Hi, " << name<<std::endl;
}
int main()
{
	Download("wt.zip");
	Interact();
	return 0;
}
```

很显然这个代码不能同时下载和交互，所以C++11 引入多线程
```c++
int main()
{
	std::thread t1([&] {
		Download("wt.zip"); 
		});
	Interact();
	return 0;
}
```

`std::thread` 构造函数的参数可以是任意lambda表达式，当线程启动的时候，就会执行这个内容，这样做确实可以一边下载，一边交互了，但是交互之后，主线程退出了，子线程也被迫退出了，所以程序就崩了

现在就需要让主线程等一下子线程
```c++
int main()
{
	std::thread t1([&] {
		Download("wt.zip"); 
		});
	Interact();
	std::cout << "Waiting for child thread..." << std::endl;
	t1.join();   //waiting
	std::cout << "Child thread exited" << std::endl;
	return 0;
}
```

如果这个线程是在单独的一个函数里面
```c++
void myThread()
{
	std::thread t1([&] {
		Download("wt.zip");
		});
	// 退出函数体的时候，会销毁t1线程的句柄
}
int main()
{
	myThread();
	Interact();
	return 0;
}
```

thread类自定义了析构函数（删除了拷贝构造，提供了移动构造）退出这个函数的时候，t1会调用它的解构函数 ，程序又崩了

解决方法：调用`detach()`分离该线程，意味着线程的生命周期不再由当前`std::thread`对象管理，而是在线程退出之后自动销毁自己，但是`detach`之后不会自动`Join`，`Interact`完之后还是会退出

有一种解决方法是，创建一个全局的变量，让t1活到main退出的时候
```c++
std::vector<std::thread> pool;

void myThread()
{
	std::thread t1([&] {
		Download("wt.zip");
		});
	pool.push_back(std::move(t1));//移交控制权到全局的pool中
}
int main()
{
	myThread();
	Interact();
	for (auto& t : pool) t.join();
	return 0;
}
```

这么做有点麻烦，可以自定义一个类ThreadPool，并且用它创建一个全局变量，其析构函数会在main退出之后自动调用
```c++
class ThreadPool
{
	std::vector<std::thread> m_pool;
public:
	void push_back(std::thread thr)
	{
		m_pool.push_back(std::move(thr));
	}
	~ThreadPool() {
		for (auto& t : m_pool) t.join();
	}
};

ThreadPool pool;
void myThread()
{
	std::thread t1([&] {
		Download("wt.zip");
		});
	pool.push_back(std::move(t1));
	// joinable：判断thread里面是否为NULL，这里移动完之后就是NULL了
}
int main()
{
	myThread();
	Interact();
	return 0;
}
```

# 异步

同步就是必须下载完才能交互，异步就是下载过程中阻塞了，在等待Internet请求，就可以自动切换到和用户交互的线程上

`std::async`：接受一个带返回值的lambda对象，自身返回一个`std::future` 对象，这个对象表示，现在还没有，但是之后一定会有
```c++
#include <iostream>
#include <thread>
#include <string>
#include <vector>
#include <future>

int Download(std::string file)
{
	for (int i = 0; i < 10; i++)
	{
		std::cout << "Downloading " << file << " (" << i * 10 << "%)..." << std::endl;
		std::this_thread::sleep_for(std::chrono::milliseconds(800));
	}
	std::cout << "Download complete: " << file << std::endl;
	return 11;
}

void Interact()
{
	std::string name;
	std::cin >> name;
	std::cout << "Hi, " << name<<std::endl;
}

int main()
{
	std::future<int> fret = std::async([&] {
		return Download("wt.zip");
		});
	Interact();
	int ret = fret.get();
	std::cout << "Download result: " << ret << std::endl;
	return 0;
}
```
`lambda`的函数体会在另一个线程执行。`main`里面就可以做其他事情了，`Download`会持续在后台运行，最后调用`future`的`get`方法，如果此时`Download`还没完成，会等待`Download`完成，并且获得Download的返回值

除了`get()`会等待线程执行完外，wait()也可以 ，但是不会返回值
```c++
int main()
{
	std::future<int> fret = std::async([&] {
		return Download("wt.zip");
		});
	Interact();
	std::cout << "Waiting for Download complete..." << std::endl;
	fret.wait();
	std::cout << "Wait return" << std::endl;
	int ret = fret.get();
	std::cout << "Download result: " << ret << std::endl;
	return 0;
}
```

也可以等待一段时间 `wait_for()
```c++
int main()
{
	std::future<int> fret = std::async([&] {
		return Download("wt.zip");
		});
	Interact();
	while (true)
	{
		std::cout << "Waiting for Download complete..." << std::endl;
		auto stat = fret.wait_for(std::chrono::milliseconds(1000));
		if (stat == std::future_status::ready) 
		{
			std::cout << "Future is ready" << std::endl;
			break;
		}
		else
		{
			std::cout << "Future is not ready" << std::endl;
		}
	}
	int ret = fret.get();
	std::cout << "Download result: " << ret << std::endl;
	return 0;
}
```
只要线程没有被执行完，`wait()`会无限等待，而`wait_for()`可以指定等待的最长时间，如果超过，会返回`std::future_status::timeout`，如果等待成功，返回`std::future_status::ready` 同理 `wait_until()`也是 如此

`std::async` 的另一种用法，第一个参数可以设置为`std::launch::deferred`，这就不会创建线程来执行，他只会把 `lambda`函数提到运算推迟到`future`的`get`被调用时，也就是main中的interact计算完毕之后
```c++
int main()
{
	std::future<int> fret = std::async(std::launch::deferred,[&] {
		return Download("wt.zip");
		});
	Interact();
	int ret = fret.get();
	std::cout << "Download result: " << ret << std::endl;
	return 0;
}
```
可以用来实现lazy evaluation之类的

如果想手动创建线程，可以直接用`std::promise`，然后在线程返回的时候，用`set_value()`设置返回值，在主线程里面用`get_future` 获得对象，进一步`get()` 
```c++
int main()
{
	std::promise<int> pret;
	std::thread t1([&] {
		auto ret = Download("wt.zip");
		pret.set_value(ret);
		});
	std::future<int> fret = pret.get_future();
	Interact();
	int ret = fret.get();
	std::cout << "Download result: " << ret << std::endl;

	t1.join();
	return 0;
}
```

`future`也删了拷贝构造，如果需要浅拷贝，可以用`std::shared_future` 
并且如果不需要返回值，可以是`std::future<void>`，`promise`  也一样

# 互斥量

经典案例：两个线程同时往一个数组里面推数据，会崩溃
因为`vector` 不是MT-safe的，会出现data-race

解决方法：上锁，调用`std::mutex`的`lock()`，会检查`mutex`是否上锁了，如果没有锁，就上锁，如果已经锁了，就先等待，直到`mutex`被解锁之后，再次上锁，类似于厕所
```c++
	std::mutex mtx;
	mtx.lock();
	// Do something 1
	mtx.unlock();

	// ...
	std::mutex mtx;
	mtx.lock();
	// Do something 2
	mtx.unlock();
```

如果忘记了解锁那肯定也不行，所以可以用`std::lock_guard`，它的构造函数是上锁，析构函数是解锁
```c++
	std::mutex mtx;
	std::lock_guard<std::mutex> grd(mtx);
	// Do something
```

`lock_guard `的作用域是一个花括号，也就是在花括号结束之后才会释放，如果想让锁提前释放，可以用`unique_lock`
```c++
{
	std::unique_lock grd(mtx);
	....
}

{
	std::unique_lock grd(mtx);
	....
	grd.unlock();
	// if need
	// grd.lock()
}

{
	std::unique_lock grd(mtx, std::defer_lock);
	// need manual call
	grd.lock()
	....
}

{
	// already locked
	mtx.lock();
	std::unique_lock grd(mtx, std::adopt_lock);
}

```

`try_lock()`：`lock()`如果发现`mutex`已经上锁的话，会等待直到他解锁，`try_lock()`上锁失败会直接 返回`false` 否则返回`true`

`try_lock_for()`：需要用`std::timed_mutex`的锁 ，同理还有`try_lock_until`

`std::unique_lock()` 也可以用`std::try_to_lock`做参数,它会调用`mtx.try_lock()`
```c++
std::unique_lock grd(mtx,std::try_to_lock)
if(grd.owns_lock())  // Check whether the lock succeeds
```

# 死锁

```c++
int main()
{
	std::mutex mtx1;
	std::mutex mtx2;

	std::thread t1([&] {
		for (int i = 0; i < 10; i++) {
			mtx1.lock();
			mtx2.lock();
			mtx2.unlock();
			mtx1.unlock();
		}
	});
	std::thread t2([&] {
		for (int i = 0; i < 10; i++) {
			mtx2.lock();
			mtx1.lock();
			mtx1.unlock();
			mtx2.unlock();
		}
	});

	return 0;
}
```
双方都在等待对方释放锁，只会无限制等待下去

最简单的解决方法，就是**一个线程永远不要同时有两个锁**，如果非要两个锁，那么得保证上锁的顺序一样
```c++
{
	mtx1.lock();
	mtx2.lock();
	mtx2.unlock();
	mtx1.unlock();
}
```
或者用`std::lock(mtx1,mtx2...)`，他接受多个`mutex`作为参数，且保证无论任意线程中调用 的顺序是否相同，都不会产生死锁
当然也有`std::scoped_lock()` 对应的就是`std::lock_guard`，会自动上锁和解锁

如果同一个线程重复调用`lock()`也会造成死锁，可以用`std::recursive_mutex()` 会自动判断是不是同一个线程`lock()`了多次同一个锁，如果是则让计数器加1，之后`unlock()`会让计数器减一，减到0时才会 真正解锁，相比于普通的`std::mutex`有一定 性能的损失
```c++
std::recursive_mutex mtx1;
void other()
{
	mtx1.lock();
	// do something
	mtx1.unlock();
}
void func()
{
	mtx1.lock();
	// do something
	mtx1.unlock();
}

```

# 数据结构

可以封装一下多线程里面的`vector` ，注意，`size()`是`const`函数，但是`mutex.lock()`不是，所以需要给`m_mtx`改成`mutable`
```c++
class MTVector
{
	std::vector<int> m_arr;
	mutable std::mutex m_mtx;
public:
	void push_back(int val)
	{
		m_mtx.lock();
		m_arr.push_back(val);
		m_mtx.unlock();
	}
	size_t size() const {
		m_mtx.lock();
		size_t ret = m_arr.size();
		m_mtx.unlock();
	}
};
```

读写锁：读可以共享，写必须独占，且写和读不能共存
- n个人读取，没有人写入。
- 一个人写入，没有人读取。
- 没有人读取，也没有人写入

```c++
#include <shared_mutex>

class MTVector
{
	std::vector<int> m_arr;
	mutable std::shared_mutex m_mtx;
public:
	void push_back(int val)
	{
		m_mtx.lock();
		m_arr.push_back(val);
		m_mtx.unlock();
	}
	size_t size() const {
		m_mtx.lock_shared();
		size_t ret = m_arr.size();
		m_mtx.unlock_shared();
	}
};
```

上锁时，需要指定是读还是写，这里`push_back()`需要修改数据，就是写，而`size()`是只需要读取，就是读

同样的`std::shared_lock`中的`lock_shared()` 这样就可以在函数体退出之后自动`unlock_shared()`了
```c++
void push_back(int val)
{
	std::unique_lock<std::shared_mutex> grd(m_mtx);
	m_arr.push_back(val);
}
size_t size() const {
	std::shared_lock<std::shared_mutex> grd(m_mtx);
	size_t ret = m_arr.size();
}
```

如果是这样的话，在循环里面，每次访问都会上锁和解锁
```c++
int main()
{
	MTVector arr;

	std::thread t1([&] {
		for (int i = 0; i < 10; i++) {
			arr.push_back(i);
		}
	});
	std::thread t2([&] {
		for (int i = 0; i < 10; i++) {
			arr.push_back(i + 1);
		}
	});
	t1.join();
	t2.join();

	return 0;
}
```

这时候就有了一个设计模式：访问者模式，比如OpenVDB里面就采样了`Accessor`的设计，并且还有`ConstAccessor`和`Accessor`两种，分别用于读和写
这里将存储和访问分开，通过`access()`获得访问者类，把多次上锁和解锁合并了
```c++
class MTVector
{
	std::vector<int> m_arr;
	std::mutex m_mtx;
public:
	class Accessor
	{
	public:
		Accessor(MTVector &that):m_that(that),m_guard(that.m_mtx){}
		void push_back(int val) const
		{
			return m_that.m_arr.push_back(val);
		}
		size_t size() const {
			return m_that.m_arr.size();
		}

	private:
		MTVector& m_that;
		std::unique_lock<std::mutex> m_guard;
	};
	Accessor access() {
		return{ *this };
	}
};


int main()
{
	MTVector arr;

	std::thread t1([&] {
		auto axr = arr.access();
		for (int i = 0; i < 10; i++) {
			axr.push_back(i);
		}
	});
	std::thread t2([&] {
		auto axr = arr.access();
		for (int i = 0; i < 10; i++) {
			axr.push_back(i + 1);
		}
	});
	t1.join();
	t2.join();
	return 0;
}
```

# 条件变量

```c++
#include <condition_variable>

int main() {
	std::condition_variable cv;
	std::mutex mtx;
	std::thread t1([&] {
		std::unique_lock<std::mutex> lck(mtx);
		cv.wait(lck);
		std::cout << "t1 is awake" << std::endl;
		});
	std::this_thread::sleep_for(std::chrono::milliseconds(400));
	std::cout << "notifting..." << std::endl;
	cv.notify_one();	// will awake t1
	t1.join();
	return 0;
}
```

`cv.wait(lck)`：让当前线程陷入等待，在其他线程调用`cv.notift_one()`则会唤醒那个陷入等待的线程，并且`std::condition_variable`必须和`std::unique_lock<std::mutex>`一起用，因为如果有多个等待的线程，要保证多个线程被唤醒，只有一个能够被启用，也就是其中一个线程解锁之后，才能去执行其他的

还可以指定有一个参数，变成`cv.wait(lck, expr)` 的形式
```c++
int main() {
	std::condition_variable cv;
	std::mutex mtx;
	bool ready = false;
	std::thread t1([&] {
		std::unique_lock<std::mutex> lck(mtx);
		cv.wait(lck, [&] {return ready; });
		lck.unlock();
		std::cout << "t1 is awake" << std::endl;
		});
	std::this_thread::sleep_for(std::chrono::milliseconds(400));
	std::cout << "notifting not ready" << std::endl;
	// cv.notify_one();	// uesless now, since ready = false
	ready = true;
	std::cout << "notifting ready" << std::endl;
	cv.notify_one();	// awake t1, since ready = true
						// notify_all() awake all thread

	t1.join();
	return 0;
}
```

实际案例就是实现生产者-消费者模式
- 生产者：往队里里面发生东西，推送后通知消费者来拿
- 消费者：等待东西，直到被通知
```c++
int main() {
	std::condition_variable cv;
	std::mutex mtx;

	std::vector<int> foods;

	std::thread t1([&] {
		for (int i = 0; i < 2; i++) {
			std::unique_lock<std::mutex> lck(mtx);
			cv.wait(lck, [&] {return foods.size() != 0; });

			auto food = foods.back();
			foods.pop_back();
			lck.unlock();
			std::cout << "t1 got food" << food << std::endl;
		}
		});

	std::thread t2([&] {
		for (int i = 0; i < 2; i++) {
			std::unique_lock<std::mutex> lck(mtx);
			cv.wait(lck, [&] {return foods.size() != 0; });

			auto food = foods.back();
			foods.pop_back();
			lck.unlock();
			std::cout << "t2 got food" << food << std::endl;
		}
		});

	foods.push_back(1);  
	cv.notify_one();  // 来东西了，唤醒其中一个
	foods.push_back(2);
	cv.notify_one();
	foods.push_back(3);
	foods.push_back(4);
	cv.notify_all();

	t1.join();
	t2.join();
	return 0;
}
```

封装成一个类
```c++
template<class T>
class MTQueue
{
public:
	T pop() {
		std::unique_lock<std::mutex> lck(m_mtx);
		m_cv.wait(lck, [this] {return !m_arr.empty(); });
		T ret = std::move(m_arr.back());
		m_arr.pop_back();
		return ret;
	}
	auto pop_hold() {
		std::unique_lock<std::mutex> lck(m_mtx);
		m_cv.wait(lck, [this] {return !m_arr.empty(); });
		T ret = std::move(m_arr.back());
		m_arr.pop_back();
		return std::pair(std::move(ret), std::move(lck));
	}
	void push(T val) {
		std::unique_lock<std::mutex> lck(m_mtx);
		m_arr.push_back(std::move(val));
		m_cv.notify_one();
	}
	void push_many(std::initializer_list<T> vals) {
		std::unique_lock<std::mutex> lck(m_mtx);
		std::copy(
			//std::move_iterator<typename std::initializer_list<T>::iterator>(vals.begin()),
			std::move_iterator<decltype(vals.begin())>(vals.begin()),
			std::move_iterator<decltype(vals.end()) >(vals.end()),
			std::back_insert_iterator<decltype(m_arr)>(m_arr));
		m_cv.notify_all();
	}

private:
	std::condition_variable m_cv;
	std::mutex m_mtx;
	std::vector<T> m_arr;
};

int main() {
	MTQueue<int> foods;

	std::thread t1([&] {
		for (int i = 0; i < 2; i++) {
			auto food = foods.pop();
			std::cout << "t1 got food" << food << std::endl;
		}
		});

	std::thread t2([&] {
		for (int i = 0; i < 2; i++) {
			auto food = foods.pop();
			std::cout << "t2 got food" << food << std::endl;
		}
		});

	foods.push(1);
	foods.push(2);
	foods.push_many({3,4});

	t1.join();
	t2.join();
	return 0;
}
```
# 原子操作

经典案例：
```c++
int main() {
	int counter = 0;
	std::thread t1([&] {
		for (int i = 0; i < 10000; i++) {
			counter += 1;
		}
		});
	std::thread t2([&] {
		for (int i = 0; i < 10000; i++) {
			counter += 1;
		}
		});
	t1.join();
	t2.join();
	std::cout << counter << std::endl;
}
```
多个线程同时往一个`int`变量里面累加，会出错，因为`counter+=1`在CPU看来会变成三个指令：
1. 读取`counter`变量到`rax`寄存器
2. `rax`寄存器的值加上1
3. 把`rax`写入到`counter`
即使编译器优化成`add[counter],1`也没用，比如他会把一条汇编指令拆分成很多微指令

如果多个线程同时运行，顺序是不确定的，比如t1的写入很可能把t2的覆盖了 ，从而counter只增加了1，最暴力的解决方法就是加锁，但是很慢
```c++
mtx.lock();
counter+=1;
mtx.unlock();
```
可以用更轻量级的`atomic`，对它进行`+=`等操作，会被编译器转换成专门的指令，CPU识别到之后，会锁住内存总线，放弃乱序执行等优化操作，从而保证该操作是原子的
```c++
std::atomic<int> counter = 0;
```
注意：`+=`不能分开写成`counter = counter + 1;`  这个不能保证原子性

除了这些运算符，也可以直接调用函数
- `fetch_add`--->`+=`，并且返回旧值
- `store ---> =`
- `load`：读取其中的`int`值
- `exchange`：把`val`写入原子变量，同时返回旧值
- `compare_exchange_strong(old,val)`：读取原子变量的值，比较他是否和old相等，不相等就把原子变量的值写入old，相等就把val写入原子变量，返回是bool值，标识是否相对