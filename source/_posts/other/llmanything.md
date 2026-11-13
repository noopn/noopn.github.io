---
layout: posts
title: LLMAnything 配置
date: 2024-11-29 01:56:12
categories:
  - 其他
tags:
  - 其他
  - LLMAnything
---

#### ubuntu 关闭盒盖休眠

Ubuntu Server 默认启用了 systemd-logind 的电源管理，且合盖默认动作是挂起/休眠（suspend）。当你合着盖子重启时，系统刚引导到一半检测到盖子处于闭合状态，会瞬间自动进入休眠，导致网络断开、SSH 无法连接，表现出来就像“没开机”。

| 配置项 | 触发的物理场景 | 系统默认行为 | 设为 `ignore` 后的效果 |
| :--- | :--- | :--- | :--- |
| **`HandleLidSwitch`** | 笔记本仅使用电池供电（未插充电器，且未接外接显示器/扩展坞）时合盖 | `suspend`（进入睡眠挂起） | 即使拔掉电源用电池运行，合盖也完全忽略，保持系统在线 |
| **`HandleLidSwitchExternalPower`** | 笔记本插着外接电源（充电器），但未接外接显示器/扩展坞时合盖 | 跟随 `HandleLidSwitch`（通常也是 `suspend` 睡眠） | 插电状态下合盖不会睡眠或断网（作为服务器运行最关键的一项） |
| **`HandleLidSwitchDocked`** | 笔记本连接了扩展坞，或者外接了显示器（HDMI / DP / Type-C 视频输出）时合盖 | `ignore`（默认忽略，方便外接大屏使用） | 明确锁定为忽略，防止部分主板或显卡驱动在状态切换时误触发休眠 |

```bash
sudo nano /etc/systemd/logind.conf

HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore

# 重启该服务使配置生效
sudo systemctl restart systemd-logind

# 屏蔽系统级睡眠目标（防止 ACPI 事件触发深度休眠）
# 部分笔记本在合盖瞬间仍可能由主板硬件触发 ACPI 休眠信号，建议直接屏蔽所有睡眠与休眠服务
# 验证： 执行 systemctl status sleep.target，终端输出显示 Loaded: masked（已屏蔽）。
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target

```

#### 显卡相关问题

锁定 NVIDIA 驱动相关软件包

```bash
sudo apt-mark hold nvidia-driver-* libnvidia-compute-* nvidia-utils-*
```

唤醒时 GSP 固件崩溃死锁

```bash
sudo dmesg | grep -i -E "nvrm|nvidia|xid"
# 笔记本独显在无桌面环境下进入深度休眠后，唤醒时 GSP 固件崩溃死锁：
# Xid 119 (Timeout ... waiting for RPC response from GPU0 GSP) 发生在 rm_transition_dynamic_power / nv_pmops_runtime_resume 调用栈中：Ubuntu Server 没有图形界面占用显卡，系统在开机约 40 秒后触发了 PCIe 动态电源管理，将 RTX 3060 笔记本显卡放入深度休眠；随后当 ACPI 事件或 nvidia-smi 试图唤醒显卡时，显卡内部的 GSP 固件超时未响应并卡死。
# Xid 154 (GPU Reset Required)：GSP 超时直接触发了硬件级死锁，导致驱动无法读取传感器数据（nvidia-smi 满屏 ERR!），Ollama 也只能退回 100% CPU。

# 禁用 NVIDIA GSP 固件与 PCIe 动态电源管理（RTD3）
# 创建模块配置文件，禁止 RTX 3060 加载容易在休眠唤醒时超时崩溃的 GSP 固件，并关闭独显自动深度休眠
# 验证： 执行 cat /etc/modprobe.d/nvidia-headless.conf，确认终端完整输出了这两行 options nvidia 配置。
echo -e "options nvidia NVreg_EnableGpuFirmware=0\noptions nvidia NVreg_DynamicPowerManagement=0x00" | sudo tee /etc/modprobe.d/nvidia-headless.conf


# 更新 initramfs 引导镜像使参数在开机早期生效
# 日志显示 nvidia 模块在开机 2.06s 时就已从引导镜像加载，必须刷新 initramfs 才能让新参数生效：
# 验证： 命令正常执行完毕并输出 update-initramfs: Generating /boot/initrd.img-...，无任何报错。
sudo update-initramfs -u

# 开启显卡持久模式服务，防止无任务时驱动卸载
sudo systemctl enable nvidia-persistenced

# 执行彻底断电关机（冷启动）以解除 Xid 154 硬件死锁
# 当前会话中 Xid 154 已经把显卡锁死在崩溃状态，普通热重启可能无法重置显卡芯片的供电状态，必须彻底断电一次：
# 等待笔记本电源指示灯完全熄灭 10 秒后，再按开机键启动。验证： 重新连上 SSH 后运行 nvidia-smi 和 sudo dmesg | grep -i xid——nvidia-smi 恢复显示正常的温度、功耗以及 6144MiB 显存状态（不再出现 ERR!），且 dmesg 中不再出现 Xid 119 或 Xid 154
sudo poweroff
```

#### 通过 Docker 检查容器内 Ollama 的模型与 GPU 调用状态

```bash
# 确认 Ollama 容器能正常识别显卡
sudo docker exec -it ollama nvidia-smi

# 确认硬件调用情况
docker exec -it ollama ollama ps
```