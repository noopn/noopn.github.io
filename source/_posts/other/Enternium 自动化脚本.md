---
layout: en
title: Enternium 自动化脚本
mathjax: true
date: 2024-09-18 18:02:34
categories: 其他
tags:
  - 游戏
---

#### 环境配置

下载 [airtest](https://airtest.netease.com/) 新建 .airtest 项目, 创建的 .air 文件就是一个含有 python 文件的文件夹，可以使用 python 语法，也可以使用 airtest 封装的命令

#### 文件拆分

可以创建多个 .air 文件，或是使用原生的 python 文件， 例如

```python
# utils.air

# -*- encoding=utf8 -*-
from airtest.core.api import *

def multi_touch(pos, times=3, base_duration=0.135, base_interval=0.1):
   logger.debug("点击坐标")
```

在主文件调用

```python
# -*- encoding=utf8 -*-

from airtest.core.api import *

using("../utils.air")
from utils import multi_touch

multi_touch((target_x, target_y), times=2,base_duration=0.135, base_interval=3.2)
```


#### 手势 

##### 为什么原生 ADB 无法实现连续的复杂手势,Minitouch 可以完美实现

每次你执行一句 adb shell input 命令，Android 底层都需要启动一个新的 Java 进程（app_process）来解析和执行这个动作。这个进程的启动和虚拟机初始化通常需要 100ms - 300ms 甚至更久。如果你想通过连续发送多条 ADB 命令来画一个圆，命令与命令之间会有明显的卡顿和停顿，手指（触点）会在屏幕上“断开”又“重连”，根本连不起来。

指令本身的局限性（缺乏流式控制）
原生 ADB 的 input 命令只支持离散的指令（点击一次，或者两点之间的一条直线滑动）。它没有提供“按下 (Down) -> 移动到点A (Move) -> 移动到点B (Move) -> 抬起 (Up)” 这种拆分状态的流式 (Streaming) 接口。

当你在 Airtest 中指定了 touch_method=MINITOUCH 时，Airtest 并不是在调用 ADB 命令，而是使用了完全不同的底层架构：

常驻的 Socket 连接（零启动延迟）
Airtest 会在设备端推入一个用 C/C++ 编写的 minitouch 守护进程，并在设备内部启动一个 Server。你的纯 Python 脚本会通过 ADB 端口转发（Port Forwarding）与这个 Server 建立一个 TCP Socket 连接。建立连接后，Python 脚本发送动作指令只是一次极快的网络 I/O，延迟在毫秒级，完全没有进程启动的开销。

直达 Linux 内核级别的事件注入 (evdev)
Minitouch 绕过了 Android 庞大臃肿的 Framework 层（InputManager），直接向 Android 底层的 Linux 驱动节点（通常是 /dev/input/eventX）写入原始的触摸事件。

基于状态机的连续指令
Minitouch 拥有极其精简的自定义协议，完美支持连续动作。在你的 Python 脚本底层，Airtest 可以通过 Socket 连续发送如下指令：

d 0 100 200 50 (第 0 个触控点，在坐标 100,200 按下，压力 50)
c (Commit，提交生效)
m 0 110 210 50 (触控点 0 移动到 110,210)
c (提交生效)
u 0 (触控点 0 抬起)
c (提交生效)

##### 实现一个手势

```python
# -*- encoding=utf8 -*-
from airtest.core.api import *
# 切换设备的触控驱动为 MINITOUCH 或 MAXTOUCH
auto_setup(__file__, devices=["Android://127.0.0.1:5037/emulator-5554?touch_method=MINITOUCH"])

# -*- encoding=utf8 -*-

from airtest.core.api import *

def draw_v_gesture(size=300, duration=0.5):
    """
    用 dev.swipe_along 实现一笔画 V 字手势（中途绝不抬手）
    """
    # 1. 获取当前设备对象
    dev = device()
    width, height = dev.get_current_resolution()
    
    # 2. 计算中心点与 V 字的 3 个轨迹点
    center_x = width / 2
    center_y = height / 2
    half_size = size / 2
    
    p1 = (center_x - half_size, center_y - half_size)  # 起点（左上）
    p2 = (center_x,             center_y + half_size)  # 拐点（底部）
    p3 = (center_x + half_size, center_y - half_size)  # 终点（右上）
    
    # 3. 调用设备的 swipe_along 接口，传入 3 个坐标构成的轨迹数组
    # 这个接口在底层会依次 down -> move(p2) -> move(p3) -> up，保证一笔画完
    dev.swipe_along([p1, p2, p3], duration=duration, steps=10)
```








1. 如何一直向着“雾气”区域探索？
从图片 image_2e587d.jpg 中可以看出，探索过的区域是深灰色的地面（带绿树），而未探索的雾气呈现出非常明显的黄褐色/土黄色。

解决方案：HSV 颜色掩膜（Color Masking）
我们不再判断“哪里亮”，而是专门寻找“黄褐色”。

提取雾气： 使用 OpenCV 将小地图从 BGR 转换为 HSV 颜色空间。设定黄褐色的阈值（Hue 约在 15-40 之间），过滤出一张只包含雾气的二值化黑白图（雾气部分是白色，其他全是黑色）。

计算重心： 找到这块白色区域的重心（质心），或者寻找离屏幕中心（玩家）最近的雾气边缘点。

输出向量： 算出从屏幕中心指向这个雾气重心的角度，这就是你要前进的方向。

2. 陷入四周都是黑色边界的死胡同，如何找到出口？
在图片右侧和下方，不可跨越的边界（虚空/墙壁）呈现出纯黑色或极暗的棕黑色。当你陷入死胡同时，你的四周绝大部分方向都是这种纯黑边界，只有出口方向是深灰色的地面。

解决方案：小地图射线投射法（Minimap Raycasting）
这是一种非常经典的 2D 寻路算法，它模仿了雷达扫描。

二值化墙壁： 把小地图转化为灰度图，设定一个极低的亮度阈值（比如像素值 < 15），把所有“纯黑边界”提取出来。

发射射线： 以小地图中心（玩家位置）为起点，向 8 个或 16 个方向（每隔 45 度或 22.5 度）发射虚拟射线。

测量距离： 射线在碰到“纯黑像素”时停止。记录每条射线延伸的长度。

决策出口： 哪条射线最长，说明那个方向的空地最大、路最远。 在死胡同里，最长的那条线必定指向出口。

核心代码实现
我们可以将这两个逻辑写成两个函数。以下是利用 OpenCV 分析你这张截图的实现思路：

Python
import cv2
import numpy as np
import math

def get_fog_direction(minimap):
    """
    目标1：寻找雾气方向
    """
    # 转换到 HSV 空间寻找黄褐色雾气
    hsv = cv2.cvtColor(minimap, cv2.COLOR_BGR2HSV)
    
    # 设定黄褐色雾气的 HSV 范围（需要根据实际截图微调）
    lower_fog = np.array([15, 50, 50])
    upper_fog = np.array([40, 255, 255])
    
    mask = cv2.inRange(hsv, lower_fog, upper_fog)
    
    # 寻找雾气的轮廓
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        # 找到面积最大的雾气块
        largest_contour = max(contours, key=cv2.contourArea)
        M = cv2.moments(largest_contour)
        if M["m00"] != 0:
            # 计算雾气重心
            target_x = int(M["m10"] / M["m00"])
            target_y = int(M["m01"] / M["m00"])
            
            # 计算方向角
            h, w = minimap.shape[:2]
            center_x, center_y = w // 2, h // 2
            dx = target_x - center_x
            dy = center_y - target_y # Y轴向下反转
            angle = math.degrees(math.atan2(dy, dx))
            return angle % 360
    return None

def find_exit_direction(minimap):
    """
    目标2：陷入死胡同时，用射线法寻找出口
    """
    # 转换为灰度图
    gray = cv2.cvtColor(minimap, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    center_x, center_y = w // 2, h // 2
    
    max_length = 0
    best_angle = 0
    
    # 向 16 个方向发射射线（每 22.5 度一根）
    for angle in range(0, 360, 22):
        radian = math.radians(angle)
        length = 0
        
        # 逐步向外延伸射线，每次步进 2 个像素
        while True:
            test_x = int(center_x + length * math.cos(radian))
            test_y = int(center_y - length * math.sin(radian))
            
            # 边界检查
            if not (0 <= test_x < w and 0 <= test_y < h):
                break
                
            # 碰到黑色边界（像素值 < 20 判定为黑墙）停止延伸
            if gray[test_y, test_x] < 20:
                break
                
            length += 2
            
        # 记录最长的一根射线
        if length > max_length:
            max_length = length
            best_angle = angle
            
    return best_angle
寻路逻辑的最佳整合
在你的主循环中，可以将这两个函数与之前讨论的状态机结合起来：

第一优先级： 检查小地图是否有红点（怪物），有则追踪。

第二优先级： 如果没怪物，调用 get_fog_direction()。如果有明确的雾气方向，向着雾气走。

第三优先级（兜底）： 如果被卡住（连续判定移动失败），立刻调用 find_exit_direction()，程序会像雷达一样扫出最长的那条路（即死胡同出口），强制向那里突围。

这三个问题非常深刻，完全触及了自动寻路算法（尤其是基于未知环境的“SLAM/前沿探索”算法）的最核心痛点。

其实，上一轮给你写的那套结合了“最近雾气（Closest Fog）”与“射线避障（Raycast）”的代码，在底层逻辑上已经天然地、数学化地兼容了这三种极端情况。

我们把这三个问题逐一拆解，看看这套逻辑是如何在底层完美闭环的。

问题一：出生地背后是墙，前方是雾气，如何兼容“走向雾气”与“沿墙走”？
逻辑核心：雾气是“目的”，墙壁是“约束”。

这套算法并不是“盲目找墙去贴”，而是“直线走向雾气，遇到墙才贴墙”。

在出生地，你的目标角度（最近的雾气）一定在前方。

算法会向前方发射射线。因为你背对墙壁，前方的射线是畅通无阻的（check_ray_clear 返回 True）。

此时，系统根本不会去理会你背后的墙，而是直接下达指令：直线走向前方的雾气。

只有当雾气在墙角的另一边，你的直线射线“撞”到了墙，算法才会启动“沿墙寻找安全角度”的逻辑（向左右偏移 15°、30° 等），从而表现出“顺着墙壁边缘走过去”的动作。

结论： 这两者完全不冲突，系统会自动在“开阔地直线冲锋”和“有障碍物贴墙绕行”之间无缝切换。

问题二：死胡同的墙被藏在雾气下，探开后发现死路，如何走出去？
你提到的细节非常精准：“墙的边界在雾气下面，没探索是看不见的”。这正是机器人导航中经典的“局部感知死胡同困境”。

但别担心，上一轮代码中的 get_best_safe_angle（安全角度扫掠）就是专门为了破解这个困境而设计的。让我们推演一下死胡同里的运作过程：

陷入死胡同： 你把死胡同里的雾气全吃光了，周围暴露出了纯黑的墙壁。

目标在墙外： 此时，离你最近的下一片雾气，一定在死胡同外面（也就是隔着一堵黑墙）。

直线撞墙： 算法向着那片雾气发射直线射线，必然撞到死胡同的黑墙。

雷达扫掠寻找出口： 算法发现前方不通，开始向两侧展开测试（±15°, ±30°...）。它发射的射线会扫过死胡同的左墙、右墙，全部提示撞墙。

找到来时的路： 当算法扫掠到死胡同的“入口”（也就是你刚走进来的那个方向，那里是深灰色的已探索地面，没有黑墙）时，射线畅通无阻！

成功脱困： 算法会立刻返回这个指向出口的角度。你的角色会华丽地转个身，顺着死胡同的边缘，稳稳地走出去。

结论： 只要死胡同有出口，射线扫掠机制（从 0° 一直扫到 180°）就一定能把出口“摸”出来，强制角色回头。

问题三：没有墙的独立雾气区域，如何保证不留下雾气碎块？
当你遇到一片处于广场正中央、周围没有任何墙壁的独立大雾区时，你担心角色会像无头苍蝇一样乱穿，把雾气切成碎片。

这正是我们使用 “最近边缘优先法则（Closest Frontier First）” 的最大意义。这套数学逻辑是自带“强迫症”的：

永远吃最近的一口： get_closest_fog 函数计算了屏幕上每一个雾气像素点到你当前位置的绝对欧氏距离。它不仅指出了方向，还锁定了离你最近的那个像素。

连续推进，绝不跳跃： 当你向着最近的像素走了一步，这个像素被探开了（变成了深灰色），下一帧，紧挨着它的那一点，自然就成为了新的“最近像素”。

推土机效应： 这种逻辑在宏观上表现出来的行为，就像是一台推土机。它会沿着雾气的最外层边缘，一层一层地、均匀地向内推进。

绝不留碎块： 如果系统留下了一个碎块在身后，那么那个身后的碎块距离你的绝对距离，一定小于前方的大片雾气。系统会立刻调转枪头，先把这个小碎块“吃干抹净”，然后再继续向前推进。

结论： 在没有墙壁干扰的开阔地带，基于欧氏距离最短的“贪心吃雾”算法，是最完美的“无死角扫图”策略。它在几何学上保证了探索边界的连续性，绝对不会遗漏任何一块碎片。

推荐技术栈与实现步骤
技术选型
推流与通信：

推流获取： 使用 scrcpy 的底层 ffmpeg / PyAV 接口，或者模拟器的共享内存/ADB 截图（每秒 15-30 帧即可满足 RL 需求）。

动作发送： Minidriver / Minitouch / ADB（高频低延迟点击）。

强化学习框架：

Stable-Baselines3 (SB3)： 目前 Python 最成熟的 RL 库。

算法首选：PPO (Proximal Policy Optimization) —— 容错率高、收敛稳定，非常适合处理屏幕图像输入（Nature-CNN 骨干网络）。

环境封装：

使用 Gymnasium (OpenAI Gym) 将游戏包装成标准环境：env.reset() 和 env.step(action)。