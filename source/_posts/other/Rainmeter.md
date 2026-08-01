---
layout: posts
title: Rainmeter 自定义组件
mathjax: true
date: 2024-10-13 17:44:18
categories:
  - 其他
tags:
  - Rainmeter
  - Windows
---


#### Rainmeter


安装 [Rainmeter](https://www.rainmeter.net/) 通过 vscode 打开 skins 所在的文件夹路径

创建新的 skins 文件夹作为根路径，创建二级文件夹作为组件，内部创建一个 `.ini` 文件 ,**编码格式选为UTF-16LE**

选择  refreash 重新加载组件， 通过 About Rainmeter 可以看见日志信息。


#### 显示PVE服务器的磁盘信息

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


#### 显示 BWG 的流量统计

```ini
; ======================================================================
; Rainmeter 引擎核心配置区
; ======================================================================
[Rainmeter]
; 组件的全局刷新频率，单位是毫秒 (ms)。1000 代表每 1 秒刷新一次整个皮肤的显示
Update=1000
; 设置皮肤的整体背景图片。#@# 是魔法变量，代表 @Resources 资源文件夹路径
Background=#@#Background.png
; 3 代表开启“九宫格缩放”模式，这样当内容增多时，背景只会拉伸中间部分，四角不会变形
BackgroundMode=3
; 定义九宫格缩放的保护边缘（左, 上, 右, 下）。这几个像素范围内的背景图片不会参与拉伸
BackgroundMargins=0,34,0,14

; ======================================================================
; 1. 全局变量配置区 (定义后可以在下方使用 #变量名# 来引用)
; ======================================================================
[Variables]
; 定义全局默认英文字体 (注意：Rainmeter变量不区分大小写，会被下方的 FontName 覆盖)
fontName=Trebuchet MS
; 定义默认字体大小为 8
textSize=8
; 定义进度条的默认颜色 (R, G, B, 透明度)
colorBar=235,170,0,255
; 定义文字的默认颜色 (白色，透明度 205)
colorText=255,255,255,205
; 覆盖上面的 fontName，设置为微软雅黑字体，支持中文显示
FontName=Microsoft YaHei
; 定义背景的颜色 (R, G, B, 透明度) - 此变量目前在代码中备用，未直接调用
BgColor=20,20,20,220

; ======================================================================
; 2. 数据源提取 (Measures) - 负责从网络 API 拉取原始数据
; ======================================================================
[MeasureMainAPI]
; 声明该 Measure 的类型为 WebParser (网页解析器)，专门用来处理网络请求
Measure=WebParser
; API 的请求地址，包含你的节点 veid 和 API Key 凭证
URL="https://api.64clouds.com/v1/getServiceInfo?veid=1859048&api_key=private_sC8OXr5e1AQI4E4qEPYEmlnd"
; 正则表达式：使用 (?si) 忽略大小写和换行，(?=.*?) 正向预查确保无视字段顺序，并提取 3 个括号里的值
RegExp="(?si)(?=.*?\"node_location\"\s*:\s*\"(.*?)\")(?=.*?\"plan_monthly_data\"\s*:\s*(\d+))(?=.*?\"data_counter\"\s*:\s*(\d+))"
; 限制请求频率：UpdateRate=60 意味着每隔 60 次全局刷新(即 60 秒)才请求一次网络，防止被 API 封禁
UpdateRate=60
; 开启调试模式：会在当前皮肤文件夹生成 WebParserDump.txt 供你查看原始抓取数据。确认没问题后可以删掉这行
; Debug=2

; --- 提取节点位置 (对应上面正则里的第 1 个括号) ---
[MeasureNodeLocation]
Measure=WebParser
; 告诉这个子 Measure，数据来源于父组件 [MeasureMainAPI]
URL=[MeasureMainAPI]
; 指定提取正则匹配成功后的第 1 个子字符串
StringIndex=1

; --- 提取总流量计划 Bytes (对应正则里的第 2 个括号) ---
[MeasureMonthlyData]
Measure=WebParser
URL=[MeasureMainAPI]
StringIndex=2

; --- 提取已使用流量 Bytes (对应正则里的第 3 个括号) ---
[MeasureDataCounter]
Measure=WebParser
URL=[MeasureMainAPI]
StringIndex=3


; ======================================================================
; 3. 动态数据计算 (Calc) - 负责将提取到的 Bytes 转换为 GB 并计算百分比
; ======================================================================

; --- 计算已用流量 GB ---
[MeasureDataUsedGB]
; 声明类型为 Calc (计算器)
Measure=Calc
; 运算公式：用截取到的原始 Bytes 数据除以 1024的三次方 (1073741824)，转换为 GB
Formula=MeasureDataCounter / 1073741824
; 开启动态变量支持，确保数值随时间实时运算更新
DynamicVariables=1

; --- 计算总流量 GB ---
[MeasureTotalDataGB]
Measure=Calc
; 运算公式：总流量 Bytes 转为 GB
Formula=MeasureMonthlyData / 1073741824
DynamicVariables=1

; --- 专供进度条使用的计算组件 ---
[MeasureDataUsageCalc]
Measure=Calc
; 进度条的当前进度值为：已用 GB
Formula=MeasureDataUsedGB
; 重点：必须告诉进度条“最大值”是多少。这里将最大值设为总流量 GB
MaxValue=[MeasureTotalDataGB]
DynamicVariables=1

; --- 计算使用百分比，并根据百分比改变进度条颜色 ---
[MeasureDataPercentage]
Measure=Calc
; 计算百分比公式：(已用 / 总量) * 100。
; Max(MeasureTotalDataGB, 0.00001) 的作用是防止在刚启动还没连上网络时，总流量为 0 导致发生“除零错误”(Division by 0)
Formula=(MeasureDataUsedGB / Max(MeasureTotalDataGB, 0.00001)) * 100
DynamicVariables=1

; 条件1：如果使用百分比 < 50%
IfCondition=MeasureDataPercentage < 50
; 如果条件1为真，执行动作：利用 !SetOption 命令修改 meterBarDataUsed 进度条组件的 BarColor 属性为绿色
IfTrueAction=[!SetOption meterBarDataUsed BarColor "100,255,100,255"]

; 条件2：如果使用百分比 >= 50% 且 <= 90%
IfCondition2=(MeasureDataPercentage >= 50) && (MeasureDataPercentage <= 90)
; 如果条件2为真，执行动作：修改进度条颜色为橙色 (也是你原本设置的默认颜色)
IfTrueAction2=[!SetOption meterBarDataUsed BarColor "235,170,0,255"]

; 条件3：如果使用百分比 > 90%
IfCondition3=MeasureDataPercentage > 90
; 如果条件3为真，执行动作：修改进度条颜色为红色，起警告作用
IfTrueAction3=[!SetOption meterBarDataUsed BarColor "255,70,70,255"]


; ======================================================================
; 4. 样式预设 (Styles) - 像 CSS 一样将重复的排版属性集中起来供后续继承
; ======================================================================

; --- 顶部标题样式 ---
[styleTitle]
; 文本对齐方式：居中
StringAlign=Center
; 文本自动转换：全部大写
StringCase=Upper
; 文本样式：加粗
StringStyle=Bold
; 字体特效：添加阴影
StringEffect=Shadow
; 特效颜色：黑色阴影，透明度 50
FontEffectColor=0,0,0,50
; 字体颜色：调用上方定义的 #colorText# 变量
FontColor=#colorText#
; 字体名称：调用上方定义的 #fontName# 变量
FontFace=#fontName#
; 字体大小：10磅
FontSize=10
; 开启抗锯齿，使文字边缘平滑不模糊
AntiAlias=1
; 开启文本裁剪，超出设定宽度的文本会自动隐藏或变为省略号
ClipString=1

; --- 左侧标签文字样式 ---
[styleLeftText]
; 文本对齐：左对齐
StringAlign=Left
; 保持原本大小写
StringCase=None
StringStyle=Bold
StringEffect=Shadow
FontEffectColor=0,0,0,20
FontColor=#colorText#
FontFace=#fontName#
; 字体大小调用上方定义的 #textSize# 变量
FontSize=#textSize#
AntiAlias=1
ClipString=1

; --- 右侧数值文字样式 ---
[styleRightText]
; 文本对齐：右对齐 (由于是右对齐，坐标 X 需要填右边界的位置)
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

; --- 进度条样式 ---
[styleBar]
; 进度条的前景色：调用 #colorBar#
BarColor=#colorBar#
; 进度条方向：水平 (HORIZONTAL)
BarOrientation=HORIZONTAL
; 进度条未填充部分的底色：半透明的白色
SolidColor=255,255,255,15


; ======================================================================
; 5. UI 界面渲染 (Meters) - 实际在屏幕上画出图形和文字
; ======================================================================

; --- 绘制顶部标题 ---
[MeterTitle]
; 组件类型为纯文本 (String)
Meter=String
; 继承并应用上方写好的 [styleTitle] 样式模板
MeterStyle=styleTitle
; 绑定数据源为节点位置。提取出的位置会替换掉 Text 里的 %1
MeasureName=MeasureNodeLocation
; X轴坐标设在 100，配合居中对齐，代表以 100 为中心轴向左右扩散
X=100
; Y轴坐标距离背景顶部 12 像素
Y=12
; 定义组件总宽度 190
W=190
; 定义组件总高度 18
H=18
; 实际渲染的文本内容，%1 会被映射为 MeasureNodeLocation 获取到的字符串
Text="BWG %1"

; --- 绘制左侧静态标签："Data Usage:" ---
[MeterDataLabel]
Meter=String
MeterStyle=styleLeftText
; X轴从左侧边缘 10 像素处开始
X=10
; Y轴定在 40，位于标题下方
Y=40
W=190
H=14
; 纯静态文本展示，无需绑定 Measure
Text="Data Usage:"

; --- 绘制右侧动态数值："XXX GB / XXX GB" ---
[meterDataUsed]
Meter=String
MeterStyle=styleRightText
; 绑定第一个变量：已用 GB，用于替换 %1
MeasureName=MeasureDataUsedGB
; 绑定第二个变量：总共 GB，用于替换 %2
MeasureName2=MeasureTotalDataGB
; X轴设在 200，因为它是右对齐的，200是它的最右侧边界限制
X=200
; Y=0r 中的 'r' 代表相对定位 (relative)。0r 意味着它的 Y 坐标与前一个组件（MeterDataLabel）保持同一水平线
Y=0r
W=190
H=14
; 显示格式模板：%1 和 %2 会被上述两个 Measure 替换
Text="%1 GB / %2 GB"
; 强制让小数显示时保留 2 位（如 45.20 GB）
NumOfDecimals=2

; --- 绘制底部流量进度条 ---
[meterBarDataUsed]
; 组件类型为进度条 (Bar)
Meter=Bar
MeterStyle=styleBar
; 绑定上面写好带有 MaxValue 属性的进度比例 Calc 组件
MeasureName=MeasureDataUsageCalc
; 进度条起点 X 为 10
X=10
; 进度条纵向起点在 55 像素，正好位于上述文字的下方
Y=55
; 进度条总长度 190
W=190
; 进度条高度（线条粗细）为 1 像素
H=1
```

#### 使用 openwrt api 动态切换代理 

创建 `proxy_control.ps1` 放到 Rainmeter 组件 @Resources 文件夹 

```ps1
param (
    [string]$Action = "Status",
    [string]$TargetNode = ""
)

$RouterUrl = "https://home.iftrue.club/cgi-bin/luci/rpc"
$User = "root"
$Pass = "w.521@@ong.COM"

# 忽略 HTTPS 自签证书错误
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}

try {
    # 1. 登录获取 Token
    $AuthBody = @{ jsonrpc = "2.0"; id = 1; method = "login"; params = @($User, $Pass) } | ConvertTo-Json -Depth 10
    $AuthResponse = Invoke-RestMethod -Uri "$RouterUrl/auth" -Method Post -Body $AuthBody -ContentType "application/json"
    $Token = $AuthResponse.result

    if ([string]::IsNullOrEmpty($Token)) {
        Write-Output "AuthFailed"
        exit
    }

    # 2. 查询状态
    if ($Action -eq "Status") {
        $GetBody = @{ jsonrpc = "2.0"; id = 2; method = "get"; params = @("homeproxy", "MSI", "outbound") } | ConvertTo-Json -Depth 10
        $GetResponse = Invoke-RestMethod -Uri "$RouterUrl/uci?auth=$Token" -Method Post -Body $GetBody -ContentType "application/json"
        
        # 必须使用 Write-Output 才能被 Rainmeter 正确捕捉
        Write-Output $GetResponse.result
        exit
    }

    # 3. 指定设置节点
    if ($Action -eq "Set" -and $TargetNode -ne "") {
        # uci set
        $SetBody = @{ jsonrpc = "2.0"; id = 3; method = "set"; params = @("homeproxy", "MSI", "outbound", $TargetNode) } | ConvertTo-Json -Depth 10
        Invoke-RestMethod -Uri "$RouterUrl/uci?auth=$Token" -Method Post -Body $SetBody -ContentType "application/json"

        # uci commit
        $CommitBody = @{ jsonrpc = "2.0"; id = 4; method = "commit"; params = @("homeproxy") } | ConvertTo-Json -Depth 10
        Invoke-RestMethod -Uri "$RouterUrl/uci?auth=$Token" -Method Post -Body $CommitBody -ContentType "application/json"

        # 必须使用 Write-Output 才能被 Rainmeter 正确捕捉
        Write-Output $TargetNode
        exit
    }
} catch {
    Write-Output "Error"
}
```

创建 Rainmeter 组件

```ini
[Rainmeter]
Update=1000
Background=#@#Background.png
BackgroundMode=3
BackgroundMargins=0,34,0,14
OnRefreshAction=[!CommandMeasure MeasureCheckStatus "Run"]

[Metadata]
Name=HomeProxy Switcher Grid
Author=YourName
Information=Bootstrap 风格多按钮代理切换面板

[Variables]
; Bootstrap 现代无衬线字体 (Windows 自带)
fontName=Segoe UI
SetNode=""

; --- Bootstrap 颜色方案 ---
; 默认状态 (柔和的深灰色, 类似 btn-dark)
BgNormal=44,48,52,255
TextNormal=170,175,180,255

; 高亮状态 (柔和的黯蓝色, 类似 btn-primary 降低饱和度，不刺眼)
BgActive=50,110,160,255
TextActive=245,250,255,255

; 加载/点击瞬间状态 (稍亮的深灰色)
BgLoading=65,70,75,255

; ==================================
; 核心逻辑: 状态轮询与匹配
; ==================================
[MeasureTimer]
Measure=Calc
Formula=(MeasureTimer + 1) % 10
IfCondition=MeasureTimer = 0
IfTrueAction=[!CommandMeasure MeasureCheckStatus "Run"]

[MeasureCheckStatus]
Measure=Plugin
Plugin=RunCommand
Parameter=powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "#@#proxy_control.ps1" -Action Status
State=Hide
OutputType=ANSI
FinishAction=[!UpdateMeasure MeasureCheckStatus][!Redraw]

; --- 高亮逻辑 (先用正则匹配，将所有形状重置，再点亮特定的形状和文字) ---
; 注意：这里我们通过改变 Shape 字符串中的 Fill Color 来改变圆角矩形的颜色
IfMatch=BWG
IfMatchAction=[!SetOptionGroup ProxyBtns_Shape Shape "Rectangle 0,0,80,28,5 | Fill Color #BgNormal# | StrokeWidth 0"][!SetOptionGroup ProxyBtns_Text FontColor "#TextNormal#"][!SetOption MeterBtnBWG_Shape Shape "Rectangle 0,0,80,28,5 | Fill Color #BgActive# | StrokeWidth 0"][!SetOption MeterBtnBWG_Text FontColor "#TextActive#"][!UpdateMeterGroup ProxyBtns_Shape][!UpdateMeterGroup ProxyBtns_Text][!Redraw]

IfMatch2=SG
IfMatchAction2=[!SetOptionGroup ProxyBtns_Shape Shape "Rectangle 0,0,80,28,5 | Fill Color #BgNormal# | StrokeWidth 0"][!SetOptionGroup ProxyBtns_Text FontColor "#TextNormal#"][!SetOption MeterBtnSG_Shape Shape "Rectangle 0,0,80,28,5 | Fill Color #BgActive# | StrokeWidth 0"][!SetOption MeterBtnSG_Text FontColor "#TextActive#"][!UpdateMeterGroup ProxyBtns_Shape][!UpdateMeterGroup ProxyBtns_Text][!Redraw]

IfMatch3=HK
IfMatchAction3=[!SetOptionGroup ProxyBtns_Shape Shape "Rectangle 0,0,80,28,5 | Fill Color #BgNormal# | StrokeWidth 0"][!SetOptionGroup ProxyBtns_Text FontColor "#TextNormal#"][!SetOption MeterBtnHK_Shape Shape "Rectangle 0,0,80,28,5 | Fill Color #BgActive# | StrokeWidth 0"][!SetOption MeterBtnHK_Text FontColor "#TextActive#"][!UpdateMeterGroup ProxyBtns_Shape][!UpdateMeterGroup ProxyBtns_Text][!Redraw]

IfMatch4=JP
IfMatchAction4=[!SetOptionGroup ProxyBtns_Shape Shape "Rectangle 0,0,80,28,5 | Fill Color #BgNormal# | StrokeWidth 0"][!SetOptionGroup ProxyBtns_Text FontColor "#TextNormal#"][!SetOption MeterBtnJP_Shape Shape "Rectangle 0,0,80,28,5 | Fill Color #BgActive# | StrokeWidth 0"][!SetOption MeterBtnJP_Text FontColor "#TextActive#"][!UpdateMeterGroup ProxyBtns_Shape][!UpdateMeterGroup ProxyBtns_Text][!Redraw]

; ==================================
; 核心逻辑: 提交修改节点请求
; ==================================
[MeasureSetProxy]
Measure=Plugin
Plugin=RunCommand
Parameter=powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "#@#proxy_control.ps1" -Action Set -TargetNode "#SetNode#"
State=Hide
OutputType=ANSI
DynamicVariables=1
FinishAction=[!CommandMeasure MeasureCheckStatus "Run"]

; ==================================
; 样式表 (Bootstrap 风格)
; ==================================
[styleTitle]
StringAlign=Center
StringCase=Upper
StringStyle=Bold
FontColor=180,180,180,255
FontFace=#fontName#
FontSize=9
CharacterSpacing=1
AntiAlias=1

; 圆角背景形状的基础样式 (宽80, 高28, 圆角弧度5)
[styleBtnShape]
Shape=Rectangle 0,0,80,28,5 | Fill Color #BgNormal# | StrokeWidth 0
Group=ProxyBtns_Shape

; 文字样式 (附带透明点击层)
[styleBtnText]
W=80
H=28
StringAlign=CenterCenter
FontFace=#fontName#
FontSize=9
FontWeight=600
FontColor=#TextNormal#
SolidColor=0,0,0,1
AntiAlias=1
Group=ProxyBtns_Text


; ==================================
; UI 界面渲染
; ==================================
[MeterTitle]
Meter=String
MeterStyle=styleTitle
X=100
Y=12
W=190
H=18
Text="Proxy Nodes"

; ----------------------------------
; 第一排按钮 (Y=40, 左间距15, 中间间距10)
; ----------------------------------
; 按钮 BWG -------------------------
[MeterBtnBWG_Shape]
Meter=Shape
MeterStyle=styleBtnShape
X=15
Y=40

[MeterBtnBWG_Text]
Meter=String
MeterStyle=styleBtnText
; X=40r 代表相对上面的 Shape 向右偏移40(居中)，Y=14r 代表向下偏移14(居中)
X=40r
Y=14r
Text="BWG"
LeftMouseUpAction=[!SetVariable SetNode "BWG"][!SetOption MeterBtnBWG_Shape Shape "Rectangle 0,0,80,28,5 | Fill Color #BgLoading# | StrokeWidth 0"][!UpdateMeter MeterBtnBWG_Shape][!Redraw][!UpdateMeasure MeasureSetProxy][!CommandMeasure MeasureSetProxy "Run"]

; 按钮 SG --------------------------
[MeterBtnSG_Shape]
Meter=Shape
MeterStyle=styleBtnShape
X=105
Y=40

[MeterBtnSG_Text]
Meter=String
MeterStyle=styleBtnText
X=40r
Y=14r
Text="SG"
LeftMouseUpAction=[!SetVariable SetNode "SG"][!SetOption MeterBtnSG_Shape Shape "Rectangle 0,0,80,28,5 | Fill Color #BgLoading# | StrokeWidth 0"][!UpdateMeter MeterBtnSG_Shape][!Redraw][!UpdateMeasure MeasureSetProxy][!CommandMeasure MeasureSetProxy "Run"]


; ; ----------------------------------
; ; 第二排按钮 (Y=78, 与第一排上下间距10)
; ; ----------------------------------
; ; 按钮 HK --------------------------
; [MeterBtnHK_Shape]
; Meter=Shape
; MeterStyle=styleBtnShape
; X=15
; Y=78

; [MeterBtnHK_Text]
; Meter=String
; MeterStyle=styleBtnText
; X=40r
; Y=14r
; Text="HK"
; LeftMouseUpAction=[!SetVariable SetNode "HK"][!SetOption MeterBtnHK_Shape Shape "Rectangle 0,0,80,28,5 | Fill Color #BgLoading# | StrokeWidth 0"][!UpdateMeter MeterBtnHK_Shape][!Redraw][!UpdateMeasure MeasureSetProxy][!CommandMeasure MeasureSetProxy "Run"]

; ; 按钮 JP --------------------------
; [MeterBtnJP_Shape]
; Meter=Shape
; MeterStyle=styleBtnShape
; X=105
; Y=78

; [MeterBtnJP_Text]
; Meter=String
; MeterStyle=styleBtnText
; X=40r
; Y=14r
; Text="JP"
; LeftMouseUpAction=[!SetVariable SetNode "JP"][!SetOption MeterBtnJP_Shape Shape "Rectangle 0,0,80,28,5 | Fill Color #BgLoading# | StrokeWidth 0"][!UpdateMeter MeterBtnJP_Shape][!Redraw][!UpdateMeasure MeasureSetProxy][!CommandMeasure MeasureSetProxy "Run"]
```
