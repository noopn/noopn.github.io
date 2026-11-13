---
layout: posts
title: Sunshine 配置
date: 2024-11-26 08:44:52
categories:
  - 其他
tags:
  - 其他
---

#### Manjaro 环境

检查显卡驱动状态 

```bash
mhwd -li

# Warning: config '/var/lib/mhwd/local/pci/video-nvidia-575xx/MHWDCONFIG' is invalid!
# > Installed PCI configs:
# --------------------------------------------------------------------------------
#                   NAME               VERSION          FREEDRIVER           TYPE
# --------------------------------------------------------------------------------
#      video-modesetting            2020.01.13                true            PCI
#   video-virtualmachine            2025.07.24                true            PCI


# Warning: No installed USB configs!

# 清理损坏的 mhwd 缓存记录
# mhwd 本地配置损坏：之前安装驱动过程遭遇中断或写入错误，在 /var/lib/mhwd/local/pci/ 残留了空目录或非法文件 video-nvidia-575xx，导致 mhwd 每次检测都报 MHWDCONFIG is invalid 并阻断后续操作。
sudo rm -rf /var/lib/mhwd/local/pci/video-nvidia*
```

安装与当前内核匹配的 Headers 头文件

```bash
# 通过以下命令自动安装当前内核对应的 headers
sudo pacman -Syu --needed $(mhwd-kernel -li | grep -o 'linux[0-9]*')-headers

# 验证头文件 uname -r 版本号匹配
pacman -Q | grep headers
# amf-headers 1.5.3-1
# ffnvcodec-headers 13.1.15.0-1
# linux-api-headers 7.2-1
# linux612-headers 6.12.112-1
# linux618-headers 6.18.55-1
# vulkan-headers 1:1.4.363.0-1
```

通过 Manjaro 自动化工具安装专有显卡驱动

```bash
sudo mhwd -a pci nonfree 0300

# 验证安装状态 输出列表中出现 video-nvidia 相关的驱动配置。
mhwd -li
# > Installed PCI configs:
# --------------------------------------------------------------------------------
#                   NAME               VERSION          FREEDRIVER           TYPE
# --------------------------------------------------------------------------------
#     video-nvidia-580xx            2026.03.05               false            PCI
#      video-modesetting            2020.01.13                true            PCI
#   video-virtualmachine            2025.07.24                true            PCI


# Warning: No installed USB configs!
```


驱动安装完成后，**必须将虚拟机完全关机再启动（不要在系统内使用普通的 reboot，确保 PVE 重新分配 PCIe 状态）**

```bash
sudo poweroff
```

开机后验证驱动接管显卡

```bash
#必须包含 Kernel driver in use: nvidia。
lspci -k | grep -A 3 -E "VGA|3D"

# 01:00.0 VGA compatible controller: NVIDIA Corporation GM200 [GeForce GTX 980 Ti] (rev a1)
#         Subsystem: NVIDIA Corporation Device 1151
#         Kernel driver in use: nvidia
#         Kernel modules: nouveau, nova_core, nvidia_drm, nvidia

```

验证 NVIDIA 运行状态与显卡识别

```bash
#正常打印出 GTX 980 Ti 的显存、温度和驱动版本表格。
nvidia-smi
```

重新检测欺骗器连接状态

```bash
for f in /sys/class/drm/card*-*/status; do echo "$f: $(cat $f)"; done
# /sys/class/drm/card0-DP-1/status: disconnected
# /sys/class/drm/card0-DP-2/status: disconnected
# /sys/class/drm/card0-DP-3/status: disconnected
# /sys/class/drm/card0-DVI-I-1/status: disconnected
# /sys/class/drm/card0-HDMI-A-1/status: connected
```

创建 sunshine 启动文件

```bash
# /home/supreme/.config/systemd/user/sunshine.service

[Unit]
Description=Sunshine is a self-hosted game stream host for Moonlight.
After=graphical-session.target

[Service]
ExecStart=/usr/bin/sunshine
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=graphical-session.target
```

添加系统自启动

```bash
systemctl --user enable sunshine
systemctl --user start sunshine
```