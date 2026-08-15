---
layout: posts
title: TrueNas 应用配置
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
# 1. 存储池根目录策略（递归应用到所有子数据集）
# ==============================================================================
[STORAGE]
    use_template = production
    recursive = yes

# ==============================================================================
# 2. 排除目录列表（显式关闭自动快照和清理）
# ==============================================================================
# 排除下载缓存目录
[STORAGE/QBitTorrent/data]
    autosnap = no
    autoprune = no

# 排除不需要快照的大体积媒体目录
[STORAGE/Media/Porn]
    autosnap = no
    autoprune = no


# ==============================================================================
# 3. 最佳实践快照策略模板
# ==============================================================================
[template_production]
    # 启用自动创建与自动清理
    autosnap = yes
    autoprune = yes

    # 关键：快照命名前缀（与 TrueNAS / Windows 卷影副本原生兼容）
    snapshot_prefix = auto-

    # ---------------- 核心保留策略（金字塔递减式） ----------------
    # 1. 高频秒级/分钟级防误删（每分钟执行时）：保留最近 60 个（即最近 1 小时内每分钟的版本）
    frequently = 60

    # 2. 小时级版本：保留最近 24 小时（1 天）每小时的快照
    hourly = 24

    # 3. 天级版本：保留最近 7 天（1 周）每天的快照（满足你保留一周的需求）
    daily = 7

    # 4. 周级版本：保留最近 4 周（1 个月）每周的快照
    weekly = 4

    # 5. 月级版本：保留最近 12 个月（1 年）每月的快照
    monthly = 12

    # 6. 年级版本：保留最近 3 年（每年一个归档快照）
    yearly = 3
```

运行测试命令　

```bash
/mnt/STORAGE/User/sunzhiqi/sanoid/sanoid --cron --configdir=/mnt/STORAGE/User/sunzhiqi/sanoid --debug --dry-run

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
```
