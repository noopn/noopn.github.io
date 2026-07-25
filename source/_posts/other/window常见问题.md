---
layout: posts
title: Window 常见问题
mathjax: true
date: 2024-09-12 08:12:33
categories: 其他
tags: Windows
---

#### Windows 10 搜索框一直是白色


这通常是因为 Windows 10 的搜索框内嵌了必应 (Bing) 网络搜索的网页组件，而这个网页组件的加载卡在了亮色模式，导致它无视了你系统的本地主题设置。

你可以通过以下几个专门针对 Win10 的方法来彻底解决这个问题：

方法一：切断搜索框的网络连接（最有效的终极修复）
既然是网络搜索组件导致的白屏 Bug，我们可以通过注册表直接关闭搜索框的“网络搜索建议”功能。这不仅能 100% 解决白色背景问题，还能让本地搜索（搜文件、搜软件）变得非常快。

按 Win + R 打开运行窗口，输入 cmd，然后按 Ctrl + Shift + Enter 以管理员身份运行。

复制并粘贴以下命令（直接在黑框里右键即可粘贴），然后按回车：

```bash
reg add "HKCU\Software\Policies\Microsoft\Windows\Explorer" /v DisableSearchBoxSuggestions /t REG_DWORD /d 1 /f
```

提示“操作成功完成”后，再次复制并运行以下命令来重启资源管理器：

```bash
taskkill /f /im explorer.exe & start explorer.exe
```

此时你的任务栏会刷新，再次点击搜索框，它应该已经强制恢复成与系统一致的深色背景了。


#### win10输入法变成繁体中文

通常是因为你不小心误触了 Windows 10 微软拼音输入法自带的简繁切换快捷键。

确保当前处于中文输入状态，然后直接在键盘上按下 `Ctrl + Shift + F`

如何永久关闭这个快捷键（防止再次误触）如果你平时完全不需要打繁体字，建议直接把这个快捷键关掉，一劳永逸：

1.进入语言设置:按 Win + I 打开 Windows 设置。点击 时间和语言。在左侧菜单栏选择 语言。
2.打开微软拼音选项:在右侧找到“首选语言”下的 中文(简体，中国)，点击它。点击展开后出现的 选项 按钮。向下滚动找到“键盘”列表下的 微软拼音，点击它。再次点击展开后出现的 选项 按钮。
3.关闭简繁切换快捷键:在微软拼音的设置页面，点击 按键。向下滚动到底部，找到“热键”部分。找到 简繁体中文输入切换。将后面的快捷键下拉菜单设置为 无，或者直接关闭开关（取决于你的 Win10 具体小版本号）。


#### 在 Windows 任务管理器里看到同一个 iSCSI 硬盘被显示成了三四个

在 Windows 任务管理器里看到同一个 iSCSI 硬盘被显示成了三四个，这通常是因为 “多路径重影” (Multiple Sessions / Multi-pathing) 造成的。

当你把底层的存储（比如 TrueNAS 分配的块存储或游戏盘）通过 iSCSI 映射到 Windows 时，如果出现了以下两种情况，Windows 就会把同一个硬盘认成多个独立的物理硬盘：

重复点击了连接：在 Windows 的 iSCSI 发起程序中，你可能对同一个目标 (Target) 多次点击了“连接”，导致系统建立了多个独立的会话。

多网卡/多 IP 路径：你的电脑或 NAS 有多个 IP 地址，Windows 通过不同的网络路径都连上了这个 iSCSI 目标，但你没有在 Windows 中启用并配置 MPIO (多路径 I/O) 来把它们合并成一个盘。

1.在磁盘管理中让硬盘“脱机”:解除 Windows 对硬盘的文件占用.右键点击任务栏的开始菜单图标（或按 Win + X），在弹出的菜单中选择 磁盘管理。在下方的列表中找到你的 iSCSI 硬盘。由于现在的重复连接问题，你可能会看到好几个容量完全相同的盘（其中一些可能会提示“签名冲突”或已经处于脱机状态）。找到那个状态为 联机 的 iSCSI 硬盘，在其左侧写着“磁盘 1”、“磁盘 2”等字样的灰色方块区域上点击右键。选择 脱机。这一步会安全地卸载文件系统，解除所有的占用锁定。你的盘符会暂时消失，这是正常的。

