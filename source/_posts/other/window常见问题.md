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

echo [%date% %time:~0,8%] [1] 正在静默暂停 PrimoCache 任务 1...
echo [%date% %time:~0,8%] 执行命令: "C:\Program Files\PrimoCache\rxpcc.exe" pause -c 1 -s
"C:\Program Files\PrimoCache\rxpcc.exe" pause -c 1 -s

echo [%date% %time:~0,8%] [2] 触发 Veeam 后台无感备份...
start /b "" "C:\Program Files\Veeam\Endpoint Backup\Veeam.EndPoint.Manager.exe" /backup

echo [%date% %time:~0,8%] [3] 等待 60 秒让备份服务启动...
timeout /t 60 > nul

echo [%date% %time:~0,8%] [4] 正在监控后台备份状态 (每 60 秒刷新)...

:CHECK_LOOP
:: 检查是否存在 VeeamAgent 进程
tasklist /NH /FI "IMAGENAME eq VeeamAgent.exe" | find /i "VeeamAgent.exe" > nul

:: 如果找不到进程，说明备份结束，跳出循环
if %errorlevel% neq 0 goto BACKUP_DONE

echo [%date% %time:~0,8%] VeeamAgent.exe 正在后台辛勤工作，请耐心等待...
timeout /t 60 > nul
goto CHECK_LOOP

:BACKUP_DONE
echo [%date% %time:~0,8%] 检测到备份进程已退出，备份圆满结束！

echo [%date% %time:~0,8%] [5] 正在静默恢复 PrimoCache...
echo [%date% %time:~0,8%] 执行命令: "C:\Program Files\PrimoCache\rxpcc.exe" resume -c 1 -s
"C:\Program Files\PrimoCache\rxpcc.exe" resume -c 1 -s

echo [%date% %time:~0,8%] ==========================
echo [%date% %time:~0,8%] 任务全自动执行完毕！
echo [%date% %time:~0,8%] ==========================
```

win + R 输入 taskschd.msc， 创建一个新的计划任务。 **选择 Create Task 不要选择 Create Basic Task**。

勾选 Run whether user is logged on or not 和 Do not sotre password 这样可以保证任务在后台静默执行。

勾选 Run with highest privileges 保证一管理员权限执行。

Action 标签中添加脚本路径 `cmd.exe` , Add arguments 填写 `/c ""C:\Program Files\PrimoCache\scripts\AutoBackup.bat" >> "C:\Program Files\PrimoCache\scripts\backup_log.txt" 2>&1"`


#### .exe 和 .msi 区别

.exe 和 .msi 都是常见的可执行/安装包格式，但它们的本质定位、运行机制和管理方式有着巨大的区别。

简而言之：.msi 是标准的“数据配置包”，依赖系统服务来安装；而 .exe 是“独立的可执行程序”，安装逻辑全由开发人员自己写。


| 特性                 | `.msi` (Microsoft Installer)                                                     | `.exe` (Executable)                                                                      |
| :------------------- | :------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| **本质类型**         | **数据库/配置文件**（包含文件列表、注册表项及安装指令）                          | **二进制可执行程序**（引导程序、独立应用或自定义安装包）                                 |
| **执行引擎**         | 由 Windows 内置的 **Windows Installer 服务** (`msiexec.exe`) 统一解析和执行      | 操作系统直接创建进程运行，内部逻辑由开发商自行编写（如 Inno Setup, NSIS, InstallShield） |
| **标准与规范**       | 极度标准统一，遵守微软严格的安装包规范                                           | 没有统一标准，界面、安装逻辑和卸载行为完全由开发者决定                                   |
| **静默安装支持**     | **原生统一**（通用命令 `msiexec /i package.msi /quiet`）                         | 依赖开发者的实现（命令参差不齐，如 `/S`, `/silent`, `/q` 等）                            |
| **卸载与修复**       | 原生支持**回滚（Rollback）**、修复（Repair）和干净卸载，系统会自动记录状态       | 依赖开发者编写的卸载程序（`uninstall.exe`），若没写好容易留有残留                        |
| **企业运维（域控）** | **原生支持**，可通过 Windows Group Policy (GPO) 或 Active Directory 批量静默部署 | 无法直接通过 GPO 原生推送，通常需要包装成 `.msi` 或借助第三方工具 (SCCM/Intune)          |

**.msi 像是一张“安装指南与零件清单”**

.msi 本质上是一个使用微软 OLE 复合文档格式存储的关系型数据库。

当你双击 .msi 时，实际上是系统自带的 Windows Installer 服务（msiexec.exe）读取了这个数据库。msiexec 负责创建目录、解压文件、写入注册表。

安全与回滚机制：如果在安装过程中出现错误（如断电、磁盘空间不足），msiexec 可以利用事务机制自动回滚，将系统还原到安装之前的状态，不会留下垃圾文件。

**.exe 像是“自带所有工具的自定义工程队”**

.exe 是真正的 Windows PE（可执行）文件。如果它是一个安装包，通常是开发者使用 NSIS、Inno Setup 或 Advanced Installer 等打包工具生成的。

当你双击 .exe 安装包时，它会运行开发者写好的代码逻辑：可能包含自定义的炫酷 UI 界面、解压进度条、甚至在后台安装其他捆绑软件。

灵活性与风险：.exe 非常灵活，可以做任何系统允许的事（比如安装前检查复杂的网络环境、预装驱动等）。但也正因如此，它缺乏统一规范，一旦安装过程崩溃，可能无法自动清理临时文件。

如果你要为企业/域控环境部署软件，或者需要标准的静默安装/干净卸载，优先选择 .msi。

如果软件需要复杂的预检逻辑、自定义界面，或者它本身就是一个无需安装的绿色单文件工具，则选择 .exe。


#### nvm安装nodejs报错

```bash
npm : File C:\nvm4w\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system. For more information, see about_Execution_Policies at https:/go.microsoft.co 
m/fwlink/?LinkID=135170.
At line:1 char:1
+ npm -v
+ ~~~
    + CategoryInfo          : SecurityError: (:) [], PSSecurityException
    + FullyQualifiedErrorId : UnauthorizedAccess 
```

这是一个非常经典的 Windows PowerShell 权限报错。Windows 系统出于安全考虑，默认处于严格模式，禁止执行任何 .ps1 脚本文件（包括 Node.js / nvm-windows 生成的 npm.ps1 脚本）。你只需要修改一下 PowerShell 的执行策略（Execution Policy）就可以解除这个限制。

点击 Windows 开始菜单，搜索 PowerShell，然后在搜索结果中点击以管理员身份运行。在终端中复制并粘贴以下命令，然后回车：

```bash
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

系统会弹出一长串提示，询问你是否要更改执行策略。输入大写字母 Y 并按下回车键确认。
