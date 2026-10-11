---
layout: posts
title: TrueNas 应用
mathjax: true
date: 2025-01-19 10:31:33
categories: 其他
tags:
  - TrueNas
---

#### MinIO

参考[安装文档](https://www.truenas.com/docs/truenasapps/stableapps/minioapp/), 挂载点配置需要开启 ACL, 文件默认保存 export 目录下。

Nginx 配置参考[MinIO 配置文档](https://min.io/docs/minio/linux/integrations/setup-nginx-proxy-with-minio.html), 需要添加`chunked_transfer_encoding off;`

#### NextCloud

- dataSet 创建
  父文件夹需要有以下权限 `user:www-data`,`group:www-data`,`user:netdata`,`group:docker`,`user:root`,`group:root`,`user:apps`
  user 文件夹需要有以下权限 `user:www-data`,`group:www-data`,`user:apps`
  data 文件夹需要有以下权限 `user:www-data`,`group:www-data`,`user:apps`
  db 文件夹需要有以下权限 `user:netdata`,`group:docker`,`user:root`,`group:root`,`user:apps`

- APT Packages 需要添加 `ffmpeg` `smbclient`
- host 需要填写真实访问的域名
- Database Password 注意不要有 `#@?&` 等特殊符号
- Certificate ID 选择默认证书，避免 nextCloud 提示警告，如果前端有 nginx 代理，需要使用 https
- 在 config/config.php 中添加 [maintenance_window_start](https://docs.nextcloud.com/server/30/admin_manual/configuration_server/background_jobs_configuration.html#parameters) 消除调度任务的警告

- [nginx配置](https://docs.nextcloud.com/server/stable/admin_manual/installation/nginx.html)

#### 虚拟机配置

**Nas 服务器开机虚拟化功能**,配置以下字段,其余字段可以保持默认

Boot Method ： UEFI

CPU Mode : Host Passthrough

Select Disk Type : VirtIO
virtIO 是一个优化的虚拟磁盘驱动程序，专为虚拟化环境设计，提供更高的性能和较低的开销。它支持更高的数据传输速率，特别适用于 I/O 密集型的应用场景。

Adapter Type：VirtIO

**如果安装后提示 CD-ROM 加载错误，可以删除 CD-ROM 设备后重试**


#### Jellyfin

nginx 代理按照[官方文档](https://jellyfin.org/docs/general/networking/nginx/)操作


#### 利用 sanoid 做快照

Truenas 快照,安装软件

```bash
cd /mnt/STORAGE/User/sunzhiqi 

git clone https://github.com/jimsalterjrs/sanoid.git
```

添加配置文件

```bash
cd sanoid
vi sanoid.conf

# ==============================================================================
# 1. 数据集绑定策略
# ==============================================================================

[STORAGE]
    use_template = template_low_frequency
    recursive = no
    
# 核心重要文档/代码（高频精细保护）
[STORAGE/Document]
    use_template = template_production
    recursive = yes

# 其它常规/大体积数据集（低频保护：每天 2 个，保留 14 天）
# 示例：你可以根据实际路径把下面的名字换成你的目标数据集
[STORAGE/Docker]
    use_template = template_low_frequency
    recursive = yes

[STORAGE/Jellyfin]
    use_template = template_low_frequency
    recursive = yes

[STORAGE/Media]
    use_template = template_low_frequency
    recursive = yes

[STORAGE/MinIO]
    use_template = template_low_frequency
    recursive = yes

[STORAGE/NextCloud]
    use_template = template_low_frequency
    recursive = yes

[STORAGE/PhotoPrism]
    use_template = template_low_frequency
    recursive = yes

[STORAGE/QBitTorrent]
    use_template = template_low_frequency
    recursive = yes

[STORAGE/User]
    use_template = template_low_frequency
    recursive = yes

# ==============================================================================
# 2. 排除目录列表（显式关闭自动快照和清理，防止空间被垃圾锁死）
# ==============================================================================
[STORAGE/QBitTorrent/data]
    autosnap = no
    autoprune = no

[STORAGE/Media/Porn]
    autosnap = no
    autoprune = no

[STORAGE/Media/Music]
    autosnap = no
    autoprune = no

[STORAGE/PhotoPrism/temp]
    autosnap = no
    autoprune = no


# ==============================================================================
# 3. 模板定义区域
# ==============================================================================

# ---------------- 模板 A：高频生产级模板 (核心数据防手抖/误删) ----------------
[template_production]
    autosnap = yes
    autoprune = yes

    # 1. 高频快照：每 2 分钟 1 次，保留 30 个（刚好覆盖最近 1 小时）
    frequent_period = 2
    frequently = 30

    # 2. 小时级：保留最近 24 小时
    hourly = 24

    # 3. 天级：保留最近 14 天
    daily = 14

    # 4. 周级：保留最近 4 周
    weekly = 4

    # 5. 月级：保留最近 12 个月
    monthly = 12

    # 6. 年级：保留最近 3 年
    yearly = 3


# ---------------- 模板 B：低频经济型模板 (每天 2 个，保留 14 天) ----------------
[template_low_frequency]
    autosnap = yes
    autoprune = yes

    # 关闭分钟级高频快照
    frequently = 0

    # 每天打 2 个快照（相当于每 12 小时 1 个），保留 14 天（共保留 14天 × 2个 = 28 个小时级快照）
    hourly = 28

    # 关闭其它长周期归档，保持轻量
    daily = 0
    weekly = 0
    monthly = 0
    yearly = 0
```

在 ZFS 文件系统和快照的机制下，当你“删除”一个文件时，你在文件管理器里确实看不到了，但只要这个文件被任何一个还存活的快照记录了，它所占用的物理磁盘空间就不会被真正释放，直到引用了该文件的最后一个快照被销毁。

但是，这并不意味着所有被删除的文件都会强制保留三年。文件的“物理寿命”取决于它被哪个级别的快照捕捉到了。

我们可以分情况来看：

1. 昙花一现的文件（寿命极短）
假设你刚刚新建了一个测试文件，30 分钟后就把它删除了。

这个文件只会被你的 frequently（2 分钟级） 快照捕捉到。

根据你的配置，frequently = 30 意味着高频快照只保留最近 1 小时。

结果： 在你删除该文件 1 小时后，包含了该文件的所有快照都被修剪（Prune）掉了，此时该文件占用的物理空间会真正释放。

2. 存活了几天或几周的文件
假设你下载了一部电影，放在那里看了半个月，然后觉得不好看删掉了。

这个文件会被你的 hourly、daily，甚至 weekly 快照捕捉到。

结果： 当它存活在 daily 和 weekly 快照中时，即便你删除了它，它的物理空间也要等到包含它最久远的那个 weekly 快照被删除时（也就是约 4 周后）才会被真正释放。

3. 被“定格”在年度快照里的文件（寿命最长）
假设你有一个文档，在你的硬盘里存了很久。Sanoid 的 yearly 快照通常会在每年的 1 月 1 日 00:00 触发。

如果这个文件在某年的 1 月 1 日刚好存在于硬盘中，它就会被写入年度快照。

即使你在 1 月 2 日把这个文件删除了，由于 yearly = 3 的规则，这个 1 月 1 日的快照会被保留整整三年。

结果： 没错，这个文件占用的物理磁盘空间，在未来的三年内绝对不会被释放。


```bash
# 运行测试命令　
/mnt/STORAGE/User/sunzhiqi/sanoid/sanoid --cron --configdir=/mnt/STORAGE/User/sunzhiqi/sanoid --debug --readonly

# 如果报错
# Can't locate Config/IniFiles.pm in @INC (you may need to install the Config::IniFiles module) (@INC contains: /etc/perl /usr/local/lib/x86_64-linux-gnu/perl/5.36.0 /usr/local/share/perl/5.36.0 /usr/lib/x86_64-linux-gnu/perl5/5.36 /usr/share/perl5 /usr/lib/x86_64-linux-gnu/perl-base /usr/lib/x86_64-linux-gnu/perl/5.36 /usr/share/perl/5.36 /usr/local/lib/site_perl) at /mnt/STORAGE/User/sunzhiqi/sanoid/sanoid line 12.
# BEGIN failed--compilation aborted at /mnt/STORAGE/User/sunzhiqi/sanoid/sanoid line 12.

# 这个报错是因为 TrueNAS 系统底层的 Perl 环境缺少了 Sanoid 运行所依赖的解析模块 Config::IniFiles（Sanoid 用它来解析 .conf 配置文件）。

# 通过 cpanm 将 Perl 依赖安装到存储池中
cd /mnt/STORAGE/User/sunzhiqi/sanoid
curl -L https://cpanmin.us -o cpanm
chmod +x cpanm

# 将 Sanoid 依赖的 Perl 模块直接安装到本地目录
./cpanm -l /mnt/STORAGE/User/sunzhiqi/perl5 Config::IniFiles Capture::Tiny Data::Dumper Getopt::Long

# 如果报错，说明缺少必要的编译环境, 参考下面添加编译环境的配置后，重新运行安装命令
# ! Can't configure the distribution. You probably need to have 'make'. See /mnt/STORAGE/User/sunzhiqi/.cpanm/work/1786777437.2084762/build.log for details.

# 运行时通过环境变量声明模块路径：
PERL5LIB=/mnt/STORAGE/User/sunzhiqi/perl5/lib/perl5 /mnt/STORAGE/User/sunzhiqi/sanoid/sanoid --cron --configdir=/mnt/STORAGE/User/sunzhiqi/sanoid --debug --readonly
```

Perl安装配置编译环境

```bash
# 1. 临时开启 TrueNAS 的 apt 包管理器权限（如果之前没开过的话）
sudo install-dev-tools

# 2. 更新软件源并安装 make 和 gcc 等基础构建工具
sudo apt update
sudo apt install -y build-essential
```

添加到 Truenas 定时任务

```bash
# Description: Sanoid ZFS Snapshot Manager
# Run as user: root

PERL5LIB=/mnt/STORAGE/User/sunzhiqi/perl5/lib/perl5 /mnt/STORAGE/User/sunzhiqi/sanoid/sanoid --cron --configdir=/mnt/STORAGE/User/sunzhiqi/sanoid >/dev/null 2>&1
```

清除所有的快照文件

```bash
# 彻底清除 STORAGE 存储池下的【所有】快照
zfs destroy -r STORAGE@%

# 查看剩余快照数量
zfs list -t snapshot

# 停止正在进行的任务
midclt call core.job_abort 460487
```


#### 快照被占用

虽然你前端终止了任务，但在底层系统中，这个快照正被某个进程持有了引用计数（Hold），或者底层还有残留的 zfs send/recv 或挂载（Mount/Clone）占用未完全释放。

Replication 底层调用的 zfs send 进程虽然被强行中断，但 Linux/ZFS 内核的管道（Pipe）和套接字缓存（Socket Buffer）往往需要几秒甚至十几秒来彻底关闭网络连接与文件描述符。在这个短暂的释放窗口期内，直接执行普通 zfs destroy 就会报 dataset is busy。

检查是否有快照“持有锁（ZFS Hold）”并释放，Replication 任务在传输时，为了防止快照被其他任务误删，会在快照上打一个叫做 user hold 的标记。任务异常中断时，这个标记可能残留。

```bash
zfs holds STORAGE/Docker/stack@auto-2026-08-16_10-00

# 输出 
# NAME                                        TAG  TIMESTAMP
# 说明没有被打上 hold 锁
```

如果没有锁，通常是被容器挂载占用、存在未释放的 Clone 克隆卷，或者被 .zfs 隐藏目录缓存占用。请按以下顺序快速定位并强制销毁：

```bash
# 1. 检查该快照是否被克隆成了其他运行中的数据集
zfs get clones STORAGE/Docker/stack@auto-2026-08-16_10-00

# 如果 clones 有输出：说明有 Docker 卷或数据集是基于该快照克隆出来的，必须先销毁对应的克隆卷，才能删除父快照。
# NAME                                        PROPERTY  VALUE   SOURCE
# STORAGE/Docker/stack@auto-2026-08-16_10-00  clones    -       -

# 使用 -d 标记推迟销毁（最快、无需停服务） -d 参数的作用机制：
# 加上 -d 后，ZFS 会立即把这个快照从系统的活跃索引中剔除（你再查快照列表就看不到了）；
# 等内核完全关闭刚才 Replication 残留的连接和句柄时，内核会在后台自动触发物理销毁并释放磁盘空间，无需你一直等待或反复重试。

zfs destroy -d STORAGE/Docker/stack@auto-2026-08-16_10-00
# cannot destroy snapshot STORAGE/Docker/stack@auto-2026-08-16_10-00: dataset is busy   

# 如果还是报错，快照被 ZFS 内核标记为了克隆源（Clone Parent）、或者底层存在挂载/传输死锁。
# 检查并清理底层残留的 zfs send / recv 僵尸进程
# Replication 被强杀后，后台的 SSH 通道或 ZFS 传输进程可能变成了 Defunct/D 状态（不响应普通 kill）：

# 1. 查找所有与该快照或 zfs 相关的残留进程
ps aux | grep -E "zfs send|zfs recv|zettarepl|ssh" | grep -v grep
# 强行终止所有 zfs 传输进程
pkill -9 -f "zfs send"
pkill -9 -f "zfs recv"
pkill -9 -f "zettarepl"

# 2.检查快照内部是否被自动挂载，ZFS 有时会在访问或发送快照时将其挂载到隐藏目录，未自动卸载会导致 busy：
mount | grep "auto-2026-08-16_10-00"
# 强制懒卸载（Lazy Unmount）所有涉及该快照的路径
umount -l /mnt/STORAGE/Docker/stack/.zfs/snapshot/auto-2026-08-16_10-00 2>/dev/null

# 3.如果上述命令都查不到进程，说明是 TrueNAS 的中间件驱动（zettarepl / middlewared）在内存中卡住了该资源句柄，重启中间件服务即可瞬间释放内核占用，不会中断正在读写的存储池数据：
systemctl restart middlewared
```


```bash
# 2. 检查是否有容器或系统进程正在访问该快照
lsof | grep "auto-2026-08-16_10-00"
fuser -v /mnt/STORAGE/Docker/stack/.zfs/snapshot/auto-2026-08-16_10-00 2>/dev/null
```

#### Replication Tasks

不要选择向导模式，否则会自动生成快照任务，直接选择高级模式。

Properties Override；Properties Exclude；Periodic Snapshot Tasks；留空

**Matching regular expression**： `^autosnap_.*`

**Destination Dataset Read-only Policy** 

修改 Replication 任务目标端的只读策略，将默认的 REQUIRE 改为 IGNORE（忽略只读检查）或 SET（自动将其强制设为只读）

**Replicate Specific Snapshots 不勾选** 

在生产环境中，本地源端往往为了防误删设置了极高频率的快照（例如 Sanoid 的 frequently 每 2 分钟一次、每小时一次、每天一次，一天能打几百上千个快照）。

不开启此选项：Replication 会把这几百个 2 分钟级的密集快照全部推送到目标端；

开启此选项：你可以指定一个时间窗口粒度（如 Hourly 每小时、Daily 每天、Weekly 每周）。

**Only Replicate Snapshots Matching Schedule 不勾选**，没有勾选这个选项时的行为（默认）

假设本地用 Sanoid 每 2 分钟打一次快照（frequently），每天产生几百个快照；而 Replication 任务设定为每天凌晨 2 点执行一次：

默认行为：凌晨 2 点任务启动时，系统会把你今天白天产生的几百个 2 分钟级、1 小时级的所有零碎快照，一股脑全量打包发送到目标 NAS。

结果：目标 NAS 会完全镜像你的所有高频快照，导致目标机也存了大量密集快照。

勾选了 Only Replicate Snapshots Matching Schedule 后的行为

过滤行为：Replication 引擎在同步时，会严格比对快照的生成时间点与你 Replication 任务的 Schedule（调度计划）。

结果：如果复制任务设定为“每天凌晨 2 点（Daily）”，那么它只会同步对应在 Daily 时间节点生成的快照；

平时每 2 分钟、每小时产生的零碎快照会被直接过滤掉，不发送到远端。

不要勾选（推荐）：如果你希望目标机是主机的完整镜像，或者希望借助 ZFS 增量传输把过去一整天的历史快照全带过去，保持不勾选。
建议勾选：如果本地打了极其密集的高频快照（如 1 分钟/2 分钟级），但目标 NAS 是异地低速带宽或容量较小，你只想每天/每周同步一个大版本归档快照，则勾选此项。

#### 快照回滚

比“直接回滚”更安全优雅的 2 种找回方式

只找回单个文件：利用隐藏的快照目录（最推荐）

ZFS 在每个数据集的挂载点根目录下都提供了一个隐藏的只读目录：.zfs/snapshot/。

在 SSH 或终端中进入该目录：

```Bash
cd /mnt/STORAGE/Document/.zfs/snapshot/
ls -la
```
你会看到所有历史快照的文件夹，点进对应的快照目录，直接把被误删的文件 cp（复制）回原来的位置即可。

无损恢复：从快照克隆出新数据集,如果你想彻底回到过去的某个完整状态，但又不想破坏之后生成的新快照：

在 TrueNAS Web UI 的快照列表中，找到目标快照，选择 “Clone to new dataset（克隆为新数据集）”。

系统会以零空间占用的方式瞬间生成一个新的独立 Dataset（例如 STORAGE/Document_backup）。

你可以进去核对、提取所需的数据，确认无误后再决定是否替换原数据集。

#### 关闭网卡节能

```bash
ethtool --set-eee enp1s0 eee off 
```

System Settings (系统设置) -> Advanced (高级) -> Init/Shutdown Scripts (初始化/关闭脚本)。

点击 Add (添加)：

Type (类型): Command

Command (命令): `ethtool --set-eee enp1s0 eee off `

When (执行时机): 非常关键：必须选 Post Init（系统与网络初始化完成后执行），避免过早执行时网口未就绪