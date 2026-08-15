---
layout: posts
title: DNS 泄露
mathjax: true
date: 2024-10-23 21:28:48
categories: 网络安全
tags: 
  - VPN
  - 代理
---

#### 检测网站原理

- https://ipleak.net/
- https://browserleaks.com/dns
- https://dnsleaktest.com/
- https://ippure.com/DNS-Leak-Detect.html

向一个范域名发起随机的域名请求例如：**https://f8s4t5tznopvidjf54v5e6pbbnlbyov7gsuh02oh-2.ipleak.net/dnsdetection/** ， 这可以保证浏览器缓存，运营商的DNS缓存，上游的DNS缓存都没有这条记录。

运营商通过负载均衡交给上游不同的DNS服务器做解析，最终会找到这个域名的权威域名服务器。**当递归查询到达权威服务器时，权威服务器能够直接看到“是谁来向我询问这个随机域名的 IP”，并把这个来访者的 IP 地址记录在后台数据库里。**

**这里的“谁”，指的就是代表你跑去向权威服务器提问的那台 DNS 服务器（通常是运营商的上游/递归 DNS 服务器，或者你代理节点的 DNS 服务器），绝不是检测网站本身的 IP。**

因为完全随机的域名会导致运营商使用不同的上游DNS服务器查询，因此也会得到不同地址。 **DNS泄露不是是你电脑的真实 IP，而是你“正在使用哪家运营商/哪个地区的 DNS 服务器”这个信息，以及你“正在访问什么网站”的隐私意图。**

**DNS泄露的本质就是， DNS 请求是从你“本地设备/本地网络”直接发出去的（哪怕经过了加密）,加密（Security） $\neq$ 匿名/防泄露（Privacy & Anonymity）。**

加密只是把内容装进了“保险箱”，但快递单地址是公开的,宽带运营商能清楚地看到,你电脑的真实 IP,国内 DNS 服务器的 IP 显然知道这是在做DNS查询，当查询结束后向墙外VPN节点发送大量数据，就可以判定为在使用代理。

因此DNS泄露的本质就是在本地发起了DNS请求,以下这些日常场景也非常容易导致 DNS 泄露：

场景 A：主域名在规则里，但“子域名 / CDN 域名”不在规则里
很多大型海外网站或软件，其服务是由成百上千个极其隐蔽的二级域名或第三方 CDN 支撑的。

例子：你访问某个海外知名软件，主网站 example.com 被代理了，但它后台拉取的某些组件域名（如 static-assets-123.azureedge.net）可能没有收录在你的规则库里。

结果：这个子域名就会掉进默认的本地解析流程，导致在本地发起了 DNS 查询，造成泄露。

场景 B：App / 软件后台的“静默探针”与 DNS 预解析
现在的操作系统（如 Windows、macOS）和浏览器（如 Chrome）都有 DNS 预解析（DNS Prefetching） 功能。

当你打开一个包含大量网页链接的页面时，浏览器为了让你点击时更快，会悄悄在后台把页面里所有链接对应的 DNS 全部提前查一遍。

如果其中包含未经分流匹配的域名，哪怕你根本没有主动去点击那个“小众网站”，你的电脑也已经在后台完成了一次 DNS 泄露。

场景 C：BT / P2P 下载（如 BitTorrent）
当你使用 BT 软件下载海外资源时，BT 客户端需要向全球成千上万个 Tracker 服务器（有些直接是域名形式）汇报自己的状态。如果代理配置不当，这些密集且随机的 Tracker 域名查询会瞬间通过本地 DNS 爆发式泄露。


#### 为什么 Clash 等代理软件会在本地发起DNS请求呢?

核心矛盾一：分流规则（Rule）需要 IP 来判断,Clash 最强大的功能是智能分流（比如：国内网站直连、国外网站走代理、广告直接拦截）。

但绝大多数分流规则，不仅包含域名规则（DOMAIN-SUFFIX），还包含大量的 IP 段规则（IP-CIDR，例如 114.114.114.114/24 或国内 IP 库 GEOIP,CN）。

逻辑死结：当你在浏览器输入 baidu.com 或某个未知的域名时，Clash 在本地拿到这个域名，它如果不先去解析出它的 IP，就无法判断这个 IP 到底属于中国还是国外。

后果：为了判断这个流量该走“直连”还是“代理”，Clash 必须先在本地搞清楚这个域名对应的 IP 是什么。这就逼得它必须在本地发起一次 DNS 请求。


核心矛盾二：DNS 污染与 CDN 加速的“两难抉择”

如果让远端海外节点统一代为解析所有 DNS，看似防住了泄露，却带来了一个巨大的体验痛点：国内网站访问极慢（甚至打不开）。

假设全部交给海外节点解析（Remote DNS）：当你访问淘宝、微信、淘宝等国内服务时：

