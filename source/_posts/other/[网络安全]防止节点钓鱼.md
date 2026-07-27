---
layout: posts
title: 防止节点钓鱼
mathjax: true
date: 2024-10-03 14:28:12
categories: 网络安全
tags: 
  - VPN
  - 代理
---

#### 安全建议

- 设置非全局模式，国内能访问的站点就不要使用代理
- HTTP 站点如果要进行敏感操作，不要使用代理（安全的网站都是用 HTTPS 协议）
- 千万别被安装了根证书，这是最重要的一条，会帔看个精光
- 最好不要使用自带节点的第三方软件，某某加速器、某某 VPN 等这种软件可能会给你安装证书。
- 经常性检查证书链，保障数据安全

#### 链路分析

- 创建一个根证书 

  打开 Fiddler Classic，点击顶部菜单栏的 Tools -> Options...。

  切换到 HTTPS 选项卡。

  勾选 Capture HTTPS CONNECTs 和 Decrypt HTTPS traffic。

  勾选后，Fiddler 会自动弹窗问你是否要将根证书安装到系统受信任区域，点击 Yes 即可。

  如果需要导出证书文件（例如给手机安装）：

  点击右侧的 Actions 按钮。

  选择 Export Root Certificate to Desktop。

  此时你的桌面就会出现一个名为 FiddlerRoot.cer 的证书文件。

  这个证书会被写入到第三方软件的内部，软件安装的时候会在目标机器上生成一个根证书。

- 把证书传到目标电脑上执行安装来模拟证书被注入的过程：

  **方法一**：手动图形化安装（最适合单台电脑）

  启动安装向导：双击该证书文件，在弹出的窗口中点击 “安装证书...” (Install Certificate)。

  选择存储位置：

  选 “当前用户”（仅对当前登录账号生效，通常不需要管理员权限）。

  选 “本地计算机”（对电脑上所有账号生效，推荐，需要管理员权限）。

  点击“下一步”。

  【最关键的一步】选择证书存储：

  选择 “将所有的证书都放入下列存储”。

  点击 “浏览” 按钮。

  在列表中选中 受信任的根证书颁发机构 (Trusted Root Certification Authorities)。

  点击“确定”，然后“下一步”，最后点击“完成”。

  安全警告确认：如果系统弹出一个安全警告弹窗，询问是否要安装此证书，点击 “是” 即可。

  **方法二**：命令行极速安装（适合自动化 / 批处理脚本）

  以管理员身份运行命令提示符 (CMD) 或 PowerShell。 执行以下命令（将路径替换为你实际的证书文件路径）：

  ```bash
  certutil -addstore -f "Root" "C:\路径\到\你的\FiddlerRoot.cer"
  # 看到“CertUtil: -addstore 命令成功完成”的提示，就说明安装好了。
  ```

- 目标电脑 google 安装插件 SwitchyOmega 用于模拟开了的代理软件对数据进行转发
  
  配置转发 `fillder所在的服务器IP地址:8888`

  开启 Fiddler 允许远程连接：

  打开 Fiddler Classic，依次点击菜单栏 Tools -> Options -> Connections。

  勾选 Allow remote computers to connect（允许远程计算机连接）。

  (修改后需要重启一次 Fiddler 才能生效)。

  此时被注入的目标电脑就能通过代理转发到 fillder 服务上网了，但是使用的还是原有的证书，也并不能看见解密的信息

-  安装了根证书并不等于开启了解密！Fiddler 默认只捕获 HTTP，对 HTTPS 流量只做透传（Tunnel），所以浏览器看到的还是原厂证书。

  解决办法：

  打开 Fiddler，点击菜单栏 Tools -> Options -> HTTPS 页签。

  确保勾选了 Decrypt HTTPS traffic（解密 HTTPS 流量）。

  下方的下拉菜单选择 from all processes（捕获所有进程）或 from browsers only。

  点击 OK 保存并重启（如果是第一次勾选，它会提示你重新生成并安装一次证书）。

  这样可以在左侧列表中看到被拦截的并解密的明文信息。


#### 证书校验流程

当我们首次访问一个之前从未去过的网站（比如 https://example.com）时，你的电脑里确实没有 example.com 的证书。

那么浏览器到底是怎么敢信任这个网站的呢？核心原因在于：TLS 证书体系采用的是“信任链 (Chain of Trust)”机制。

你可以把证书验证想象成去办理出国签证：海关（浏览器）并不认识你个人（网站），但海关认识给你盖章的“大使馆/公安局（根证书颁发机构 CA）”。

证书的“家族树”：三层信任链结构，在真实的互联网中，证书通常分为三层：

```txt
[ 根证书 Root CA ]             ---- 存放在你的 Windows / macOS 系统信任库中（预装好的）
      │ (签发/盖章)
      ▼
[ 中级证书 Intermediate CA ]    ---- 由 CA 机构持有，负责日常签发
      │ (签发/盖章)
      ▼
[ 站点证书 Server/Leaf ]       ---- 你访问的网站（如 example.com）持有的证书
```

