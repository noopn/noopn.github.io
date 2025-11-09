---
layout: posts
title: nginx 证书自动续期
date: 2024-08-01 22:38:03
categories:
  - 其他
tags:
  - 证书
---

目标使用 acme.sh 提供的自动化工具实现证书自动续期。


#### updete 2025-11-05

安装, 参考 [acme.sh 官方文档](https://github.com/acmesh-official/acme.sh?tab=readme-ov-file#1-install-online)

自动 DNS Api 集成，准备对应 DNS 厂商的 [认证信息](https://github.com/acmesh-official/acme.sh/wiki/dnsapi)

> 注意 腾讯云 DNS 认证需要使用 DnsPod token, 而不是 Api key 

设置 DNS 厂商的环境变量, 以腾讯云为例：

```bash
export DP_Id="id"
export DP_Key="token"
```

执行生成证书命令

```bash

# 注意根域名必须填写，不填写自动化部署的时候会找不到路径
/root/.acme.sh/acme.sh --issue  --dns dns_dp -d '*.iftrue.me' -d 'iftrue.me' 
```

证书创建成功后使用自动化部署命令可以实现自动续期

```bash
# 使用以下命令，自动部署到 nginx 文件路径，在到期前会自动续期
/root/.acme.sh/acme.sh --install-cert -d *.iftrue.me  --key-file /etc/nginx/conf.d/_club.key --fullchain-file /etc/nginx/conf.d/_club.crt --reloadcmd "service nginx reload"
```


#### 域名授权/申请证书 (域名厂商)

整个过程参考 [ACME 自动化快速入门](https://docs.certcloud.cn/docs/edupki/acme/)

在 [https://freessl.cn/](https://freessl.cn/) 选择 ACME 自动化 注册账号并登录

首先添加域名并在购买的云服务器上验证，验证通过后申请证书。

选择相关域名后会提示申请证书命令。 例如：

```bash
bash /root/acme.sh/.acme.sh --issue -d <你的域名> --dns dns_dp --server https://acme.freessl.cn/v2/DV90/directory/xxxx-xxx
```

找到合适的目录执行脚本,证书文件会在当前执行目录中生成。 需要注意 .acme.sh 的路径是否可以访问， 如果无法找到该命令，可以切换为相对根路径的地址。

执行后会生成证书文件，如下

```bash
[Thu Aug  1 22:23:17 CST 2024] Your cert is in: /root/.acme.sh/home.iftrue.me_ecc/home.iftrue.me.cer             # 证书文件 对应 nginx 中 cert.pem
[Thu Aug  1 22:23:17 CST 2024] Your cert key is in: /root/.acme.sh/home.iftrue.me_ecc/home.iftrue.me.key         # 私钥文件 对应 nginx 中 cert.key
[Thu Aug  1 22:23:17 CST 2024] The intermediate CA cert is in: /root/.acme.sh/home.iftrue.me_ecc/ca.cer
[Thu Aug  1 22:23:17 CST 2024] And the full-chain cert is in: /root/.acme.sh/home.iftrue.me_ecc/fullchain.cer
```

#### 自动续期

执行 ACME 自动化快速入门中提示的脚本, 执行命令的位置需要在生成证书的路径下。

```bash
bash /root/acme.sh/.acme.sh --install-cert -d <你的域名>
--key-file /etc/nginx/conf.d/cert.key            # nginx 配置路径中证书的路径
--fullchain-file /etc/nginx/conf.d/cert.pem      # nginx 配置路径中私钥的路径
--reloadcmd "nginx -s reload"                    # 重启 nginx 命令
```

acme.sh 会在证书还有 30 天到到期时尝试自动续期。




