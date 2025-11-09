---
layout: posts
title: manjaro美化
mathjax: true
date: 2023-07-03 13:51:32
categories: 其他
tags:
  - Linux
  - Manajro
---

#### 添加 archlinux 源

[mirrorlist-repo](https://github.com/archlinuxcn/mirrorlist-repo) 官方仓库地址

```bash
# /etc/pacman.conf

[archlinuxcn]
Server = https://repo.archlinuxcn.org/$arch
```

#### 设置源

- 软件仓库中选择 Preferences, use mirrors 选择指定源

- 通过命令行选择

  ```bash
  # 手动选择镜像列表
  sudo pacman-mirrors -i -c China -m rank

  # 自动生成配置列表 -g 表示从活动池中选择镜像列表
  sudo pacman-mirrors -c China -g
  ```

#### 更新系统

```bash
sudo pacman -Syyu
```

#### 安装 yay 助手

```bash
sudo pacman -S yay
```

#### 输入法

[Fcitx5](https://wiki.archlinuxcn.org/wiki/Fcitx5)

```bash
sudo pacman -S fcitx5-im fcitx5-chinese-addons fcitx5-material-color
```

系统设置中添加拼音输入法

![](001.png)

配置环境变量，让应用程序可以使用输入法

```bash
# /etc/environment

GTK_IM_MODULE=fcitx
QT_IM_MODULE=fcitx
XMODIFIERS=@im=fcitx
```

配置插件：

- 点击 configure addons, 选择 classic user interface 勾选 use per screen DPI, 保证输入法随系统缩放。

设置联想:

- 使用云拼音实现联想功能

  点击 configure addons, 选择 PinYin, 开启云拼音，并选择 Baidu

#### oh-my-zsh

[oh-my-zsh](https://ohmyz.sh/#install)

#### SSH 

[GNOME/Keyring](https://wiki.archlinux.org/title/GNOME/Keyring#SSH_keys)

如果安装的是 KDE 桌面等桌面环境的版本，可能无法自动获取 SSH Key 的密码，导致每次使用都会提示输入密钥密码

安装 Cinnamon 它是一个独立的桌面环境，包含了 Keyring 所需要的工具包，首次认证会弹出一个 GUI 窗口填写密码，后续可以免密登录

```bash
yay cinnamon
```

开启 gcr 守护进程

```bash
systemctl --user enable --now gcr-ssh-agent.service
```

添加环境变量

```bash
export SSH_AUTH_SOCK="${XDG_RUNTIME_DIR}/gcr/ssh"
```


#### 虚拟化环境配置显卡直通

X11 环境中强制 Xorg 使用 NVIDIA GPU, 需要注意 PCI设备不要填错， 通过命令`lspci | grep -i nvidia` 查看


```bash
sudo rm /etc/X11/xorg.conf
sudo nvidia-xconfig --busid=PCI:1:0:0 --force-generate
```

设置环境变量

```bash
echo 'export __NV_PRIME_RENDER_OFFLOAD=1' >> ~/.zshrc
echo 'export __GLX_VENDOR_LIBRARY_NAME=nvidia' >> ~/.zshrc
source ~/.zshrc
```