根证书 (Root CA)：全球权威的“超级公章”（如 DigiCert, Sectigo, Let's Encrypt）。它们数量很少（几百个），在你买电脑/装操作系统时，微软或苹果就已经预先打包安装在你的系统里了。

中级证书 (Intermediate CA)：根证书的“代理人”。为了防止根证书的私钥泄露导致全球信任崩塌，根 CA 通常把私钥锁在保险柜里，平时只用中级证书来给具体的网站盖章。

站点证书 (Leaf Certificate)：网站管理员买到的、写着 example.com 的证书。

当 Chrome 拿到服务器发过来的证书链后，它会在你的电脑本地进行以下 4 步严格审查：

步骤 A：查验域名与有效期 (Domain & Expiry Verification)

检查域名：这个证书里的 Subject Alternative Name (SAN) 字段写的是不是 example.com？（防止拿 baidu.com 的证书来冒充 example.com）。

检查时间：当前时间是不是在证书的 Not Before 和 Not After（有效期）之间？

步骤 B：沿着“信任链”向上溯源 (Chain Building)

浏览器看站点证书：“你是 example.com，谁给你签发的？” $\rightarrow$ 发现签名者是 "DigiCert Global TLS Intermediate CA"。

浏览器检查随请求一起发过来的中级证书，确认签名正确。

浏览器继续看中级证书：“你又是谁签发的？” $\rightarrow$ 发现签名者是 "DigiCert Global Root CA"。

步骤 C：对暗号，比对系统预装的“根证书库” (Trust Anchor Matching)

浏览器拿着寻找目标的名称 "DigiCert Global Root CA"，打开你的 Windows 系统内置的 “受信任的根证书颁发机构” 数据库。

结果：找到了！ 你的 Windows 系统里早已躺着这个 DigiCert 的根证书公钥。

步骤 D：数学密码学验证（公钥验签）

用系统里的根证书公钥，去解密并验证中级证书上的数字签名 $\rightarrow$ 验证成功！（证明中级证书合法）。

用中级证书的公钥，去解密并验证 example.com 站点证书上的数字签名 $\rightarrow$ 验证成功！（证明站点证书合法）。

**兜底检查**：证书有没有被临时吊销？(Revocation Check)

即使证书没过期、签名也对，网站如果私钥泄露，CA 机构会提前吊销这张证书。浏览器还会通过以下方式快速确认：

OCSP Stapling（在线证书状态协议）：服务器在握手时直接附带一份来自 CA 的“带防伪印章的证明”，证明这张证书今天依然有效。

CRL（证书吊销列表）：浏览器定期下载的黑名单列表。


#### 问题

- **Q**： Chrome 走了 QUIC (HTTP/3) 协议，绕过了 HTTP 代理
  Google 自家的服务（Google 搜索、YouTube 等）默认会优先使用基于 UDP 的 QUIC 协议。
  Fiddler 只支持基于 TCP 的 HTTP/1.1 和 HTTP/2，无法拦截 UDP 流量。当 Chrome 走 QUIC 时，流量直接绕过代理直连了 Google，所以你看到的是官方证书。

  **A**: Chrome 的 QUIC 协议

  在 Chrome 地址栏输入并打开：chrome://flags/#enable-quic

  找到 Experimental QUIC protocol，将其状态改为 Disabled。

  点击右下角的 Relaunch 重启浏览器。

- **Q**: 为什么本地电脑也受影响？
  当你在本地电脑上打开 Fiddler Classic 时，它在后台默默做了这件事：

  它把 Windows 系统的代理设置自动改成了 127.0.0.1:8888。

  因为 Chrome、Edge、IE 以及绝大多数 Windows 应用，默认都会读取系统全局代理，所以你本地电脑上的所有网页请求，都会强制自动走 Fiddler。

  只要请求走了 Fiddler，并且你开启了 HTTPS 解密，Fiddler 就会用它安装在本地的根证书去重签网页，因此你在本地电脑访问网页时就会看到 Fiddler 的证书。

  如果你只希望通过代理插件（比如 SwitchyOmega）或远程设备连过来，而不想让本地电脑的所有软件都被 Fiddler 劫持，可以关闭 Fiddler 的“系统代理”功能：

  操作步骤：
  关闭 Fiddler 的系统代理捕获：

  Fiddler Classic：点击左下角的 Capturing 字样（或者按 F12），取消它的勾选。此时左下角不会显示 Capturing。

  或者取消勾选顶部菜单 File -> Capture Traffic。

  保持 Fiddler 的监听端口开放：

  只要 Fiddler 软件开着（并且在 Tools -> Options -> Connections 里勾选了 Allow remote computers to connect），它的 8888 端口就在后台持续监听着。

  效果：

  此时你本地的普通浏览器、软件不再走 Fiddler，访问网站依然是原厂证书。

  只有开启了 SwitchyOmega 插件的浏览器，或者配置了代理（指向 你的IP:8888）的远程电脑/手机，流量才会进入 Fiddler 被拦截解密。