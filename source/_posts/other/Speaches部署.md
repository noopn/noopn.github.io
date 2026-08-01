---
layout: posts
title: Speaches 部署
date: 2024-10-08 13:13:53
categories:
  - 其他
tags:
  - Speaches
---

#### docker compose 安装

```bash
git clone https://github.com/speaches-ai/speaches.git
```

修改 compose.yaml 端口不要和内网其他端口重复

创建一个启动脚本方便执行 `start.sh`

```bash
#!/bin/bash

# ================= 1. 检查管理员权限 =================
if [ "$EUID" -ne 0 ]; then
    echo "❌ 错误: 请使用管理员权限运行此脚本！"
    echo "👉 正确执行方式: sudo bash $0"
    exit 1
fi

# ================= 2. 锁定当前脚本所在的目录 =================
# 确保无论你在哪里调用这个脚本，都能正确找到旁边的 compose.cuda.yaml
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# ================= 3. 检查文件是否存在 =================
if [ ! -f "compose.cuda.yaml" ]; then
    echo "❌ 错误: 当前目录下未找到 compose.cuda.yaml 文件！"
    echo "路径: $SCRIPT_DIR/compose.cuda.yaml"
    exit 1
fi

# ================= 4. 启动 GPU 服务 =================
echo "🚀 正在以 CUDA/GPU 模式启动 Speaches 服务..."

export COMPOSE_FILE=compose.cuda.yaml
docker compose up --detach

# 检查 Docker 命令运行结果
if [ $? -eq 0 ]; then
    echo "✅ Speaches 服务已成功在后台启动！"
else
    echo "❌ 启动失败，请检查 Docker 服务状态或日志。"
fi
```

通过 `sudo start.sh` 启动 docker 服务

初次使用通过 API 下载模型 

```bash

# Systran/faster-whisper-small
# Systran/faster-whisper-medium
# Systran/faster-whisper-large-v3

http://192.168.48.177:15465/v1/models/Systran/faster-whisper-medium
```

#### FAQ

**Q1**: 只要启动 docker 服务，nvidia-smi 就会报错 
   
```bash
speaches  |  when using [('CUDAExecutionProvider', {}), ('CPUExecutionProvider', {})]

speaches  | Falling back to ['CPUExecutionProvider'] and retrying.

speaches  | ****************************************

speaches  | 2026-07-28 13:21:42,456:INFO:speaches.executors.shared.base_model_manager:_load:75:Model silero_vad_v5 loaded in 0.12s

speaches  | 2026-07-28 13:21:42,456:DEBUG:speaches.executors.shared.base_model_manager:_increment_ref:83:Incremented ref count for silero_vad_v5, self.ref_count=1

speaches  | 2026-07-28 13:21:49,379:DEBUG:speaches.executors.silero_vad_v5:__call__:138:VAD model inference took 6.8950s

speaches  | 2026-07-28 13:21:49,698:DEBUG:speaches.executors.shared.base_model_manager:_decrement_ref:88:Decremented ref count for silero_vad_v5, self.ref_count=0

speaches  | 2026-07-28 13:21:49,698:INFO:speaches.executors.shared.base_model_manager:_decrement_ref:98:Model silero_vad_v5 is idle, not unloading

speaches  | 2026-07-28 13:21:49,698:DEBUG:speaches.executors.silero_vad_v5:get_speech_timestamps:307:VAD processing took 7.3658s for 3765.50s audio

speaches  | 2026-07-28 13:21:49,701:DEBUG:speaches.executors.shared.base_model_manager:_load:72:Loading model Systran/faster-whisper-medium
```

**A1**: 显卡从休眠唤醒失败： 笔记本显卡在空闲时，Linux 驱动会自动把 GPU 置入 D3cold（深度省电模式）。当 Docker 容器启动并加载 CUDA/ONNX 运行时，会强行向 GPU 发送初始化指令，导致显卡从休眠唤醒时 PCIe 响应超时。

驱动失去响应： 唤醒失败后，NVIDIA 驱动抛出错误（通常会在内核日志里显示 GPU has fallen off the bus），导致 nvidia-smi 无法读取传感器温度、风扇和功耗信息，全显示为 ERR!。

```bash
# 临时开启常驻模式：
sudo nvidia-smi -pm 1

# 设置开机自启（使其永久生效）：
sudo systemctl enable --now nvidia-persistenced
```


