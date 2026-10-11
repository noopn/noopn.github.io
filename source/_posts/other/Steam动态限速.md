---
layout: posts
title: Steam 动态限速
mathjax: true
date: 2024-11-05 15:12:34
categories: 其他
tags:
  - Steam
---

#### 场景分析

```
+---------------------------------------------------------------------------------------------------+
|                                      PVE 存储服务端 (Linux 底层)                                     |
|                                                                                                   |
|   +-----------------------+              (异步下刷 Flush)              +----------------------+   |
|   | NVMe SSD 写入缓存层    | -----------------------------------------> | 底层 HDD 机械存储池   |   |
|   | (dm-writecache 水位)  |                                            +----------------------+   |
|   +-----------+-----------+                                                                       |
|               |                                                                                   |
|               v                                                                                   |
|   +-----------+-----------+                                                                       |
|   | iSCSI Target 服务端   | <=================== 3260 端口 (iSCSI 块存储流量) ====================+   |
|   +-----------------------+                                                                       |
+---------------+-----------------------------------------------------------------------------------+
                ^
                |
          (SSH: 22 端口)
    定时查询 dmsetup status
                |
                v
+---------------+-----------------------------------------------------------------------------------+
|                                          Windows 客户端                                           |
|                                                                                                   |
|   +-------------------------------------------------------------------------------------------+   |
|   |                               Node.js 监控守护进程 (后台常驻)                                 |   |
|   |                                                                                           |   |
|   |   1. 每 3 秒执行一次 SSH 命令查询 PVE 端脏页比例                                           |   |
|   |   2. 计算当前水位: Dirty Blocks / Total Blocks                                            |   |
|   |   3. 匹配控速策略:                                                                        |   |
|   |      * 水位 > 85%  -->  强制降速至 10 MB/s (防止 SSD 缓存被打爆假死)                      |   |
|   |      * 水位 70%~85% --> 限制至 30 MB/s                                                    |   |
|   |      * 水位 50%~70% --> 限制至 60 MB/s                                                    |   |
|   |      * 水位 < 50%  -->  解除限速 (0 / 恢复满速)                                           |   |
|   +---------------------------------------------+---------------------------------------------+   |
|                                                 |                                                 |
|                            (WebSocket / CDP 通信: 8080 端口)                                      |
|                       发送 SteamClient.Downloads.SetDownloadThrottle                              |
|                                                 |                                                 |
|                                                 v                                                 |
|   +---------------------------------------------+---------------------------------------------+   |
|   |                       Steam 客户端 (-cef-enable-debugging 启动)                           |   |
|   |                                                                                           |   |
|   |   [CEF 调试接口] ------------> [下载管理器引擎] ----------------> [写入挂载的 iSCSI 盘]   |   |
|   |   (实时注入速率)               (动态调整拉取速度)                  (NTFS 格式 / 映射自 PVE) |   |
|   +-----------------------------------------------------------------------------+-------------+   |
+---------------------------------------------------------------------------------|-----------------+

```

#### 项目地址