海外节点在国外帮你查 DNS，CDN 会以为是海外用户在访问，于是返回了一个美国的 CDN 加速服务器 IP。

你的电脑拿到这个美国 IP，虽然走直连，但数据包要绕地球一圈去连美国的服务器。

结果就是：开了代理后，国内所有网页和 App 变得卡顿无比。

为了解决这个问题，Clash 必须设计成：国内的域名用本地 DNS 解析（确保拿到最近的 CDN IP），国外的域名才去远端解析。 但只要稍有配置不当（例如分流规则没覆盖全），国外的域名就会误跑进本地 DNS 进行解析，从而造成了 DNS 泄露。

系统层面的“劫持机制”限制

在许多操作系统（Windows / macOS / Android）中，当代理软件开启“系统代理”模式时，浏览器或系统网络栈并不知道你开的是 Socks5/HTTP 代理。

系统的默认行为是：“我要连一个网站，必须先通过操作系统的网络协议栈把域名转成 IP，然后再把 TCP 流量交给代理软件。”

这就导致在流量进入 Clash 之前，操作系统自身就已经抢先向本地网络发起了 DNS 查询。

#### clash 系统代理配置

核心原理

```ini
[custom]
ruleset=DIRECT,[]GEOIP,CN,no-resolve
ruleset=🚀 节点选择,[]FINAL
```

当数据包匹配到 GEOIP,CN（中国 IP 库）时，如果访问的是一个域名，Clash 为了知道这个域名是不是国内 IP，会在本地悄悄发起一次 DNS 查询。这就瞬间导致了 DNS 泄露！

这段配置的做法：加上了 ,no-resolve，意思是“只匹配纯 IP 流量，如果是域名流量，直接跳过这条规则！绝对不许在本地查 DNS！”

既然删掉了 IP 查 DNS 的功能，那怎么分流呢？配置里的规则顺序非常考究：

精准域名直连：ChinaDomain.list、ChinaMedia.list 等文件里包含了成千上万个国内常用域名（如 .cn、baidu.com、qq.com）。匹配到了就安心走 DIRECT（直连）。

IP 纯直连：ChinaIp.list 和 GEOIP,CN,no-resolve 负责拦截软件/游戏的纯 IP 直连请求。

任何既不在国内域名列表里、又没被 IP 拦截的网站（比如你要访问的被墙/海外小众网站），都会一路下坠，直接撞进这最后一杠 FINAL！

结果：直接交给 🚀 节点选择 远端节点。本地不上网查 DNS，直接把原始域名丢给远端海外服务器去解析。

- 获取机场的订阅链接

- 通过 subconverter 转换地址

  subconverter 服务可以通过开源的 [subconverter-docker](https://github.com/tindy2013/subconverter/blob/master/README-docker.md) 搭建

- 获取转换后的链接，修改 config 路径，新 [ACL4SSR](https://raw.githubusercontent.com/noopn/ACL4SSR/refs/heads/master/ACL4SSR.ini) 地址 需要 `encodeURIComponent` 编码
  
- 将修改后的链接添加到 Clash 中使用

#### clash TUN 模式配置

多宿主异步 DNS 解析”（Smart Multi-Homed Name Resolution, SMHNR）

当系统需要解析一个域名时，它不会老老实实地只向“当前最主要的网卡”发请求，而是会同时向你电脑上所有的活动网卡（物理网卡、Wi-Fi、TUN 虚拟网卡等）绑定的 DNS 服务器同时发起并发请求。谁先返回结果，Windows 就用谁的结果，并把慢的那个丢弃。

在 TUN 模式下，为什么会瞬间导致泄露？

当你开启 Clash 的 TUN 模式时，系统里相当于多了一张“虚拟网卡”：你访问一个网站（比如 example.com）。

Windows 的 SMHNR 机制启动，同时做两件事：

向 TUN 虚拟网卡（Clash）发送 DNS 请求。

向 物理网卡（你家的局域网/电信联通网卡）绑定的本地 DNS（如 192.168.1.1 或 114.114.114.114）发送 DNS 请求。

物理网卡通常在本地局域网内，响应速度极快（可能只需几毫秒）。

结果：物理网卡抢答成功！本地运营商立刻收到了这个 DNS 查询，检测网站也成功抓包——DNS 泄露瞬间发生！

哪怕 Clash 策略组写得再严密，因为流量在还没进入 TUN 网卡之前，就被 Windows 系统层直接从物理网卡“偷溜”发了一份出去。

**在 TUN 模式配置中，确保开启了以下两项：**

stack: system 或 gvisor

auto-route: true

strict-route: true（严格路由模式）

💡 原理：开启 strict-route 后，Clash 会在 Windows 系统底层设置最高优先级的路由表和防火墙规则，强制丢弃/拦截所有从非 TUN 物理网卡直接发出的 DNS UDP/TCP 数据包，直接把 Windows 的抢答通道给断掉。

