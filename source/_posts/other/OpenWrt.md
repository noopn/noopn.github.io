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

  缓存: 关闭

  EDNS 客户端子网： （202.101.172.36 浙江） 选择一个距离当前宽带运营商最近的一个 IP 地址，这可以让 Google DNS 查询的时候选择一个离运营商最近的服务器

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

- DNS 规则

  Block，选择广告的资源集，在 DNS 解析的时候就禁止访问
  直连，选择国内的域名规则集，DNS 服务器选择 WAN 自动下发的 DNS 服务，这样当请求一个国内的域名时，可以直接用运营商的 DNS 解析

#### WireGuard 

安装 luci-proto-wireguard  qrencode

Netword =》 Interfaces =》新建协议 Wireguard Vpn

通用设置 =》 生成新的密钥对 =》 添加监听端口 =》Ip 地址选择一个与内网不冲突的网段 10.0.6.0

防火墙设置 =》 加入 lan 区域

对端设置 =》 创建新的密钥对 =》ip 地址选择一个网段内的 ip =》生成二维码 =》修改链接地址为配置了 DDNS 的域名 =》扫描二维码或复制配置添加