🚀 [Steam Auto Throttle](https://gitlab.iftrue.me/sunzhiqi/steam-auto-throttle)


#### 实现流程

##### Steam 开启 CEF

Steam CEF（Chromium Embedded Framework） 是 Valve 为 Steam 客户端构建全新 UI（基于 React / TypeScript）所内嵌的 开源 Chromium 网页渲染引擎。

现代 Steam 客户端除了最底层的 C++ 游戏启动与网络通讯核心外，整个商店、库、好友列表、下载管理界面本质上都是运行在这个内置 Chromium 浏览器中的 Web 页面。

参数 -cef-enable-debugging 的底层作用
给 Steam 启动项添加 -cef-enable-debugging，本质上是向其内部的 Chromium 内核传递了 --remote-debugging-port 指令：

暴露 CDP 调试端口：默认在本地 127.0.0.1:8080（或系统动态端口）启动一个 HTTP / WebSocket 服务。

开放 Chrome DevTools Protocol (CDP)：允许外部程序（浏览器开发者工具、Node.js、Python 等）通过标准的 CDP 协议，直接连接到 Steam 的前端渲染进程。

打通 SteamClient 原生桥接对象：Steam 前端暴露了一个特权的全局 JS 对象 window.SteamClient，该对象封装了与 Steam C++ 底层通信的各种 IPC 接口。开启调试后，外部脚本可以通过 CDP 的 Runtime.evaluate 自由调用这些接口。

| 功能方向             | 具体应用场景                                                            | 对应实现接口 / 方式                                        |
| :------------------- | :---------------------------------------------------------------------- | :--------------------------------------------------------- |
| **下载与带宽控制**   | 实时根据 NAS/SSD 缓存水位、局域网 QoS 动态降速或恢复满速                | `SteamClient.Downloads.SetDownloadThrottle(bps)`           |
| **游戏与任务自动化** | 暂停/恢复特定游戏更新、触发游戏安装、切换下载区                         | `SteamClient.Downloads.PauseDownload(appid)`               |
| **客户端状态监控**   | 获取当前正在下载的游戏 AppID、已下载字节数、实时读写峰值                | `SteamClient.Downloads.GetDownloadOverview()`              |
| **界面与皮肤定制**   | 注入自定义 CSS/JS 脚本、去除冗余模块（类似 Millennium/Steam-Skin 工具） | CDP `DOM.enable` / `Page.addScriptToEvaluateOnNewDocument` |
| **账号与好友交互**   | 静默切换在线/隐身状态、自动化接收好友邀请                               | `SteamClient.Friends.SetPersonaState(state)`               |

找到 Steam 快捷图标的位置，修改启动参数命令

```bash
"C:\Program Files (x86)\Steam\Steam.exe" -cef-enable-debugging
```

在浏览器访问 `http://localhost:8080/json` 来验证是否启用成功。


##### 功能设计

- 静默拉起

通过 pkg 编译为 .exe 文件，修改默认的 steam 快捷方式,右键点击捷方式 -> 属性（Properties）。

```bash
# 将 Target（目标） 清空并替换为以下单行命令：
mshta vbscript:CreateObject("WScript.Shell").Run("""C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Steam\steam-throttle.exe""",0,false)(window.close)

# 将 Start in（起始位置） 填入
C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Steam
```

- 动态限速

缓存使用超出 90% 开启限速，直到缓存回落到 80% 以下

```js
let lastSpeed = 0;
let startTimeStemp = Date.now();
let low = 80;
let high = 90
let isThrottle = false;
export function calculateTargetThrottle({ dirtyRatio }, avgMBps) {
    if (Date.now() - startTimeStemp < 60 * 1000) {
        return {
            needUpdate: false,
            speed: 0
        };
    }

    startTimeStemp = Date.now();

    if (dirtyRatio <= low && isThrottle) {
        isThrottle = false;
        return {
            needUpdate: true,
            speed: 150 * 8 * 1024
        };
    }
    else if ((dirtyRatio > low && isThrottle)) {
        if (Math.abs(lastSpeed - avgMBps) > 5) {
            lastSpeed = avgMBps;
            return {
                needUpdate: true,
                // 客户端内部对于 download_throttle_rate 这个字段的基本计量单位是 Kilobits per second (Kbps，千比特每秒)，而不是 Kilobytes per second (KB/s，千字节每秒)。
                speed: +(avgMBps - 5).toFixed(0) * 1024 * 8
            }
        }
    } else if (dirtyRatio > high) {
        if (Math.abs(lastSpeed - avgMBps) > 5) {
            lastSpeed = avgMBps;
            isThrottle = true;
            return {
                needUpdate: true,
                // 客户端内部对于 download_throttle_rate 这个字段的基本计量单位是 Kilobits per second (Kbps，千比特每秒)，而不是 Kilobytes per second (KB/s，千字节每秒)。
                speed: +(avgMBps - 5).toFixed(0) * 1024 * 8
            }
        }
    }
    return {
        needUpdate: false,
        speed: 0
    };
}
```

