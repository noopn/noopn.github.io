---
layout: posts
title: Termux DNS 测试环境
mathjax: true
date: 2024-11-02 22:11:48
categories: 网络安全
tags: 
  - DNS
---

#### DNS 查询

```bash
# 1. 更新软件源与所有已安装的软件包
pkg update && pkg upgrade -y

# 2. 强制重新安装 OpenSSL 和 dnsutils
pkg install --reinstall openssl dnsutils -y

nslookup gs-asf325-sadfa34df.ccqqsd.com 178.94.14.101
```

#### DNS压力测试

```bash
# 1. 更新软件包列表
pkg update && pkg upgrade -y

# 2. 安装 C/C++ 编译器、git 以及相关依赖库
pkg install clang make cmake git autoconf automake libtool pkg-config openssl ldns libnghttp2 -y
```

编译安装 libck

```bash
# 1. 克隆 libck 官方仓库
git clone https://github.com/concurrencykit/ck.git

# 2. 进入目录
cd ck

# 3. 配置、编译并安装到 Termux 系统目录中
# 默认行为：如果你只运行 ./configure（不加任何参数），大多数开源软件的默认安装路径是 /usr/local。
# 编译出的可执行文件会放进 /usr/local/bin
# 依赖库会放进 /usr/local/lib
# 头文件会放进 /usr/local/include
# 加上 --prefix=/你的路径 后：你可以自定义这个软件安装到哪里。比如指定 --prefix=/home/user/app，那么软件就会被安装到 /home/user/app/bin 目录下。

# 在普通的 Linux 系统（如 Ubuntu）中，根目录 /usr 是可以随意写入的。但在 Termux (Android) 环境下：
# 手机没有 Root 权限，Android 系统禁止你向 /usr/local 或 /usr/bin 写入任何文件（会报错 Read-only file system）。
# Termux 为每个用户分配了一个专属的沙盒文件夹，这个文件夹的路径长这样：
# /data/data/com.termux/files/usr
# Termux 官方把这个长路径自动存为了环境变量 $PREFIX。
# 你可以直接在 Termux 里输入 echo $PREFIX 查看，输出的就是这个专属路径

./configure --prefix=$PREFIX
make
make install
```

下载 dnsperf 源码并编译

```bash
# 3. 克隆官方 Git 仓库（若 Codeberg 被墙，可从 GitHub 镜像获取）
git clone https://github.com/DNS-OARC/dnsperf.git

# 4. 进入源码目录
cd dnsperf

# 5. 生成配置并编译安装
./autogen.sh
# 1. 重新配置，指定安装路径到 Termux 专属的前缀目录 $PREFIX
./configure --prefix=$PREFIX CFLAGS="-I$PREFIX/include" LDFLAGS="-L$PREFIX/lib"
make
make install
```

准备测试数据集 

```bash
nano data.txt

# 格式：域名 记录类型
# baidu.com A
# qq.com A
# google.com AAAA
# github.com A
```

运行压测命令

```bash
dnsperf -s [目标DNS服务器IP] -p [端口] -d [数据文件名] -c [并发线程/连接数] -l [压测时长秒数] -q [目标每秒请求数QPS]

dnsperf -s 192.168.1.1 -p 53 -d data.txt -c 10 -l 30 -q 2000
```

#### 流量控制

在网络编程、API 网关（如 Nginx、Envoy、Spring Cloud Gateway）以及高并发压测工具（如 dnsperf）中，系统需要对流量进行精确控制，防止突发流量冲垮后端服务。

核心目标：将发包/请求速率精确限制在指定的 QPS（Queries Per Second）。令牌桶思想：

系统有一个容量上限为 $Capacity$ 的桶。

系统以恒定速率 $Rate$（每秒生成多少个令牌）向桶内发放令牌。

每次发起请求，必须先从桶中取走对应数量的令牌（通常为 1 个）。

若桶内有令牌，放行请求；若桶为空，则拒绝请求或等待。

**传统“定时器/后台线程”实现的痛点**

初学者容易设想的朴素实现方式是：开一个后台线程，每隔固定时间（如 1ms）向桶里 push 一个令牌。存在的问题与瓶颈：

CPU 资源浪费严重：系统需要维持一个独立的定时器线程，不断轮询或睡眠唤醒，带来额外的线程开销。

锁竞争与并发开销：后台生产线程往桶里写数据，工作线程从桶里读数据，两者必须加锁（Mutex）或使用线程安全的并发队列，在超高 QPS 场景下锁竞争会成为严重的性能瓶颈。

精度受限：操作系统的线程调度和普通睡眠函数（如 sleep/usleep）在微秒级别容易发生抖动，很难做到极度精准的定时注入。

**惰性计算（Lazy Evaluation）**

系统完全不需要后台线程，也不需要定时往桶里放数据。桶在平时是完全静态的。
只有当有请求真正到达，想要获取令牌时，系统才在当前瞬间“顺便”计算并把这段时间内应该补充的令牌一次性加进去。

$R$ (rate)：令牌发放速率（个/秒）。
$C$ (capacity)：桶的最大容量上限。
$T_{last}$ (last_time)：上一次成功刷新/取走令牌的时间戳（单位：秒或微秒）。
$T_{now}$ (now)：当前请求发起时的时间戳。
$Tokens$ (tokens)：桶中当前剩余的可用令牌数。

计算流逝时间：$\Delta t = T_{now} - T_{last}$

计算这段时间应增发的令牌数：$\Delta tokens = \Delta t \times R$

更新桶中当前令牌数（不能超过容量上限）：$Tokens_{new} = \min(C,\; Tokens_{old} + \Delta tokens)$

消耗令牌并更新时间基准：若 $Tokens_{new} \ge 1$ :  $Tokens = Tokens_{new} - 1$; $T_{last} = T_{now}$

若 $Tokens_{new} < 1$：结果：拒绝请求或挂起等待下一个微秒周期。