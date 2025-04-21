---
layout: posts
title: 修改 GPT/MBR 分区
mathjax: true
date: 2023-07-23 16:22:34
categories: 其他
tags:
  - Linux
---

添加新的磁盘，或在虚拟机中扩容磁盘，需要修改分区。

#### 查看分区现状

```bash
lsblk
# 或者
fdisk -l /dev/sda

# 先使用 sudo apt install parted 安装 parted
parted /dev/sda print
```

可以看到磁盘容量变大，但是分区没有变化

```bash
Disk /dev/sda: 105 GiB, 112742891520 bytes, 220200960 sectors
Disk model: QEMU HARDDISK
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: dos
Disk identifier: 0x94a3b99f

Device     Boot   Start      End Sectors  Size Id Type
/dev/sda1  *       2048  8484863 8482816    4G 83 Linux
/dev/sda2       8486910 10483711 1996802  975M  5 Extended
/dev/sda5       8486912 10483711 1996800  975M 82 Linux swap / Solaris
```

