---
layout: posts
title: OpenWrt 安装与设置
mathjax: true
date: 2024-11-04 13:59:26
categories: 其他
tags:
  - OpenWrt
---

#### 下载固件

[OpenWrt](https://openwrt.org/) 官方版本，所有的第三方版本都是基于官方的自定义编译，
[immortalwrt](https://downloads.immortalwrt.org/) 是针对国内用户编译的第三方版本，推荐优先使用。[\[GitHub\]](https://github.com/immortalwrt/immortalwrt)

点击 All Downloads

![](001.png)

选择适配的 x86 版本

> SquashFS 和 Ext4 是两种不同的文件系统，各自有不同的特点和应用场景：
>
> - SquashFS 只读的文件系统，经过压缩后可以节省存储空间。默认情况下不支持直接写入，因此需要将可写数据放在单独的 Overlay 文件系统上。
> - Ext4 一种常用的可读写文件系统，支持动态修改。

![](002.png)

由于 OpenWrt 并不会将所有硬盘剩余空间作为根路径，因此不同的文件格式对应不同的磁盘组成，在安装后需要对根分区扩容。

- Ext4: `/boot` + `/`根分区(读写) + 剩余未分区磁盘
- SquashFS： `/boot` + `/rom`(只读) + `/`根分区(读写) + 剩余未分区磁盘 (优先选择此版本，方便迁移和系统恢复)

#### 安装

参考[官方安装文档](https://openwrt.org/docs/guide-user/installation/openwrt_x86#installation)，采用写入镜像文件方式，由于 OpenWrt 没有提供安装引导，所以需要用 [微 PE](https://www.wepe.com.cn/) 或 老毛桃[https://www.laomaotao.net/] 等工具制作一个 WinPE 启动盘, 将用到的固件，和固件写入工具保存到启动盘中，当进入 WinPE 系统后是用写入工具写入镜像。

> Windows Preinstallation Environment（Windows PE），Windows 预安装环境，是带有有限服务的最小 Win32 子系统，基于以完整 Windows 环境或者保护模式运行的 Windows 3.x 及以上内核。这类系统一般很小。它包括了运行 Windows 安装程序及脚本、连接网络共享、自动化基本过程以及执行硬件验证所需的最小功能。

另外需要下载一个镜像写入工具 [Win32 Disk Imager](https://win32diskimager.org/) 或 [balenaEtcher](https://etcher.balena.io/)

将镜像写入工具, 解压出的 OpenWrt 镜像(.iso)文件, 复制到制作好的 WinPE 启动 U 盘中。

![](003.png)

将 U 盘插入到软路由中(软路由需要接上鼠标，键盘，显示器)，开机时入到软路由的 BIOS，将默认的固态硬盘启动改为 U 盘启动。

![](004.png)

保存重启后，进入 WinPE 系统，首先使用 WinPE 自带的 DiskGenius 工具，删除软路由硬盘的所有分区并保存。打开写入工具，选择磁盘和镜像并写入。

![](005.png)

写入成功后，重启系统再次进入 BIOS,将 U 盘启动修改回硬盘启动，保存并再次重启。

启动成功后，会看见有命令行信息，如果卡住不动，尝试按一下回车键，这样会进入 OpenWrt 系统。

首次登录提示修改密码，执行 `passwd` 命令，修改 root 账户密码，此密码也是网页登录的密码。

![](006.png)

修改网络配置信息，执行命令 `vi /etc/config/network`,

将 config device 的 list_ports 修改为 eth1
将 interface lan 的 option ipaddr 修改为内网不会冲突的 IP 地址例如 `192.168.100.1` 或 `10.10.0.1`
将 interface wan 和 interface wan6 的 option device 修改为 eth0

> wan 口表示外网，也就是网络运营商的网线，通常更习惯将第一个网口作为插入外网网线，后面插入的都是内网设备，这样更有条理性

![](007.png)

保存后重启设备,访问前需要重新连接一下设备：

- 软路由插入电源并开机
- 运营商光猫的网线，链接到软路由的 eth0 网口。
- wifi 路由器需要在管理后台，设置为 AP 有线中继模式，用一个网线将软路由的 eth1 网口，链接到路由器的第一个网口。
- 其他内网设备可以通过网线连接软路由或路由器，也可以直接通过 wifi 网络链接.

这是虽然不能上网，单已经可以通过内网中其他设备访问 `/etc/config/network` 中设置的 lan 口的 ipaddr 访问到 OpenWrt 的 UI 界面。

#### pve 虚拟机安装

上传镜像文件到 pve， 创建虚拟机， 删除虚拟机的默认磁盘

```
qm importdisk [虚拟机ID] [镜像路径] [磁盘]

qm importdisk 4444 /var/lib/vz/template/iso/immortalwrt-24.10.3-x86-64-generic-squashfs-combined-efi__1_.img storage
```

虚拟机 => 硬件 添加未启用的磁盘
虚拟机 => 选线 修改刚刚添加的磁盘为第一启动项

#### wan 口配置

最先的配置一定是软路由可以上网，输入账号密码进入到软路由的 UI 界面，点击菜单 **网络** => **接口** 点击 wan 口的编辑按钮，协议切换为 PPPoE ，输入账号密码，即可上网。

> 此方式是通过 PPPoE 拨号上网，需要致电运营商，将网络改为桥接模式，并提供账号密码。

![](008.png)

#### lan 口配置

网络 => 接口 => 设备 选择 br_lan, 在网桥端口中将其他的端口都添加到 br_lan 这个网桥中，方便让局域网中的设备互相访问

#### 磁盘扩容

在菜单 **状态** => **概览** 中可以看到，磁盘空间只有几百 M, 这是因为 OpenWrt 默认不会将剩余空间作为根节点。

官方 openwrt 参考 [官方的扩容操作](https://openwrt.org/docs/guide-user/installation/openwrt_x86#expanding_root_partition)

immortalwrt 在安装前可以使用以下命令修改镜像的分区大小

```bash
# 将镜像文件扩容
dd if=/dev/zero bs=1M count=98304 >> immortalwrt-24.10.3-x86-64-generic-squashfs-combined-efi__1_.img

# 使用parted扩容文件系统

parted immortalwrt-24.10.3-x86-64-generic-squashfs-combined-efi__1_.img
GNU Parted 3.5
Using /var/lib/vz/template/iso/immortalwrt-24.10.3-x86-64-generic-squashfs-combined-efi__1_.img
Welcome to GNU Parted! Type 'help' to view a list of commands.
(parted) p
Error: The backup GPT table is corrupt, but the primary appears OK, so that will be used.
OK/Cancel? OK
Warning: Not all of the space available to
/var/lib/vz/template/iso/immortalwrt-24.10.3-x86-64-generic-squashfs-combined-efi__1_.img appears to be used, you can fix the GPT
to use all of the space (an extra 30 blocks) or continue with the current setting?
Fix/Ignore? Fix
Model:  (file)
Disk /var/lib/vz/template/iso/immortalwrt-24.10.3-x86-64-generic-squashfs-combined-efi__1_.img: 348MB
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags:

Number  Start   End     Size    File system  Name  Flags
128     17.4kB  262kB   245kB                      bios_grub
 1      262kB   33.8MB  33.6MB  fat16              legacy_boot
 2      33.8MB  348MB   315MB

(parted) resizepart 2 100%
(parted) q

```

immortalwrt 也可以安装后扩容

```bash
opkg update

opkg install fdisk lsblk losetup f2fs-toolsopkg install lsblk fdisk resize2fs losetup blkid f2fs-tools tree

# 查看磁盘信息
# df -h
# fdisk -l

# 替换为自己的磁盘
fdisk /dev/sda

# 查看磁盘
Command (m for help): p

Device         Boot  Start    End Sectors  Size Id Type
/dev/sda1            65536  98303   32768   16M 83 Linux
/dev/sda2            131072 745471  614400  300M 83 Linux

# 删除
Command (m for help): d
Partition number (1,2, default 2): 2

Partition 2 has been deleted.

# 新建磁盘 需要注意 sector 起始位置一定要与原有磁盘信息中 start 大小相同
Command (m for help): n
Partition type
   p   primary (1 primary, 0 extended, 3 free)
   e   extended (container for logical partitions)
Select (default p): p
Partition number (2-4, default 2): 2
First sector (2048-31268863, default 2048): 131072
Last sector, +/-sectors or +/-size{K,M,G,T,P} (131072-31268863, default 31268863):

Created a new partition 2 of type 'Linux' and of size 14.8 GiB.
Partition #2 contains a squashfs signature.


# 一定要选 n ，不要修改标识符
Do you want to remove the signature? [Y]es/[N]o: n

# 保存
Command (m for help): w
The partition table has been altered.
```

对文件系统扩容

```bash
losetup
# 记录 offset 的值
# NAME       SIZELIMIT  OFFSET AUTOCLEAR RO BACK-FILE  DIO LOG-SEC
# /dev/loop0         0 6291456         1  0 /mmcblk0p2   0     512

# 使用相同的 offset 创建一个临时的 循环设备
losetup -f -o 6291456 /dev/sda2

# 挂在这个设备以便于记录日志， 如果不挂在会导致不能访问
mount /dev/loop1 /mnt

# 卸载设备后可以执行扩容
umount /dev/loop1

resize.f2fs /dev/loop1
```

修改分区大小后会导致磁盘 UUID 改变，需要更新

```bash

blkid
# /dev/loop0: LABEL="rootfs_data" UUID="b32ce334-3193-428b-9ae3-2a156379ecc8" BLOCK_SIZE="4096" TYPE="f2fs"
# 记录 sda2 的新的 PARTUUID
# /dev/sda2: BLOCK_SIZE="262144" TYPE="squashfs" PARTUUID="ff2d03b0-3d06-4001-bb97-367a0265a03f"

vi /boot/grub/grub.cfg

# 修改对应的 PARTUUID 为最新值
# menuentry "ImmortalWrt" {
#         linux /boot/vmlinuz root=PARTUUID=484c7fc2-ae74-a97d-23da-c3b75cf79602 rootwait  console=tty1 console=ttyS0,115200n8 noinit
# }
# menuentry "ImmortalWrt (failsafe)" {
#         linux /boot/vmlinuz failsafe=true root=PARTUUID=484c7fc2-ae74-a97d-23da-c3b75cf79602 rootwait  console=tty1 console=ttyS0,1
# }


# 或者使用以下脚本更新
ROOT_BLK="$(readlink -f /sys/dev/block/"$(awk -e \
'$9=="/dev/root"{print $3}' /proc/self/mountinfo)")"
ROOT_DISK="/dev/$(basename "${ROOT_BLK%/*}")"
ROOT_DEV="/dev/${ROOT_BLK##*/}"
ROOT_UUID="$(partx -g -o UUID "${ROOT_DEV}" "${ROOT_DISK}")"
sed -i -r -e "s|(PARTUUID=)\S+|\1${ROOT_UUID}|g" /boot/grub/grub.cfg

# 最后重启
reboot
```

### 软件安装

#### docker

安装后菜单不显示，尝试退出系统重新登陆

```bash
opkg update
opkg install docker dockerd luci-app-dockerman
```

将 docker 区域设置为 lan 区域的目标区域，以便于可以在局域网中访问 docker 应用

![](0014.png)

#### ttyd

ttyd 是一个在线的命令行工具，安装 luci-i18n-ttyd-zh-cn 中文版本，会显示在系统菜单中，如果不显示重启设备。

#### passwall

安装 passwall 插件， **如果安装时提示 无法执行 opkg install 命令:SyntaxError: Unexpected end of JSON input 尝试更换其他的软件源再次尝试**

导入 x2ray 分享链接后，**一定要把节点配置中 \[域名\] 和 \[WebSocket Host\] 都设置为分享链接中的域名，并在基本设置中开启主开关，选择节点后才能使用**。如果配置正确还是不能使用，重新启动后再次使用。

![](0010.png)

#### DDns

由于家庭网络等外界因素，导致 IP 会不定时的修改，如果想要无论何时都能让 绑定的域名解析到当前 IP 上就需要 DDns 服务。

DDns 服务会定时在后台检测当前 IP 是否修改，如果 IP 已经发生变动，DDns 服务会发送请求通知域名服务商，重新绑定域名解析的 IP 地址，从而实现动态域名解析。

在 OpenWrt 软件库中安装 ddns-go 和 luci-i18n-ddns-go-zh-cn 软件包, 可以方便的选择常用的运营商进行配置。

启用 ddns-go 服务并打开 web 界面， 跳转到 [腾讯云 DNDSPOD](https://console.dnspod.cn/account/token/apikey) 创建密钥。

IPv4 中选择通过网卡获取 IP， 并添加域名。

![](0011.png)

在运营商的域名解析页面，添加一条记录，先默认填入软路由的内网地址。

![](0012.png)

点击保存可以看到域名已经被正确的解析

![](0013.png)

#### 外网访问内网应用

本设置的目的是使用不同的二级域名访问内网的各个应用，由于 OpenWrt 的防火墙只提供网络层的接口转发，而域名访问属于应用层，需要使用 nginx 作为反向代理工具代理域名请求并指向内网地址.[\[说明文档\]](https://openwrt.org/docs/guide-user/services/webserver/nginx)

完整的请求过程是，外网的 https 请求进入防火墙，防火墙放行 => 软路由配置 nginx 监听指定域名和端口的请求 => 转发请求到内网的其他服务器

- 在 **系统** => **软件包** 中安装 luci-nginx , 由于 luci-nginx 默认配置中包括强制将 http 重定向为 https 所以在软件安装后 OpenWrt 需要重新刷新登录。

  > 如果使用 ssh 工具登录时提示以下错误
  >
  > ```bash
  > [user@hostname ~]$ ssh root@pong
  > @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  > @    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @
  > @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  > IT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY!
  > Someone could be eavesdropping on you right now (man-in-the-middle attack)!
  > It is also possible that a host key has just been changed.
  > The fingerprint for the RSA key sent by the remote host is
  > 6e:45:f9:a8:af:38:3d:a1:a5:c7:76:1d:02:f8:77:00.
  > Please contact your system administrator.
  > Add correct host key in /home/hostname /.ssh/known_hosts to get rid of this message.
  > Offending RSA key in /var/lib/sss/pubconf/known_hosts:4
  > RSA host key for pong has changed and you have requested strict checking.
  > Host key verification failed.
  > ```
  >
  > 可以使用以下命令
  >
  > ```bash
  > # 移除 known_hosts 此 ip 的所有记录值
  > ssh-keygen -R 192.168.3.10
  > # 也可以使用
  > rm ~/.ssh/known_hosts
  > ```
  >
  > 如果使用的是 ttyd 插件，可以在 ttyd 配置中开启 ssl, 证书的默认路径是
  >
  > ```bash
  >   /etc/nginx/conf.d/_lan.crt
  >   /etc/nginx/conf.d/_lan.key
  > ```

  luci-nginx 使用 cui 统一了系统的配置，会通过 `/etc/config/nginx` 配置文件和模板文件(`/etc/nginx/uci.conf.template`) 生成 `/etc/nginx/uci.conf` 文件， `uci.conf` 文件最终会被 nginx 使用，并且 nginx 每次重启前都会重新生成此文件，因此不要手动更改生成的 `/etc/nginx/uci.conf` 文件中的内容。

  如果想要保持 http 访问可以修改 `/etc/config/nginx` 配置文件中的内容，注释掉 \_lan 和 \_redirect2ssl 添加一个新的配置 http_lan

  ```conf
  config main global
        option uci_enable 'true'

  #config server '_lan'
  #       list listen '443 ssl default_server'
  #       list listen '[::]:443 ssl default_server'
  #       option server_name '_lan'
  #       list include 'restrict_locally'
  #       list include 'conf.d/*.locations'
  #       option uci_manage_ssl 'self-signed'
  #       option ssl_certificate '/etc/nginx/conf.d/_lan.crt'
  #       option ssl_certificate_key '/etc/nginx/conf.d/_lan.key'
  #       option ssl_session_cache 'shared:SSL:32k'
  #       option ssl_session_timeout '64m'
  #       option access_log 'off; # logd openwrt'

  #config server '_redirect2ssl'
  #       list listen '80'
  #       list listen '[::]:80'
  #       option server_name '_redirect2ssl'
  #       option return '302 https://$host$request_uri'

  config server 'http_lan'
          list listen '80'
          list listen '[::]:80'
          #注意不要添加这个配置规则
          #因为限制了对nginx的访问地址为内网设备，会导致外网访问失效。
          #list include 'restrict_locally'
          list include 'conf.d/*.locations'
  ```

  使用命令 `service nginx reload` 重启 nginx, 这样就恢复了 http 访问

  > 重启过程中会提示错误, 可以按照提示使用 nginx -T -c '/etc/nginx/uci.conf' 命令测试配置文件
  >
  > ```bash
  > root@ImmortalWrt:~# service nginx reload
  > nginx_init: NOT using conf file!
  > show config to be used by: nginx -T -c '/etc/nginx/uci.conf'
  > ```
  >
  > 如果文件报错会提示具体错误，并指明所在位置

- 外网使用域名访问

  目前的网络环境是，外网使用 _.iftrue.me 访问， 内网使用 _.iftrue.me 访问， 因此配置好外网的访问端口后，可以直接把内网的请求转发到外网的监听端口

  首先配置外网域名解析， 在 cloudflare 选中域名 =》 DNS 添加一条 AAAA 解析， Name 填入 \* 表示泛域名， Content 地址临时填入一个 192.168.48.1 本地地址

  添加 DDNS GO 解析将域名同步到 cloudflare ， 需要添加一个 cloudflare Api token ， Overview =》Get your Api token =》create token =》 Edit zone DNS =》选择对应的域名， 在 DDNS GO 中添加 token, 并解析域名

  添加 cloudflare 规则， Rules =》 Overview =》 添加 Origin Rules =》 可以将对域名的请求转发到特定的端口

  创建一个 Origin Certificates 用于 Origin server 和 cloudflare 之间的验证， SSL/TSL => Origin Certificates, 保存 PEM 和 KEY

  修改 uci 模板 `/etc/nginx/uci.conf.template`,在 http 模块中添加 ssl 通用配置

  ```conf
  ssl_certificate /etc/nginx/conf.d/_lan.crt;
  ssl_certificate_key /etc/nginx/conf.d/_lan.key;

  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_prefer_server_ciphers on;
  ssl_session_cache shared:SSL:10m;
  ssl_session_timeout 10m;
  ```

  将证书传到服务器的执行目录下

  > 如果使用 scp 命令包错 `ash: /usr/libexec/sftp-server: not found`, 需要在软件包中安装 sftp-server

  配置一个反向代理的案例，/etc/nginx/conf.d/openwrt.conf

  ```conf
  server {
      listen      9348 ssl;
      listen [::]:9348 ssl;

      # qb.iftrue.me 用于内网域名的请求
      server_name qb.iftrue.me qb.iftrue.me;

      location / {
          proxy_pass http://192.168.48.189:10095;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;

          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "upgrade";
      }
  }
  ```

  最后需要防火墙放行外网请求，Incoming **Ipv6** from **Wan** to **this device** ,port **9348**

- 内网使用域名访问

  ~~给 openwrt lan 配置一个额外的 ip 用于转发，将 内网域名全部解析到此 ip， nginx 监听 443 端口，并将所有请求转发到外网的反向代理配置中~~

  Network =》 DHCP DNS =》 添加地址 /iftrue.me/192.168.48.3 把 *.iftrue.me 解析到 192.168.48.3

  ```conf
  # 添加一个默认规则，如果所有的都没有匹配走404
  server {
    listen 9348 default_server;
    listen [::]:9348 default_server;
    server_name _;

    return 404;
  }

  server {
      listen      443 ssl;
      listen [::]:443 ssl;
      server_name *.iftrue.me;

      ssl_certificate /etc/nginx/conf.d/_club.crt;
      ssl_certificate_key /etc/nginx/conf.d/_club.key;

      ssl_protocols TLSv1.2 TLSv1.3;
      ssl_prefer_server_ciphers on;
      ssl_session_cache shared:SSL:10m;
      ssl_session_timeout 10m;

      location / {
          proxy_pass https://192.168.48.1:9348;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;

          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "upgrade";
      }
  }
  ```

#### OpenVPN

软件包中安装 luci-app-openvpn-server

- 协议 udp ipv4
- 端口 1194
- 客户端网段： 自动
- 客户端推送配置
  comp-lzo adaptive
  redirect-gateway def1 bypass-dhcp
  dhcp-option DNS 192.168.48.1 （填写 openWrt 的 IP）
  route 192.168.48.0 255.255.255.0 （填写 openWrt 的 网段，最后一位需要是 0）
- 下载客户端配置文件，客户端安装 openvpn, 配置存放在 user/openvpn/client.opvn

> 可以重新生成证书文件，时间比较长，需要等待浏览器加载结束

点击网络接口，重新加载会多出一个 vpn0 的接口

编辑配置文件，允许多个客户端链接

```bash
vi /etc/config/openvpn

# 添加配置
option duplicate_cn "1"
```

配置 NAT 转发规则，允许访问内网设备，网络 => 防火墙 => NAT 规则

> openWrt 23.05.4 以及以后版本不需要配置

```bash
# 使用 POSTROUTING 进行规则转发
iptables -t nat -A POSTROUTING -o br-lan -j MASQUERADE
```

#### HomeProxy 自定义路由

配置文件路径

```bash
# homeproxy 
/etc/config/homeproxy

# singbox
/tmp/run/homeproxy/sing-box-c.json

```

- 创建路由节点，可以定义流量使用哪个 vpn 代理，一定要先设置，因为默认出站会用到这些节点。
  节点的出站选择**直接出站**

- 创建 DNS 服务

  标签: Google

  类型: HTTPS

  地址: dns.google

  路径: /dns-query

  端口: 443

  出站: 选择路由节点中最稳定的节点（BWG）

- DNS 设置

  默认策略: 仅 IPV4

  默认 DNS 服务器: Google

  Disable DNS cache: 不选

  Disable cache expire： 不选 

  Independent cache per server： 不选 

  EDNS Client subnet： 留空,国内网站（如淘宝、B站）：在匹配到国内规则后，系统会直接交给国内本地 DNS 进行解析，拿到的是离你物理位置最近的国内 CDN，根本不会去触发 Google DoH。国外网站（如 Google、YouTube）：这些流量本来就需要走代理节点出口。
  
  这些网站的 CDN 节点必须通过你的代理节点去访问。如果你在 DoH 里填了国内 IP，Google DoH 会给你返回一个离中国大陆最近的 CDN IP；但当你实际去连接这个 CDN 时，流量却是从你的海外代理节点发出的。这会导致“节点在美西，却强行去连分配给中国的 CDN”，造成跨国绕路，速度反而变慢。

  Store RDRC： 不选，是否保存被拒绝的DNS

- 路由设置

  路由模式: 自定义路由

  绕过国内流量: 开启，可以在防火墙就直接转发国内流量，性能更好

  复写目标地址: 一般用于视频网站解锁，Google DNS 获取到了目标 IP，sing-box 通过嗅探获取到了 netflix 域名，发送的目标是代理服务器，发送数据中的内容为请求 netflix 的 IP 以及 netflix 网站的域名，当代理受到这个请求后发现当前服务器不支持解锁，导致访问失败
  开启复写后，发送数据中的目标地址变为 netflix 域名，当发送到代理服务器后会在代理服务器的环境中做 DNS 解析， 它获取到的不是真实 IP, 而是专门的反代服务器 IP 用于解锁。

  默认出站: 选择路由节点中最稳定的节点（BWG）

  默认 DNS 出站： Google

- 规则集

  https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/sing/geo-lite/geoip/cn.srs 国内 ip
  https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/sing/geo-lite/geosite/cn.srs 国内网址
  https://raw.githubusercontent.com/xmdhs/sing-box-ruleset/rule-set/AdGuardSDNSFilterSingBox.srs 广告网址

  出站选择默认，这会使用路由设置中的默认出站用于访问这些资源。

- 路由规则

  直连，选择国内的两个规则集
  内网设备，可以通过 IP 来指定一个路由规则，以便于在出站时使用其他的代理 vpn
  **独立的设备需要独立的路由规则，因为路由规则是和的关系，如果同时选择了规则集和源IP，他的意思是同时满足才能生效，因此需要为想要直连的域名和IP，单独设置一个路由规则，以及DNS解析规则**
  **Host/ip fields 每个字段可以多选他们之间是或的关系，但是如果同时写了IP，IP和域名之间是和的关系**

- DNS 规则

  Block，选择广告的资源集，在 DNS 解析的时候就禁止访问
  直连，选择国内的域名规则集，DNS 服务器选择 WAN 自动下发的 DNS 服务，这样当请求一个国内的域名时，可以直接用运营商的 DNS 解析
  **不能通过使用DNS规则来指定IP是否通过代理做DNS解析，因为DNS首先会被dnsmasq拦截，并修改为本地地址，无法与指定的设备IP匹配，所以一定会走代理做DNS解析**

##### homeproxy 匹配规则字段解释

**域名匹配类 (Domain)**

- Domain name (匹配完整域名)

含义： 绝对精准匹配，一字不差。

例子： 填入 [www.google.com](https://www.google.com)。那么只有访问 [www.google.com](https://www.google.com) 才会命中该规则。访问 google.com 或 mail.google.com 都不会命中。

- Domain suffix (匹配域名后缀)

含义： 匹配该域名及其所有的子域名。这是最常用的规则。

例子： 填入 google.com。那么 google.com、[www.google.com](https://www.google.com)、mail.google.com 都会被匹配。

- Domain keyword (域名关键字匹配)

含义： 只要域名中包含这个词段，就会被匹配。

例子： 填入 google。那么 google.com、google.co.jp 甚至 google-analytics.com 都会被匹配。

- Domain regex (使用正则表达式匹配域名)

含义： 使用正则表达式（Regex）编写复杂的匹配逻辑。

例子： 填入 .*\.cn$。这代表匹配所有以 .cn 结尾的域名。


**来源设备匹配类 (Source IP)**,这部分是根据“是谁在发请求”（即你局域网内的设备）来进行匹配。

- Source IP CIDR (匹配源 IP CIDR)

含义： 匹配局域网内特定设备或特定网段发出的请求。手动精准点名。你必须手动输入一个具体的 IP 或网段。

例子：填入 192.168.1.50/32：只匹配 IP 为 192.168.1.50 的这一台设备（比如你的某台特定测试机或 LXC 容器）。

填入 192.168.2.0/24：匹配 192.168.2.x 这个整个网段（比如你给访客或者 IoT 智能家居专门划的 VLAN）。

- Match private source IP (匹配私有源 IP)

含义： 只要这个请求是从一个私有地址（局域网地址，如 192.168.x.x, 10.x.x.x）发出的，就匹配。不用填具体的 IP,自动包含上面提到的所有 10.x、172.16.x、192.168.x 地址。

场景： 通常用于做全局的底层兜底规则，确认流量是来自内网的合法设备。

**目标地址匹配类 (Destination IP)**

当请求没有域名（直接请求 IP ），或者 DNS 解析后，Homeproxy 根据“你要访问哪台服务器的 IP”来进行匹配。

- IP CIDR (匹配 IP CIDR)

含义： 匹配请求要去的目的 IP 或目的 IP 段。

例子： 填入 Telegram 的服务器网段 91.108.4.0/22。只要流量去往这个 IP 段，就会被该规则捕获。

场景： 用于强制特定 App（比如 Telegram、或者某些直接通过 IP 连接的游戏服务器）走特定代理。

- Match private IP (匹配私有 IP)

含义： 只要你要访问的目的 IP 是私有地址（如局域网内的其他设备 192.168.1.100）。

场景： 极度重要，通常这条规则的动作会被设置为 “直连 (Direct)”。这确保了当你在电脑上访问家里的 NAS 或 OpenWrt 后台时，流量不会绕到国外的代理服务器上去，而是直接在局域网内通信。

#### WireGuard 

安装 luci-proto-wireguard  qrencode

Netword =》 Interfaces =》新建协议 Wireguard Vpn

通用设置 =》 生成新的密钥对 =》 添加监听端口 =》Ip 地址选择一个与内网不冲突的网段 10.0.6.0

防火墙设置 =》 加入 lan 区域

对端设置 =》 创建新的密钥对 =》ip 地址选择一个网段内的 ip =》生成二维码 =》修改链接地址为配置了 DDNS 的域名 =》扫描二维码或复制配置添加

#### 通过API动态修改配置

安装 `opkg install luci-mod-rpc` 

```bash
# 1.获取token
curl -X POST "https://home.iftrue.club/cgi-bin/luci/rpc/auth" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc": "2.0", "id": 1, "method": "login", "params": ["root", "w.521@@ong.COM"]}'
# {"id":1,"jsonrpc":"2.0","result":"365cdca3fabb0f374d8fd32dccdcc5a4"}

# 2.uci set
curl -X POST "https://home.iftrue.club/cgi-bin/luci/rpc/uci?auth=a26617f574899578c20bd34f2b272af2" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc": "2.0", "id": 1, "method": "set", "params": ["homeproxy", "MSI", "outbound", "SG"]}'
# {"id":1,"jsonrpc":"2.0","result":true}

# 3.确认/保存配置 (uci commit)
curl -X POST "https://home.iftrue.club/cgi-bin/luci/rpc/uci?auth=a26617f574899578c20bd34f2b272af2" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc": "2.0", "id": 3, "method": "commit", "params": ["homeproxy"]}'
# {"id":3,"jsonrpc":"2.0","result":true}

# 4.重启 Homeproxy 让代理生效(如果 commit 后不能正常生效则需要)
curl -X POST "https://home.iftrue.club/cgi-bin/luci/rpc/sys?auth=a26617f574899578c20bd34f2b272af2" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc": "2.0", "id": 4, "method": "exec", "params": ["/etc/init.d/homeproxy restart"]}'
# {"id":4,"jsonrpc":"2.0","result":""}
```

#### sing-box 日志格式

路由规则

电脑 192.168.48.228 试图连接外网 IP 142.251.150.119 的 443 端口。

流量被 HomeProxy 的虚拟网卡（tun-in）捕获。因为是物理层捕获，源 IP 192.168.48.228 被完美保留。

触发路由规则匹配！你之前改的 /32 发挥了神级作用：内核精准比对 match[4] source_ip_cidr=192.168.48.228/32，然后执行了动作 route(direct-out)（路由至直连出站）。


```bash
INFO [...] inbound/tun[tun-in]: inbound packet connection from 192.168.48.228:63104
INFO [...] inbound/tun[tun-in]: inbound packet connection to 142.251.150.119:443
DEBUG [...] router: match[4] source_ip_cidr=192.168.48.228/32 => route(direct-out)
INFO [...] outbound/direct[direct-out]: outbound packet connection
```

DNS 规则

```bash
INFO [...] inbound/direct[dns-in]: inbound packet connection from 127.0.0.1:33948
DEBUG [...] router: match[0] inbound=dns-in => hijack-dns
DEBUG [...] dns: exchange ysic5b9j79oc.dns4.browserleaks.net. IN A
... (匹配 CN_SITE 失败) ...
INFO [...] outbound/vless[cfg-d020dc...]: outbound connection to dns.google:443
```

第一重剥夺（源 IP 变成 127.0.0.1）：
当 228 电脑在浏览器敲下域名时，它是向 OpenWrt 路由器（网关）查询 DNS 的。路由器的 Dnsmasq 服务接收了这个请求，然后转手交给了 HomeProxy。
日志第一行：connection from 127.0.0.1。这就是 Dnsmasq 在作祟，它把你的电脑 IP 洗掉了，以路由器自己的名义（本地回环 127.0.0.1）向 Sing-box 提问。

第二重错位（规则彻底失效）：
Sing-box 拿到这个查 browserleaks.net 的请求，开始检查 DNS 规则：

属于广告吗？不是。

属于 CN_SITE 吗？不是。

源 IP 是 192.168.48.228 吗？Sing-box 一看，发件人是 127.0.0.1 啊，不匹配！直接跳过这条规则！

第三重流放（发往 Google 并套上代理）：
因为所有规则都没命中，Sing-box 启用了全局兜底 DNS（Default DNS server: Google）。
Google DNS 节点配置的是 outbound 'BWG'。于是，这个 DNS 查询包被丢进了 Vless 代理隧道，跑到国外去查 IP。

#### 拦截/禁用 手机移动设备的IPv6流量

为什么图形化界面的“IP 规则”行不通？
因为 IPv6 的设计初衷就包含“隐私扩展（Privacy Extensions）”。你的手机不会只有一个固定的 IPv6 地址，系统会不断生成随机的、临时的 IPv6 地址去访问外网（比如 YouTube）。
代理软件的 UI 控制面板是工作在 L3（网络层） 的，它只能认 IP。当手机的 IP 像万花筒一样变来变去时，你根本无法在 HomeProxy 的 UI 里写死一条规则去逮住它。要想锁定这台物理设备，只能降维到 L2（数据链路层），也就是咬死它永远不变的 MAC 地址。

为什么 OpenWrt 自带的“防火墙 (Traffic Rules)”也防不住？
这是 TUN 模式的霸道之处。普通防火墙的“丢弃”动作，通常发生在 forward（转发）阶段。
但是，TUN 模式为了接管所有的全局流量，它必须在流量刚进入路由器大门的 prerouting 阶段，就利用内核规则（fwmark）把流量强行“拐”进虚拟网卡里。
也就是说，流量还没走到 OpenWrt 的常规防火墙，就已经被 HomeProxy 劫持上车了。

为什么你写的这四行代码是真正的“最佳实践”？
你刚才执行的这四行命令，完美避开了所有陷阱，在架构上非常优雅：

新建独立表 (custom_mac_block)：OpenWrt 的原生防火墙每次重启网络都会清空并重建名叫 fw4 的表。你建了一个名字不叫 fw4 的独立表，这意味着无论 OpenWrt 怎么抽风重载防火墙，你的规则都稳如泰山。

超高优先级 (priority -300)：Linux 内核处理 prerouting 是按优先级排队的。数字越小，越先执行。HomeProxy 的劫持规则优先级通常是 -150 左右。你设置了 -300，意味着你的规则像是一个站在 HomeProxy 前面的安检员——只要看到这个 MAC 地址的 IPv6，当场击毙（drop），HomeProxy 连劫持的机会都没有。

打开 System（系统） -> Startup（启动项） -> Local Startup 处。复制粘贴到 exit 0 的上方

```bash
# 1. 创建一个独立的规则表（Table）
#    - inet: 同时作用于 IPv4 和 IPv6 两个协议栈。
#    - custom_mac_block: 自定义的表名称。独立于系统自带的 "fw4" 表，
#      这样可以防止 OpenWrt 系统防火墙在重载或网络重启时将你的规则意外清空或覆盖。
nft 'add table inet custom_mac_block'

# 2. 清空该独立表中的所有历史规则（Flush）
#    - 确保在脚本多次执行（例如手动调试或系统反复触发启动脚本）时，
#      避免产生重复堆叠的链或规则，保持规则库处于干净的初始状态。
nft 'flush table inet custom_mac_block'

# 3. 在该表中创建一条专用的路由前处理链（Chain）
#    - type filter: 声明该链的作用是“过滤/拦截数据包”，而不是做 NAT 地址转换。
#    - hook prerouting: 将检查点挂载在“路由前”，即数据包刚从网卡进入路由器的第一站。
#    - priority -300: 设置极高的执行优先级（数值越小越优先）。
#      HomeProxy/TUN 等透明代理的劫持通常发生在 -150 左右，设置为 -300 可以确保
#      此规则抢在连接跟踪（Conntrack）以及一切代理劫持之前优先执行。
#    - policy accept: 默认策略为放行，确保未匹配到拦截规则的其他设备流量正常通过。
nft 'add chain inet custom_mac_block prerouting { type filter hook prerouting priority -300; policy accept; }'

# 4. 向链中插入具体的匹配与拦截规则（Rule）
#    - ether saddr 48:BC:E1:15:BA:E2: 在数据链路层（L2）精准匹配数据包发送端的源 MAC 地址。
#    - meta nfproto ipv6: 进一步过滤协议族，限定只匹配该设备发出的 IPv6 流量（放行其 IPv4）。
#    - drop: 立即丢弃匹配到的数据包。
#      此时该手机的 IPv6 数据包在进入系统的一瞬间被直接丢弃，代理插件完全无法捕获它，
#      从而强迫手机降级使用 IPv4 通信。
nft 'add rule inet custom_mac_block prerouting ether saddr 48:BC:E1:15:BA:E2 meta nfproto ipv6 drop'
```

配置后重启 OpenWRT

#### 域名直连

cloudflare 的域名即使设置了直连，流量仍然会绕过了域名直连规则，直接被送入 VLESS 代理节点。

```bash
DEBUG router: attempt to sniff fragmented QUIC client hello
DEBUG router: match[4] source_ip_cidr=192.168.48.228/32 => route(cfg-d020dc103a6e0e955b66e1a610dd1cbb-out)
```

**因为 cloudflare 接受 http3 请求**

浏览器并不会在第一次访问任何网站时，都像无头苍蝇一样盲目去试探 UDP 443 端口。它之所以知道 xyz.com（Cloudflare 节点）支持 HTTP/3，并且主动发起 QUIC 连接，是因为服务器提前“告诉”了浏览器。

第一种：当你在浏览器输入 xyz.com 按下回车时，浏览器不仅仅去查了 A 记录（IPv4），它还会同时去查一种叫 HTTPS (Type 65) 的特殊 DNS 记录。


```bash
dns: exchanged HTTPS xyz.com. ... alpn="h3,h2" ... ech="..."
```

alpn="h3,h2"：这个字段叫做应用层协议协商（ALPN）。Cloudflare 的 DNS 服务器在这里明确告诉 Chrome/Edge 浏览器：“兄弟，我这个网站不仅支持传统的 HTTP/2 (h2)，我还支持最新的 HTTP/3 (h3)！”

浏览器一拿到这个 DNS 答复，立刻心领神会，直接绕过传统的 TCP 握手，首选发起 UDP 443 的 QUIC 连接。

第二种： 如果 DNS 没有查到 HTTPS 记录，浏览器第一次访问该网站时会老老实实走 TCP 443 发起 HTTP/2 请求。

但 Cloudflare 在返回网页数据时，会在 HTTP 响应头里悄悄塞入这样一行代码：

```bash
Alt-Svc: h3=":443"; ma=86400
```

这句话的意思是：“备用服务（Alternative Service）：我其实在 UDP 443 端口也开了 HTTP/3 服务，这个情报有效期是 86400 秒（一天）。”

浏览器收到后会把这个信息存入本地的 Alt-Svc 缓存。当你下一次再访问这个网站，或者请求该网站上的图片包时，浏览器查了一下记忆，就会直接用 HTTP/3 发起 UDP 请求。

而恰恰是时使用 http3 导致了嗅探出了问题。

浏览器默认使用 HTTP/3 (QUIC / UDP 443) 发起请求。UDP 数据包发生了分片（Fragmented），导致 Sing-box 在数据刚进入软路由的第一瞬间，无法立刻嗅探出明文域名。域名匹配规则（Direct_Domain）瞬间失效，流量向下穿透，命中了“电脑 IP 走代理”规则。

**什么是“嗅探（Sniffing）”？嗅探在解决什么问题？（“丢失的域名”问题）**

想象一下你去邮局寄信：

传统代理（比如浏览器插件）： 你直接走到柜台对业务员说：“我要把这封信寄给 张三（xyz.com）。” 代理软件清清楚楚地知道你要访问的域名。

透明代理（TUN 模式）： 你的电脑变成了一个自动分拣机。当浏览器想访问 xyz.com 时，它会先查 DNS 得到 IP（104.21.63.88），然后把信装进一个盒子里，盒子上只写了目标地址（IP）和门牌号（端口 443）。

当这个盒子流进软路由（Sing-box）时，软路由看到的是：源 IP 192.168.48.228 -> 目标 IP 104.21.63.88:443。

致命问题来了：现在的网站绝大多数都挂在 CDN（比如 Cloudflare）后面，一个 IP 背后可能藏着几百万个不同的网站。此时，软路由拿着你的 Direct_Domain（直连域名）规则表，却看着数据包上的 IP 发呆——它根本不知道你到底要访问哪个域名，域名规则彻底瘫痪。

嗅探的实现原理（“拆包验货”）

为了拯救失效的域名规则，代理软件发明了“嗅探（Sniffing）”技术。也就是深度包检测（DPI, Deep Packet Inspection）。

原理：虽然数据包外面只写了 IP，但里面装的“信件内容”在建立连接的第一句话里，往往会自报家门。

TLS 握手（HTTPS）：当你访问 HTTPS 网站时，发出的第一个数据包叫 Client Hello。在这个包里，有一个没有被加密的字段叫 SNI（Server Name Indication，服务器名称指示），里面明文写着你要访问的域名（例如 xyz.com）。

嗅探动作：Sing-box 像海关一样，用极快的速度拆开第一包数据的外包装，往里面“闻一闻”（Sniff），精准提取出 SNI 字段里的 xyz.com。”

接着，Sing-box 把找回来的域名丢给路由引擎，瞬间命中你的直连规则。

**为什么“分片（Fragmentation）”会导致嗅探失败？什么是数据包分片？**

网络世界里有一条规定叫 MTU（最大传输单元），绝大多数网络的 MTU 是 1500 字节。也就是说，网络上跑的“快递盒子”最大只能装 1500 字节的数据。
如果你寄的信太长（比如 2000 字节），操作系统就会把它撕成两半，装进两个盒子里（包 1 和 包 2），分开发送。这就叫分片。

**为什么 QUIC（UDP）特别容易遇到分片？**

传统的 HTTPS 走的是 TCP。TCP 有一套非常完善的协商机制，通常会把 Client Hello 控制在一个包的尺寸内。
但 QUIC 走的是 UDP 协议，且结合了 TLS 1.3。现代的 QUIC Client Hello 里塞满了各种复杂的信息（加密扩展、ECH 密钥、甚至抗量子密码学数据），体积很容易膨胀到 超过 1500 字节。
结果就是，QUIC 的第一句问候语，经常被无情地劈成了两个 UDP 包。

为什么分片是嗅探的“死穴”？（盲人摸象的困境）当 QUIC 发生分片时，对 Sing-box 的嗅探器来说，简直是灾难：

情景再现：浏览器把包含了 SNI (xyz.com) 的巨大包拆成了两半。

包 1（前 1500 字节）：包含了协议头、乱七八糟的扩展数据，但唯独没有 SNI 域名。

包 2（剩下的字节）：这里面才藏着 SNI 域名。

嗅探器的规则：代理软件处理网络流量必须是极速、毫秒级的。当包 1 到达时，路由引擎必须立刻决定它该走代理还是直连，它不能等。

失败时刻：Sing-box 拆开包 1 找了一圈，发现没有域名。如果它为了等包 2 把包 1 扣留下来，不仅会极大地增加延迟，还可能因为 UDP 会乱序到达而导致内存溢出和逻辑崩溃。

所以，Sing-box 只能无奈放弃：“嗅探不到域名，不等了，按 IP 规则走吧！” 于是，这股流量就因为没有域名，漏过了你的直连规则，被塞进了你的 VLESS 代理出站。

浏览器默认使用 HTTP/3 (QUIC / UDP 443) 发起请求。UDP 数据包发生了分片（Fragmented），导致 Sing-box 在数据刚进入软路由的第一瞬间，无法立刻嗅探出明文域名。域名匹配规则（Direct_Domain）瞬间失效，流量向下穿透，命中了你的“电脑 IP 走代理”规则。

解决办法： 在路由规则最顶部添加一条 拦截 UDP 443 的规则（Action: Reject），强迫浏览器瞬间回退到传统且稳定的 TCP (TLS 1.3) 握手。新建路由规则： 

Protocol： 不填
Network： UDP
Port:  443
Action: reject     勾选 Don't drop packets

接下来 UDP 被成功拦截转为 TCP 后，日志中不再提示分片，但嗅探域名的那行日志彻底消失了，流量依然走向了 VLESS 节点。

```bash
dns: exchanged HTTPS xyz.com. ... ech="AEX+DQBBIgAgACDOtQ305..."
router: match[5] source_ip_cidr=192.168.48.228/32 => route(cfg-...-out)
```

ECH（Encrypted Client Hello，加密客户端问候） 是现代 TLS 1.3 协议的一项关键扩展扩展标准（由 IETF 推进），也是 HTTPS 隐私保护演进历程上的“最后一块拼图”。

**ECH 是为了解决什么问题？**在没有 ECH 之前，虽然整个互联网已经普及了 HTTPS，但仍然存在一个巨大的隐私漏洞：

HTTPS 加密的死角：
当你访问 xyz.com 时，网页正文、账号密码、搜索记录确实都被高强度加密了。
但是，在加密握手的第一步（Client Hello）中，你的电脑必须用明文发送 SNI 字段（也就是 xyz.com） 给服务器。

引发的安全与审查问题：隐私泄露： 链路上的网络运营商（ISP）、公司网管、公共 Wi-Fi 运营者，只要抓包就能一清二楚地知道你今天访问了哪个域名。
SNI 阻断（审查/封锁）： 防火墙不需要解密你的数据内容，只要在看到那包明文的 xyz.com 时向你发一个伪造的 TCP RST（重置连接），就能精准切断你的访问。

ECH 的核心使命：把 Client Hello 中原本明文裸奔的 SNI（域名）以及其他敏感协商参数，从第一行开始彻底加密。

**ECH 的核心实现原理,这里有一个经典的密码学“先有鸡还是先有蛋”的悖论：**

客户端发出的第一个包必须加密，但此时客户端和服务器还没有建立连接，根本没有协商过密钥，客户端用什么密钥来加密这个握手包？ 

ECH 巧妙地借助了 DNS（域名系统） 来完成“前置密钥分发”，其整体流程分为以下三步：

前置步骤：通过 DNS 获取公钥（DNS 提前下发“保险箱密码”）

网站（例如 Cloudflare 托管的站点）在权威 DNS 上配置了 HTTPS (Type 65) 记录。

这条记录里包含了一个 echConfig 字段（也就是你之前在日志里看到的 ech="AEX+DQBBIgAgACDOtQ30..."）。

这个字段里包含了服务器公开发布的 ECH 临时公钥（Public Key） 和加密套件信息。

当浏览器发起 DNS 查询时，提前拿到了这个公钥。

发起连接：制造“双层洋葱包”（Inner & Outer Client Hello）

浏览器拿到公钥后，构建一个非常特殊的 Client Hello 数据包，它被设计成“内外两层”：

内层（Inner Client Hello，真实数据）：

里面写着真实的域名（SNI = xyz.com）、真实的 ALPN 协商等信息。

浏览器用刚刚从 DNS 拿到的公钥，使用 HPKE（混合公钥加密算法）将整个内层深度加密成一串乱码。

外层（Outer Client Hello，伪装外壳）：

里面放着一个公开的、公共的诱饵域名（例如 SNI = cloudflare-ech.com）。

把上面加密好的“内层乱码”作为扩展字段塞在外层里面。握手通信：中间人失明，CDN/服务器解密 中间人（软路由、运营商、防火墙）：

抓包只能看到外层的伪装域名 cloudflare-ech.com，看不到你真正要去哪个网站；

如果中间人试图解密内层乱码，由于没有服务器的私钥，只能看到一堆毫无意义的二进制流。

目标服务器（Cloudflare 边缘节点）：

服务器收到包后，用自己底层的私钥解密内层的乱码，提取出真实的 xyz.com；

随后直接使用内层参数继续与客户端完成后续的标准 TLS 1.3 握手。

**为什么 ECH 会导致软路由透明分流失效？**

在软路由开启 TUN 模式并做基于域名的规则分流时，软路由充当的其实就是通信链路上的一个“中间人设备”。

软路由嗅探的依赖条件： 软路由想要知道流量是去往国内直连还是国外代理，必须在 TCP 刚连接时看到明文的 SNI 域名。

ECH 的防范对象： ECH 防范的就是一切中间人，软路由作为中间人自然也没有 Cloudflare 的私钥，无法解密那一串 ECH 乱码。

分流破产： 软路由提取不到真实的 xyz.com，只能看到外层的公共伪装域名或者直接看不到域名，最终导致基于真实域名的分流规则（Direct_Domain）无法命中。

对于走代理的流量（比如通过 VLESS 节点的流量），无论你开不开启 ECH，运营商从始至终都绝对不可能看到你访问的真实内容，甚至连你访问的真实域名是长是短都看不见。

数据是如何被“双重打包”的？（洋葱模型）如果你的电脑发起了访问（假设启用了 ECH），它在经过你的软路由并流向运营商公网时，经历的过程如下：

电脑端产生原始请求（第一层加密）

数据内容：HTTP 网页正文用 TLS 1.3 对称密钥加密。

域名（SNI）：通过 ECH 用 Cloudflare 的公钥加密成了乱码。

状态：此时整个原始 TCP 连接对内网来说已经是一团看不懂的数据。

软路由把整个连接装进“VLESS / Reality 胶囊”（第二层外壳）

当软路由决定将这个请求送入代理出站时，它不会把原始数据包直接扔给运营商。

软路由会建立一条连接到你的海外 VPS 的专用隧道。

它把第 1 步里电脑产生的全部数据（包括 IP 目标、端口、加密后的 ECH 内容、网页数据）当成普通的货品，全部塞进 VLESS 协议的载荷（Payload）里。

接着，Reality 协议启动：软路由用真实的苹果证书（swscan.apple.com）和公钥，为整条外层隧道重新套上一层天衣无缝的 TLS 握手。

运营商（ISP）和防火墙在光纤里看到的画面

源地址：你家的公网 IP。

目的地址：你的 VPS。

SNI 域名：swscan.apple.com（苹果服务）。

数据流：符合标准 TLS 1.3 规范的随机加密字节流。

内部是否开 ECH，只影响软路由内部能不能“偷窥”到真实域名（以便做本地分流）。

在 DNS 规则中，增加了一条 拦截 HTTPS (Type 65) 记录 的策略，彻底废掉 ECH，逼迫浏览器交出明文域名。

Query type : HTTPS
Action : Reject 开启 Don't drop requests

浏览器访问网站前，会向软路由同时发起两种 DNS 查询：

A / AAAA 记录：查询网站对应的 IPv4/IPv6 地址。

HTTPS 记录 (Type 65)：查询网站是否支持 HTTP/3 以及 获取 ECH 公钥配置 (echConfig)。

软路由的 DNS 规则命中拦截策略（query_type=HTTPS => reject），直接拒绝并返回空/错误响应。

结果：浏览器顺利拿到了目标服务器的 IP 地址，但彻底没有拿到任何 ECH 加密公钥。

自动优雅降级（握手阶段）：

IETF 官方的 ECH 规范（RFC 9484）中有着明确的容错设计：“当客户端未能通过 DNS 获取到合法的 ECHConfig 时，必须自动降级并回退到标准的 TLS 握手。”

浏览器发现没有公钥可用，无法组装加密的“双层洋葱包（Inner Client Hello）”，只能老老实实组装最传统的标准 Client Hello 数据包。

当降级为标准 TLS 握手后：

浏览器发出的第一个握手包中，SNI 字段恢复为未经加密的明文域名（例如 xyz.com）。

软路由的 DPI 嗅探引擎（Sniffer）在毫秒级内轻松拆解读取出该域名。

流量顺利命中你配置的 Direct_Domain 规则，被直接导向本地宽带直连出站（direct-out）。

常见同级 DNS 记录类型对比

| 记录名称  | 类型编号 (Type ID) | 主要职责与内容                                                        |
| :-------- | :----------------- | :-------------------------------------------------------------------- |
| **A**     | Type 1             | 将域名解析为 IPv4 地址（如 104.21.63.88）                             |
| **CNAME** | Type 5             | 域名别名指向另一个域名                                                |
| **MX**    | Type 15            | 指定域名的邮件服务器地址                                              |
| **TXT**   | Type 16            | 携带文本元数据（常用于域名所有权验证、SPF 反垃圾邮件）                |
| **AAAA**  | Type 28            | 将域名解析为 IPv6 地址（如 2606:4700::）                              |
| **SVCB**  | Type 64            | 通用服务绑定记录（Service Binding）                                   |
| **HTTPS** | Type 65            | 专为 HTTP/HTTPS 定制的增强服务绑定记录（包含 ALPN、ECH 密钥、端口等） |



#### 流量分载（Flow Offloading）

UI 界面里的流量分载（通常基于 Linux 内核的 nftables/flowtable）：

工作机制：

当客户端建立一条 TCP/UDP 连接后，前几个握手包依然正常走 OpenWrt 的防火墙。

一旦连接状态确认建立（ESTABLISHED），系统就会把这条流写入一个快速旁路表（Fastpath/Flowtable）。

后续所有属于该连接的数据包，在到达网卡后直接跳过 Netfilter/iptables 的常规规则链（如 PREROUTING、POSTROUTING、OUTPUT），直接从目标网口转发出去。

设为 NO（关闭）的影响：

所有数据包都必须老老实实通过 Netfilter 的完整检查，CPU 会多消耗微不足道的算力（在 N100 上几近无感）。

好处：透明代理规则（TPROXY/REDIRECT）、QoS 流量队列、连接统计、防 DNS 泄漏机制等均能 100% 捕获并处理每一个数据包，不会出现规则失效或旁路漏包。


ethtool 查看到的各项参数属于 L2/L3 物理网卡硬件级加速（负责“帮 CPU 减轻打包/算校验和的体力活”）；而 UI 界面里的流量分载属于 L3/L4 路由器防火墙路由流表加速（负责“跳过防火墙规则直接抄近道转发”）。

```bash


ethtool -k eth2 | grep -E "tcp-segmentation-offload|generic-receive-offload|receive-checksumming|tx-checksumming"

# tx-checksumming: on
# tcp-segmentation-offload: on
# generic-receive-offload: on
```

输出显示为 on，说明物理网卡（如 Intel i226）的硬件加速机制正常工作中：

tx-checksumming: on（发送端校验和硬件卸载）

传统做法：CPU 在发包前，必须把数据包每一个字节加一遍算出一个校验和（CRC/Checksum），非常消耗 CPU 周期。

开启后：CPU 把原始数据直接扔给网卡，网卡芯片内部的专用硬件电路在发送数据瞬间自动把校验和算好并填入包头。

tcp-segmentation-offload: on（TSO，TCP 分段卸载）

传统做法：如果系统要发送一个 64KB 的大文件块，CPU 必须自己把它切成几十个符合 MTU 规范（如 1500 字节）的小包，分别封装 TCP/IP 头。

开启后：CPU 直接给网卡一个 64KB 的大块数据（包含一个基础头部信息），由网卡硬件自动切片并加上各自的 TCP 头部发送出去。

generic-receive-offload: on（GRO，通用接收卸载）

TSO 的逆向操作：当网卡收到一串连续的小数据包时，驱动/网卡会先把它们合并成一个大的数据块，再一并提交给内核协议栈处理，大幅减少 CPU 触发软中断（SoftIRQ）的次数。

核心特征：它们只是数据包传输与计算层面的优化，数据包依然会严格走完系统的整个 Linux Netfilter 防火墙规则链，不会破坏任何路由、流控或代理机制。


#### Intel i225/i226 禁用网卡节能

Intel i225/i226 芯片在 Linux（igc 驱动）或多盘并发环境下，极易受到 PCIe 和网口节能机制的干扰：  

ASPM（Active-State Power Management）：在高速满速传输时，PCIe 链路如果因为节能状态切换不当（L1/L0 状态反复震荡），会导致网卡在几毫秒内失去响应，触发内核网卡看门狗（Watchdog）复位，造成链路闪断，直接把 SMB 会话打断。  

```bash
# 禁用 PCIe ASPM：在 BIOS 中将 PCIe ASPM 设为 Disabled，或者在系统引导参数（GRUB cmdline）中加入 pcie_aspm=off
```

EEE（Energy Efficient Ethernet / 802.3az）：高效节能以太网特性。在持续满速与空闲交替时易产生协商异常导致丢包。  

```bash
ethtool --show-eee enp1s0

ethtool --set-eee enp1s0 eee off
ethtool --set-eee enp1s0 eee on
```

Openwrt => Startup => Local StartUp

```bash
(
    sleep 20
    for iface in eth0 eth1 eth2 eth3; do
        ethtool --set-eee "$iface" eee off > /dev/null 2>&1
    done
) &

# 开机后验证命令
for i in eth0 eth1 eth2 eth3; do echo "=== $i ==="; ethtool --show-eee $i | grep "EEE status"; done
```