2.断开多余的 iSCSI 会话:回到 iSCSI 发起程序操作.再次回到 iSCSI 发起程序的窗口。在“目标”选项卡中，选中你的目标，点击 属性。在“会话”列表中，选中多余的会话点击 断开连接。此时因为硬盘已经脱机，系统不会再提示“正在使用”。依次断开，请务必保留 1 个会话不要断开，维持基础连接。

3.重新上线硬盘:恢复正常使用.回到 磁盘管理 窗口。在刚刚脱机的硬盘灰色方块区域再次点击右键。选择 联机。此时你的盘符会重新出现，你可以打开任务管理器确认，现在应该只剩下一个物理硬盘的图表了。

4.清理“收藏的目标”缓存:防止每次开机又变出几个盘.为了防止你下次重启电脑时，系统又按之前的错误记忆去连接三四次：在 iSCSI 发起程序的主界面，切换到上方的 收藏的目标 (Favorite Targets) 选项卡。如果这里的列表中出现了好几个完全相同的目标名称，选中那些多余的，点击 删除 (Remove)。列表里只保留一条该目标的记录即可。

#### windows 定时备份 

下载 [Veeam Agent for Microsoft Windows FREE](https://www.veeam.com/products/free/microsoft-windows.html) 安装后创建一个备份任务：

BackupMode: Entire computer 选择整机备份在恢复的时候可以选择恢复任何磁盘，或是文件

Destination: Shared folder 选择 Truenas 的 SMB 共享文件夹 

> **永远向前增量**，取消勾选 Create active full backups periodically
  第 1 天（周一）： 生成唯一的全量文件 [全量 VBK-周一]。
  第 2 到 7 天： 每天只生成几十 MB 的增量文件 [增量 VIB]。到了第 7 天（周日）晚上，你的文件夹里有 1 个全量 + 6 个增量（正好 7 个点）。
  第 8 天（下周一）的动作极其精妙：
  Veeam 首先照常做一个新的增量备份：[增量 VIB-第8天]。此时链条暂时变成了 8 个点。
  接着，合并（Merge）开始！ Veeam 会在你的 NAS 后台，把最老的那个 [增量 VIB-第2天] 的数据，直接注入（Inject）到 [全量 VBK-周一] 里面去。
  注入完成后，原本那个老全量文件的时间戳和内容，就自动“进化”成了周二的状态。
  然后，Veeam 把那个没用的 [增量 VIB-第2天] 物理删除。
  整个链条再次恢复成 1 个（进化的）全量 + 6 个增量，依然维持 7 个点。

Shared Folder: 设置一个保持备份的天数， 高级里面选择 Maintenance 标签，勾选 Perform backup files health check 设置时间为每周6，健康检查任务不会独自执行，当有备份任务执行后，他会顺势检查是否当日有健康检查任务，然后执行。

最后不要设置任何的定时任务，需要通过windows 定时任务来调度。

创建一个 `AutoBackup.bat` 文件, 保存为 UTF-8 的编码格式。

```batch
@echo off
chcp 65001 > nul

echo [1] 正在静默暂停 PrimoCache 任务 1...
echo "C:\Program Files\PrimoCache\rxpcc.exe" pause -c 1 -s

echo [2] 触发 Veeam 后台无感备份...
start /b "" "C:\Program Files\Veeam\Endpoint Backup\Veeam.EndPoint.Manager.exe" /backup

echo [3] 等待 60 秒让备份服务启动...
timeout /t 60 > nul

echo [4] 正在监控后台备份状态 (每 60 秒刷新)...

:CHECK_LOOP
:: 检查是否存在 VeeamAgent 进程
tasklist /NH /FI "IMAGENAME eq VeeamAgent.exe" | find /i "VeeamAgent.exe" > nul

:: 如果找不到进程，说明备份结束，跳出循环
if %errorlevel% neq 0 goto BACKUP_DONE

echo [%time:~0,8%] VeeamAgent.exe 正在后台辛勤工作，请耐心等待...
timeout /t 60 > nul
goto CHECK_LOOP

:BACKUP_DONE
echo [%time:~0,8%] 检测到备份进程已退出，备份圆满结束！

echo [5] 正在静默恢复 PrimoCache...
echo "C:\Program Files\PrimoCache\rxpcc.exe" resume -c 1 -s

echo ==========================
echo 任务全自动执行完毕！
echo ==========================
```

win + R 输入 taskschd.msc， 创建一个新的计划任务。 **选择 Create Task 不要选择 Create Basic Task**。

勾选 Run whether user is logged on or not 和 Do not sotre password 这样可以保证任务在后台静默执行。

勾选 Run with highest privileges 保证一管理员权限执行。

Action 标签中添加脚本路径，Start in 设置为脚本文件所在的文件夹路径。


#### windows 通过桌面小组件显示内网服务器（pve）的磁盘状态信息

安装 [Rainmeter](https://www.rainmeter.net/) 通过 vscode 打开 skins 所在的文件夹路径

创建新的 skins 文件夹作为根路径，创建二级文件夹作为组件，内部创建一个 `.ini` 文件 ,**编码格式选为UTF-16LE**

选择  refreash 重新加载组件， 通过 About Rainmeter 可以看见日志信息。

```ini
[Rainmeter]
; This section contains general settings that can be used to change how Rainmeter behaves.
; 这是组件的全局刷新频率，单位是毫秒 (ms)。
Update=1000
; 这是为整个小组件设置一张底层背景图片。
; 需要特别注意的是前面的 #@#：这是 Rainmeter 的一个内置魔法变量。它代表了当前组件的资源目录（通常路径是 你的组件文件夹\@Resources）。所以这行代码的意思是：去 @Resources 文件夹里读取一张叫 Background.png 的图片作为整体背景。
Background=#@#Background.png
; 这决定了背景图片的拉伸和缩放模式。
; 在 Rainmeter 中，3 代表开启“九宫格缩放”（Scale with Margins）模式。这意味着当你的组件内容变多、尺寸变大时，背景图片不会像普通的图片那样直接被拉伸到变形，而是配合下面的 BackgroundMargins 来智能缩放。
BackgroundMode=3
; 这个设置是专门配合 BackgroundMode=3 使用的，它定义了背景图片的“保护边缘”（也就是九宫格缩放的边界）。
; 这四个数字分别代表：左, 上, 右, 下 的像素距离。
; 0,34,0,14 的意思是：背景图片的顶部 34 个像素、底部 14 个像素在任何情况下都不参与拉伸变形，只有中间的部分会被拉长去填满空间。这通常用来保证圆角背景框的四角和边框边缘永远保持清晰，不会因为内容变长而变得模糊或被拉长。
BackgroundMargins=0,34,0,14

; ==================================
; 1. 全局变量配置区
; ==================================
[Variables]
; Variables declared here can be used later on between two # characters (e.g. #MyVariable#).
fontName=Trebuchet MS
textSize=8
colorBar=235,170,0,255
colorText=255,255,255,205
; 你的 PVE IP 地址
PveIP=pve.iftrue.club
; 节点名称
Node=pve
; 你要监控的物理磁盘名称（如 sda, nvme0n1）
Disk=/dev/sdc
; 在这里填入你的完整 API Token 凭证
Token=root@pam!pveAPIToken=4d7c041b-3a49-46c2-b3df-46d7e011cdd5

; 字体与背景颜色设置
FontName=Microsoft YaHei
BgColor=20,20,20,220

; ==================================
; 2. 数据源提取 (Measures)
; ==================================
; ==================================
; 2. 数据源提取 (Measures)
; ==================================
[MeasureSmartAPI]
Measure=WebParser
URL="https://#PveIP#/api2/json/nodes/#Node#/disks/smart?disk=#Disk#"
Header="Authorization: PVEAPIToken=#Token#"
; 使用正向预查并且修复了空白符匹配 (\s*)，防止吞掉温度数字。
; 强制按这个顺序抓取数据：1.温度 2.坏道 3.健康状态
RegExp="(?si)(?=.*?Current Drive Temperature:\s*(\d+))(?=.*?Elements in grown defect list:\s*(\d+))(?=.*?\"health\"\s*:\s*\"(.*?)\")"
UpdateRate=60

[MeasureTemp]
Measure=WebParser
URL=[MeasureSmartAPI]
; 对应正则第 1 个括号：温度
StringIndex=1

[MeasureDefects]
Measure=WebParser
URL=[MeasureSmartAPI]
; 对应正则第 2 个括号：坏道
StringIndex=2

[MeasureHealth]
Measure=WebParser
URL=[MeasureSmartAPI]
; 对应正则第 3 个括号：健康状态
StringIndex=3

; ; ==================================
; ; 3. 动态颜色告警逻辑 (Calc)
; ; ==================================
[MeasureDefectColor]
Measure=Calc
; 去掉方括号，避免初始加载时因空值报错
Formula=MeasureDefects
; 如果坏道数大于 0，数字变红；等于 0，保持绿色
IfAboveValue=0
IfAboveAction=[!SetOption MeterDefectValue FontColor "255,70,70,255"]
IfEqualValue=0
IfEqualAction=[!SetOption MeterDefectValue FontColor "100,255,100,255"]
DynamicVariables=1

; 温度动态颜色 (超过 50 度变黄，超过 60 度变红)
[MeasureTempColor]
Measure=Calc
; 去掉方括号，直接引用 Measure 名称
Formula=MeasureTemp
IfAboveValue=60
IfAboveAction=[!SetOption MeterTempValue FontColor "255,70,70,255"]
; 去掉方括号，避免空值报错
IfCondition=(MeasureTemp > 50) && (MeasureTemp <= 60)
IfTrueAction=[!SetOption MeterTempValue FontColor "255,200,50,255"]
IfCondition2=MeasureTemp <= 50
IfTrueAction2=[!SetOption MeterTempValue FontColor "255,255,255,255"]
DynamicVariables=1

; ----------------------------------
; STYLES are used to "centralize" options
; ----------------------------------

[styleTitle]
StringAlign=Center
StringCase=Upper
StringStyle=Bold
StringEffect=Shadow
FontEffectColor=0,0,0,50
FontColor=#colorText#
FontFace=#fontName#
FontSize=10
AntiAlias=1
ClipString=1

[styleLeftText]
StringAlign=Left
; Meters using styleLeftText will be left-aligned.
StringCase=None
StringStyle=Bold
StringEffect=Shadow
FontEffectColor=0,0,0,20
FontColor=#colorText#
FontFace=#fontName#
FontSize=#textSize#
AntiAlias=1
ClipString=1

[styleRightText]
StringAlign=Right
StringCase=None
StringStyle=Bold
StringEffect=Shadow
FontEffectColor=0,0,0,20
FontColor=#colorText#
FontFace=#fontName#
FontSize=#textSize#
AntiAlias=1
ClipString=1

[styleBar]
BarColor=#colorBar#
BarOrientation=HORIZONTAL
SolidColor=255,255,255,15

; ==================================
; 4. UI 界面渲染 (Meters)
; ==================================

; 标题栏
[MeterTitle]
Meter=String
MeterStyle=styleTitle
; Using MeterStyle=styleTitle will basically "copy" the
; contents of the [styleTitle] section here during runtime.
X=100
Y=12
W=190
H=18
Text="iSCSI Monitor (#Disk#)"

; --- 健康状态 ---
[MeterHealthLabel]
Meter=String
MeterStyle=styleLeftText
X=10
Y=40
W=190
H=14
Text="Health:"

[MeterHealthValue]
Meter=String
MeterStyle=styleRightText
MeasureName=MeasureHealth
X=200
Y=0r
; r stands for relative. In this case, the Y postition of meterValueCPU is 0 pixels
; below the Y value of the previous meter (i.e it's the same as in meterLabelCPU).
W=190
H=14
Text="%1"
AutoScale=1

; --- 硬盘温度 ---
[MeterTempLabel]
Meter=String
MeterStyle=styleLeftText
X=10
Y=58
W=190
H=14
Text="Temperature:"

[MeterTempValue]
Meter=String
MeasureName=MeasureTemp
MeterStyle=styleRightText
X=200
Y=0r
; r stands for relative. In this case, the Y postition of meterValueCPU is 0 pixels
; below the Y value of the previous meter (i.e it's the same as in meterLabelCPU).
W=190
H=14
Text="%1 °C"
AntiAlias=1

; --- 增长缺陷列表 (坏道) ---
[MeterDefectLabel]
Meter=String
MeterStyle=styleLeftText
X=10
Y=76
W=190
H=14
Text="Grown Defects:"

[MeterDefectValue]
Meter=String
MeasureName=MeasureDefects
MeterStyle=styleRightText
X=200
Y=0r
W=190
H=14
Text="%1"
```