---
layout: posts
title: 浪潮 PVE 服务器节能设置
mathjax: true
date: 2024-12-01 10:44:12
categories: 其他
tags:
  - Linux
  - PVE
---

#### 检查状态

```bash
# 查看整机功率
ipmitool dcmi power reading

# 查看调频驱动、当前策略、最低/最高/当前频率（单位 kHz）
head -n 1 /sys/devices/system/cpu/cpu0/cpufreq/{scaling_driver,scaling_governor,cpuinfo_min_freq,cpuinfo_max_freq,scaling_cur_freq} 2>/dev/null || echo "cpufreq接口不存在：BIOS可能直接锁死了变频"

# ==> /sys/devices/system/cpu/cpu0/cpufreq/scaling_driver <==
# intel_cpufreq

# ==> /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor <==
# performance

# ==> /sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_min_freq <==
# 1200000

# ==> /sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq <==
# 3600000

# ==> /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq <==
# 2050119

# 查看 BIOS 开放的 C-State 休眠层级
grep . /sys/devices/system/cpu/cpu0/cpuidle/state*/name


# /sys/devices/system/cpu/cpu0/cpuidle/state0/name:POLL
# /sys/devices/system/cpu/cpu0/cpuidle/state1/name:C1
# /sys/devices/system/cpu/cpu0/cpuidle/state2/name:C1E
# /sys/devices/system/cpu/cpu0/cpuidle/state3/name:C3
# /sys/devices/system/cpu/cpu0/cpuidle/state4/name:C6

```

BIOS 已经放开了底层省电权限：

cpuinfo_min_freq 为 1200000（1.2GHz）~ 3600000（3.6GHz），说明 EIST 动态变频已解锁。

cpuidle 已暴露 C1、C1E、C3、C6，说明核心深度休眠已开启。

scaling_driver 已经是 intel_cpufreq（即 intel_pstate 的被动模式，新版内核对 E5 v2 默认启用），因此 GRUB 里也无需再加 intel_pstate=passive。

高功耗的直接原因是 scaling_governor 仍为 PVE 默认的 performance，把全核死顶在高频。另外注意一个关键区别：在 intel_cpufreq 驱动下，powersave 会把频率永久锁死在 1.2GHz 导致存储和虚拟机 I/O 严重降速，必须使用 schedutil（空闲降频至 1.2GHz，有负载自动睿频至 3.6GHz）。


#### 调频策略切换

```bash
# 立即将全核调频策略切换为 schedutil
# 直接写入 /sys 接口，把双路共 40 个逻辑核心统一切换到按需动态调频：

echo schedutil | tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
# 验证方式： 等待 5 秒空载后执行 grep "cpu MHz" /proc/cpuinfo | head -n 5，观察核心实时主频是否已从 2000+ MHz 回落至 1200.000 MHz 左右。


# 创建 systemd 服务实现开机自动应用
# PVE 重启后会重置回 performance，通过写入一条轻量级服务使其持久化生效：
cat << 'EOF' > /etc/systemd/system/cpu-governor.service
[Unit]
Description=Set CPU frequency governor to schedutil
After=multi-user.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'echo schedutil | tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor'

[Install]
WantedBy=multi-user.target
EOF
systemctl enable --now cpu-governor.service

# 验证方式： 执行 systemctl is-enabled cpu-governor.service && cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor，确认输出为 enabled 和 schedutil。
```

#### 避免高频中断

消除阻断 C6 深度休眠的轮询与总线瓶颈,核心有了 C6 权限后，还需避免高频中断把 CPU 不断唤醒：

单节点 PVE 停用集群高可用服务,如果是单机运行 PVE（未组建多机集群），关闭集群心跳与 HA 守护进程能大幅减少后台每分钟的磁盘写入和 CPU 唤醒：

```bash
systemctl disable --now pve-ha-lrm pve-ha-crm corosync
```

关闭虚拟机的 USB 数位板指针

在 PVE 网页端 -> 选中各个 Linux/Windows 虚拟机 -> 选项（Options） -> 将 Use tablet for pointer（使用平板电脑指针） 设为 No。

原因：开启此项会模拟一个 USB HID 设备，产生每秒 1000 次的高频轮询中断，直接阻止宿主机 CPU 进入 Package C6 休眠。纯后台服务或通过 RDP/SSH 管理的虚拟机关闭后鼠标依然正常。


#### 风扇设置

进入 BMC 远程管理， 默认（ADMIN/ADMIN）

Configration => Fan Speed Mode =>  Optimal Mode

```bash
# 分别查看风扇转速与各区域温度

ipmitool sdr type Fan
ipmitool sdr type Temperature
```


#### 风险

1. 严禁全局开启 PCIe ASPM（Active State Power Management）深度节能

风险原因：LSI/Broadcom SAS2008/SAS2308/SAS3008 阵列卡、企业级 NVMe 以及部分多口万兆/千兆服务器网卡，在 C602 主板上强制开启 ASPM L1 状态后，极易在 I/O 突发时发生唤醒超时，直接导致总线重置（PCIe Bus Reset）、ZFS/LVM 阵列踢盘甚至宿主机 Kernel Panic。

安全做法：保持 BIOS 与内核默认的 pcie_aspm=default（由固件白名单决定），切勿在 GRUB 中强加 pcie_aspm=force 或 pcie_aspm.policy=powersupersave。

2. 严禁使用 powertop --auto-tune 一键优化

风险原因：--auto-tune 会将所有 PCIe 设备（包括 HBA 阵列卡、网卡、USB 控制器）的 power/control 全部设为 auto（Runtime PM 自动挂起），同时把 SATA 链路全部切入 min_power（ALPM），老款企业盘与 HBA 卡在链路频繁休眠/唤醒时极易产生 COMRESET 报错和坏道误判。