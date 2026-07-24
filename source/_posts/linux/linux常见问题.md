---
title: linux 常见问题
mathjax: true

date: 2020-12-02 16:52:11
categories:
  - Linux
tags:
  - Linux
---

#### ps

查看进程

```bash
ps aux
```

#### kill pkill

```bash
kill -9 pid
```

pkill 后面可以直接写进程的名字

如果是一个服务使用 `systemctl stop`

#### w who

看谁正在连接系统

#### lsof 查看端口占用

```bash
#列出所有打开的文件:
lsof
备注: 如果不加任何参数，就会打开所有被打开的文件，建议加上一下参数来具体定位

# 查看谁正在使用某个文件
lsof   /filepath/file

#递归查看某个目录的文件信息
lsof +D /filepath/filepath2/
备注: 使用了+D，对应目录下的所有子目录和文件都会被列出

# 比使用+D选项，遍历查看某个目录的所有文件信息 的方法
lsof | grep ‘/filepath/filepath2/’

# 列出某个用户打开的文件信息
lsof  -u username
备注: -u 选项，u其实是user的缩写

# 列出某个程序所打开的文件信息
lsof -c mysql
备注: -c 选项将会列出所有以mysql开头的程序的文件，其实你也可以写成lsof | grep mysql,但是第一种方法明显比第二种方法要少打几个字符了

# 列出多个程序多打开的文件信息
lsof -c mysql -c apache

# 列出某个用户以及某个程序所打开的文件信息
lsof -u test -c mysql

# 列出除了某个用户外的被打开的文件信息
lsof   -u ^root
备注：^这个符号在用户名之前，将会把是root用户打开的进程不让显示

# 通过某个进程号显示该进行打开的文件
lsof -p 1

# 列出多个进程号对应的文件信息
lsof -p 123,456,789

# 列出除了某个进程号，其他进程号所打开的文件信息
lsof -p ^1

# 列出所有的网络连接
lsof -i

# 列出所有tcp 网络连接信息
lsof  -i tcp

# 列出所有udp网络连接信息
lsof  -i udp

# 列出谁在使用某个端口
lsof -i :3306

# 列出谁在使用某个特定的udp端口
lsof -i udp:55

# 特定的tcp端口
lsof -i tcp:80

# 列出某个用户的所有活跃的网络端口
lsof  -a -u test -i

# 列出所有网络文件系统
lsof -N

#域名socket文件
lsof -u

#某个用户组所打开的文件信息
lsof -g 5555

# 根据文件描述列出对应的文件信息
lsof -d description(like 2)

# 根据文件描述范围列出文件信息
lsof -d 2-3
```

#### SSH免密登录

- 生成密钥对

  -t 指定密钥类型，默认是 rsa ，可以省略。
  -C 设置注释文字，比如邮箱。
  -f 指定密钥文件存储文件名。

  **如果想免密登录，密钥不要填写密码，否则必须验证密钥密码才能登录**

  ```bash
  ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

  # 或者创建使用 ed25519 加密算法的密钥
  ssh-keygen -t ed25519 -C "your_email@example.com"
  ```

- 上传共钥到服务器对应账号的 home 目录下.ssh 文件夹下面，公钥的权限为 600

  linux 执行以下命令

  ```bash
  ssh-copy-id -i mykey_rsa.pub you_user_name@xxx.xxx.xxx.xxx
  ```

  window 需要手动在服务器上创建文件,

  ```bash
  touch  ~/.ssh/authorized_keys

  # 或直接写入文件
  echo "your_public_key_here" >> ~/.ssh/authorized_keys

  # 修改权限
  chmod 600 authorized_keys
  ```

- 指定私钥登陆，私钥的权限为 600

  ```bash
  ssh -i 私钥 user@xxx.xxx.xxx.xxx
  ```

- 通过配置文件免密登陆，在本地服务器把私钥复制到 home 下的.ssh 文件夹下面

  创建名称为 config 的文件，配置单一服务器免密登陆

  ```bash
  Host tencent
    HostName 124.222.139.87
    User ubuntu
    IdentityFile ./.ssh/id_ed25519
    IdentitiesOnly yes


  # Host 别名
  # 　HostName IP
  # 　Port 端口
  # 　User 用户名
  # 　IdentitiesOnly yes
  #   IdentityFile ~/.ssh/user_rsa  (私钥路径)
  #   Protocal 2 (协议版本号)
  #   Compression yes
  #   ServerAliveInterval 60 （防止被踢配置，长时间没有操作会被踢掉，每隔60秒发一个信号）
  #   ServerAliveCountMax 20 (最大连接数)
  #   LogLevel INFO
  ```

  通配符配置

  ```bash
  Host app-produce
    HostName 192.168.1.10
    Port 22
    User appuser
    IdentityFile ~/.ssh/id_ed25519

  Host \*\_produce
    User commonuser
    IdentityFile ~/.ssh/id_ed25519
    Port 22
  ```

#### wget

wget 是一个从网络上自动下载文件的自由工具，支持通过 HTTP、HTTPS、FTP 三个最常见的 TCP/IP 协议 下载，并可以使用 HTTP 代理。"wget" 这个名称来源于 “World Wide Web” 与 “get” 的结合。

wget 可以在用户退出系统的之后在后台执行。这意味这你可以登录系统，启动一个 wget 下载任务，然后退出系统，wget 将在后台执行直到任务完成，相对于其它大部分浏览器在下载大量数据时需要用户一直的参与.

```bash
wget (选项) (参数)
```

其中选项如下：

-a<日志文件>：在指定的日志文件中记录资料的执行过程；

-A<后缀名>：指定要下载文件的后缀名，多个后缀名之间使用逗号进行分隔；

-b：进行后台的方式运行 wget；

-B<连接地址>：设置参考的连接地址的基地地址；

-c：继续执行上次终端的任务；

-C<标志>：设置服务器数据块功能标志 on 为激活，off 为关闭，默认值为 on；

-d：调试模式运行指令；

-D<域名列表>：设置顺着的域名列表，域名之间用“，”分隔；

-e<指令>：作为文件“.wgetrc”中的一部分执行指定的指令；

-h：显示指令帮助信息；

-i<文件>：从指定文件获取要下载的 URL 地址；

-l<目录列表>：设置顺着的目录列表，多个目录用“，”分隔；

-L：仅顺着关联的连接；

-r：递归下载方式；

-nc：文件存在时，下载文件不覆盖原有文件；

-nv：下载时只显示更新和出错信息，不显示指令的详细执行过程；

-q：不显示指令执行过程；

-nh：不查询主机名称；

-v：显示详细执行过程；

-V：显示版本信息；

--passive-ftp：使用被动模式 PASV 连接 FTP 服务器；

--follow-ftp：从 HTML 文件中下载 FTP 连接文件。

```bash
wget http://test.com/testfile.zip ->下载指定文件到当前文件夹
wget -O wordpress.zip http://test.com/download ->指定保存名字
wget --limit-rate=300k http://www.linuxde.net/testfile.zip ->限制下载速度
wget -c http://www.linuxde.net/testfile.zip ->断点续传
wget -b http://www.linuxde.net/testfile.zip ->后台下载

# 设置使用指定浏览器下载（伪装下载）
wget --user-agent="Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US) AppleWebKit/534.16 (KHTML, like Gecko) Chrome/10.0.648.204 Safari/534.16" http://www.linuxde.net/testfile.zip

wget --spider url ->测试下载
wget --tries=40 URL ->设置重试次数为40
wget -i filelist.txt ->从filelist.txt获取下载地址

# 镜像网站
# --miror开户镜像下载。
# -p下载所有为了html页面显示正常的文件。
# --convert-links下载后，转换成本地的链接。
# -P ./LOCAL保存所有文件和目录到本地指定目录
wget --mirror -p --convert-links -P ./LOCAL URL

wget --reject=gif ur ->下载一个网站，但你不希望下载图片，可以使用这条命令
wget -o download.log URL ->把下载信息存入日志文件
wget -Q5m -i filelist.txt ->限制总下载文件大小
wget -r -A.pdf url ->下载指定格式文件

# FTP下载
wget ftp-url
wget --ftp-user=USERNAME --ftp-password=PASSWORD url
```

#### 修改系统时间时区

最标准且永久生效的方法是使用系统自带的 timedatectl 工具。

```bash
sudo timedatectl set-timezone Asia/Shanghai

#强制开启网络时间同步 (NTP)
sudo timedatectl set-ntp true

#检查时间状态 
timedatectl status
```


#### lvm-cache

为HDD添加SSD作为缓存盘，提高读写速度。

```bash
# 擦除所有分区签名（极其危险，请确保 /dev/nvme0n1 就是目标盘）
wipefs -a /dev/nvme0n1
wipefs -a /dev/sdc

# 彻底销毁 GPT 分区表
sgdisk --zap-all /dev/nvme0n1
sgdisk --zap-all /dev/sdc

# 创建物理卷 (PV),将这两块干净的硬盘注册为 LVM 的底层物理存储节点。
pvcreate /dev/sdc /dev/nvme0n1

# 创建基础卷组 (VG) 和逻辑卷 (LV):关键：此时只用机械硬盘.为了确保你的基础数据 100% 落在机械硬盘上，我们先只用机械硬盘创建一个卷组，并把它的全部空间划给一个逻辑卷。
vgcreate vg_home_data /dev/sdc

# 将 vg_home_data 的所有空间分配给逻辑卷 lv_home_data
lvcreate -n lv_home_data -l 100%FREE vg_home_data

# 如果提示 WARNING: zfs_member signature detected on /dev/vg_home_data/lv_home_data at offset 401408. Wipe it? [y/n]:
# 可以通过管道符批量处理
yes | lvcreate -n lv_home_data -l 100%FREE vg_home_data

#将 NVMe 固态扩容进卷组:房子建好了，现在把你的固态硬盘加入到 vg_home_data 这个卷组里，作为后续的缓存备用。
vgextend vg_home_data /dev/nvme0n1

# 在固态硬盘上创建缓存池，并绑定到机械硬盘的 lv_home_data 上
lvcreate -y --type cache --cachemode writeback -l 95%FREE -n home_data_cache vg_home_data/lv_home_data /dev/nvme0n1

# 查看命中率与"脏数据"
# WriteHits (写命中)： 写入时成功被 SSD 接管的次数。多线程下载时，这个数值会疯狂暴涨，代表固态硬盘正在疯狂抗压。
# DirtyBlocks (脏数据块)： 这是 Writeback 模式特有的概念！意思是“目前还在 SSD 里，还没有来得及搬到机械硬盘里的数据量”。下载时它会堆积，系统闲置时，LVM 会在后台默默把它们顺序写入机械盘，这个数值就会慢慢清零。

watch -n 1 "lvs -o name,data_percent,cache_write_hits,cache_dirty_blocks vg_home_data/lv_home_data"
```

####  LXC 容器使用LVM存储

如何配置给 LXC 容器使用LVM存储， 首先为什么不能直接直通给 LXC？是因为 LXC 容器的底层机制决定的。即便你现在手里是一个纯纯的物理机械硬盘 /dev/sda，我依然不建议你直接把它直通给 LXC 容器。

如果是 虚拟机 (VM)： 虚拟机有自己完整的“虚拟主板”。你可以直接把 /dev/sda 或者 /dev/vg_home_data/lv_home_data 作为一块“虚拟硬盘”挂载给它。虚拟机开机后，会认为自己插了一块新硬盘，并在虚拟机内部自己进行格式化。

如果是 LXC 容器： LXC 没有“主板”，它就是一个隔离的进程，直接和 PVE 宿主机共用同一个 Linux 内核。如果你强行把裸设备（/dev/sda 或逻辑卷）映射进容器（需要改复杂的 cgroup 权限，特别是无特权容器），很容易遇到权限报错。

对 LXC 容器而言，不管是物理的 /dev/sda，还是带缓存魔法的 lv_home_data，最规范、最不容易出 Bug 的用法，都是让 PVE 宿主机去格式化它，把它变成一个文件夹，然后把文件夹映射给容器。

```bash
# 在 PVE 宿主机上格式化并挂载
# 首先，我们要给这个裸设备穿上文件系统（推荐 ext4），并让 PVE 把它挂载出来。

# 1. 格式化为 ext4 文件系统（只需执行一次）
mkfs.ext4 /dev/vg_home_data/lv_home_data

# 2. 在 PVE 宿主机上创建一个挂载点（比如叫 gamedata）
mkdir -p /mnt/gamedata

# 3. 挂载上去
mount /dev/vg_home_data/lv_home_data /mnt/gamedata


#为了让 PVE 每次重启后都能自动挂载，你需要把它写进开机启动文件里, 编辑 fstab 文件
nano /etc/fstab
# 在末尾添加
/dev/vg_home_data/lv_home_data /mnt/gamedata ext4 defaults 0 2

# 将目录映射进 LXC 容器
# 在 pve UI 界面通过 Mount Point 添加挂在点，或通过以下命令，假设你的 LXC 容器的 ID 是 101（请替换为你的实际 ID）

pct set 101 -mp0 /mnt/gamedata,mp=/downloads
```

VM虚拟机使用LVM存储，需要用到“块设备直通（Block Device Passthrough）


#### 配置开启 iSCSI 服务

```bash
# 在的终端执行以下命令，安装并进入 targetcli 交互式命令行：

apt update
apt install targetcli-fb -y
targetcli

# 把你的 LVM Cache 逻辑卷注册为一个名为 home_data 的块设备
cd /backstores/block
create name=home_data dev=/dev/vg_home_data/lv_home_data

# 创建 iSCSI 目标 (Target):创建一个对外的 iSCSI 节点名称（IQN）。这里以当前的年份月份命名：
cd /iscsi
create iqn.2026-07.local.pve:homedata

# 映射 LUN (逻辑单元):将刚才创建的底层存储块 gamedisk 绑定到这个 iSCSI 目标上：
cd iqn.2026-07.local.pve:homedata/tpg1/luns
create /backstores/block/home_data

# 为了数据安全，我们要告诉 PVE 只允许你的 Windows 电脑连接，拦截网络里其他乱七八糟的请求。这里要用到你刚才在 Windows 上复制的 IQN 名字
# 在windows 打开 iscsi initiator 在 configuration 标签里面 initiator name
cd ../acls
create 你的Windows_IQN 

# 所有的配置现在都在内存中，我们需要将其保存到配置文件并退出工具：

cd /
saveconfig
exit
```

**Q**: 如果 targetcli-fb 用 block Block 模式，数据也能先进 pve 的内存么，还是说只有fileio 才能进pve的内存?
**A**: 如果使用 Block 模式，数据将【基本跳过】PVE 的系统内存（Page Cache），直接砸向底层的块设备。而 FileIO 默认会大量吃掉 PVE 的内存。

这也是为什么我们在前一步骤中，必须配合 dm-writecache (SSD) 来使用 Block 模式的原因。下面为你拆解这两种模式在内存利用上的根本差异：

FileIO：严重依赖内存的伪装者
当你在 PVE 中使用 fileio 创建 iSCSI 目标时，Linux 内核会把这个虚拟磁盘当成一个普通的本地文件（.raw 或 .img）来处理。

数据流向：Windows 发送数据 ➡️ PVE 内存（Page Cache 页缓存） ➡️ PVE 机械硬盘。

现象：你会发现就算没有 SSD，一开始拷文件也能跑到 280MB/s。但这是虚假的繁荣，因为数据其实全堆在 PVE 的内存里。等内存快塞满时，内核开始手忙脚乱地把内存数据往机械硬盘里倒腾，速度会瞬间断崖式下跌到 0，甚至卡死。

致命风险：如果此时 PVE 突然死机或停电，堆在内存里（还没写进机械盘）的脏数据瞬间灰飞烟灭。这对于 iSCSI 来说是毁灭性的，会导致 Windows 端的 NTFS 索引损坏，整个盘变成 RAW。

Block 模式：直达底层的直通车 (Direct I/O)
当你在 LIO (targetcli) 中使用 block (iblock) 模式时，它绕过了 Linux 的虚拟文件系统（VFS）和页缓存（Page Cache）。

数据流向：Windows 发送数据 ➡️ PVE 网卡缓冲（微秒级停留） ➡️ 直接下发 SCSI 指令到底层块设备。

现象：系统不再用大量的内存去给写入做缓冲。这意味着，如果底层是机械硬盘，你的写入速度会直接被机械硬盘的真实速度（比如 100MB/s）卡死，甚至因为 iSCSI 的小块随机写入，速度可能掉到只有 30MB/s。

这就是为什么我们需要 dm-writecache！ 因为 Block 模式没有了内存做缓冲，我们就用物理的 SSD (dm-writecache) 来代替内存的作用。

**Q**：为什么windows写入pve是直接写入内存，但是拷贝一个大电影的时候，复制速度会卡到0
**A**: PVE 的 LVM Cache 底层使用的是 dm-cache 技术，默认采用了极其聪明的 smq (Stochastic Multiqueue) 缓存策略。

这个策略有一个核心逻辑：保护 SSD 寿命，防止“缓存污染（Cache Thrashing）”。

当 Windows 刚开始传数据时，LVM 以为是普通的小文件写入，于是把数据丢进 SSD（这就是你看到缓存增长的原因）。

但是，当 LVM 发现这是一个连续的、巨大的数据流（比如你的 8GB 电影）时，它会立刻触发 sequential_threshold（顺序 I/O 阈值）保护机制。

LVM 的逻辑是：“这种连续大文件写进去就是占地方，以后大概率也是连续读，直接交给机械硬盘处理最合适，没必要磨损 SSD 的颗粒。”

结果：LVM 会在中途主动将后续的数据流从 SSD 切换，直接穿透到后端的机械硬盘上。因为你的单块机械硬盘真实写入速度就是 100MB/s 左右，所以最终速度被死死卡在这个数值。

**Q**: 开启 Turn off Windows write-cache buffer flushing on the device 有什么效果。
**A**: 无论你是否勾选这个选项，数据都会先进入 Windows 的内存（RAM）。

这里需要区分两个极其关键的概念：“进内存（Write Cache）”和“清空内存（Buffer Flushing）”。

你看到的属性面板里，其实有两个复选框：

启用设备上的写入缓存（默认开启）：这个选项决定了数据是否先进入 Windows 内存。

关闭设备上的 Windows 写入高速缓存缓冲区刷新（你提到的这个）：这个选项决定了 Windows 是否向服务器发送“立刻把缓存写进物理硬盘”的强制命令（Flush/FUA）。

下面为你还原勾选与不勾选时，到底发生了什么导致了“卡顿”：

状态一：不勾选（默认状态，会卡顿掉速）
当你不勾选这个选项时，Windows 会极其谨慎：

狂飙：数据先以 2.5G 的极速塞满 Windows 的内存缓冲区。

强制对账（发 Flush 指令）：Windows 觉得内存里攒得够多了，于是通过网络给 PVE 发送一个 Flush 指令：“停下！现在立刻把你接收到的数据彻底写进底层的机械硬盘里，没写完之前不许接新数据！”

卡顿掉到 0：因为 PVE 底层的机械硬盘只有 100MB/s 的速度，要消化这几个 GB 的数据需要好几十秒。在这几十秒里，Windows 在干等 PVE 的“写完确认”信号，复制进度条随之彻底卡死，速度掉到 0。

状态二：勾选（关闭刷新，速度平滑但危险）
当你勾选这个选项时，你实际上剥夺了 Windows 发送强制对账指令（Flush）的权利：

狂飙并持续：数据依然先进入 Windows 内存，然后源源不断地通过 2.5G 网络发给 PVE。

不管底层死活：Windows 不再发送强制落盘的指令，它采取“发后不理”的态度。只要 PVE 的系统内存（Page Cache）还没满，它就继续发。

视觉不卡顿：因为没有了那个“必须等机械盘写完”的强制等待期，整个复制过程在 Windows 看来非常顺畅，也就不会出现断崖式掉到 0 的卡顿。

但是代价极其高昂：
因为 Windows 放弃了“对账”，如果在复制过程中，或者复制刚完成的几秒钟内，网线松了、PVE 意外重启、或者交换机闪断，那些存在 Windows 内存里以及 PVE 内存里、还没来得及真正写到机械硬盘上的数据，会瞬间灰飞烟灭，并大概率导致你的 iSCSI 分区文件系统直接损坏（变成 RAW 格式）。

##### iSCSI策略设计

服务端主外，客户端主内。

写入加速：交给 PVE 服务端 (dm-writecache) 在 PVE 端，配置一块 SSD 作为 dm-writecache。

作用：它作为唯一的数据接收大闸。Windows 传来的 50GB 大文件，全部由它安全、全速地吃下。就算此时 Windows 蓝屏、网线断了，数据只要进了 PVE 的 SSD 就绝对不会丢。

从 lvm-cache（即 dm-cache）切换到 dm-writecache，绝不能直接强行删除 SSD 逻辑卷。

因为 lvm-cache 默认可能是“回写（Writeback）”模式，SSD 里可能还存留着尚未刷入机械硬盘的“脏数据（Dirty Data）”。如果直接暴力破坏，你的整个 iSCSI 磁盘就会永久损坏。

正确的做法是让内核“平滑退役”旧缓存，然后再挂载新缓存。请按照以下安全步骤操作：

```bash
# 1.断开 Windows iSCSI 连接:防止新数据涌入.为了让旧缓存能尽快把数据排空，必须先切断数据源。去 Windows 端的 iSCSI 发起程序 中，将目标 断开连接 (Disconnect)。

# 2.安全解除并销毁旧的 lvm-cache:耗时取决于脏数据量，切勿强行中断.在 PVE 的 SSH 命令行中，输入以下命令解除缓存：
# 执行完毕后，旧的 SSD 缓存池会被自动销毁并释放空间，而你的原始数据卷会完好无损地保留下来。
lvconvert --uncache vg_home_data/lv_home_data
  # Flushing 0 blocks for cache vg_home_data/lv_home_data.
  # Logical volume "home_data_cache_cpool" successfully removed.
  # Logical volume vg_home_data/lv_home_data is not cached.

# 暴力拆除旧逻辑卷 (LV):数据将在此步被销毁.强行删除损坏的缓存和主数据卷：
lvremove -f vg_home_data/home_writecache
lvremove -f vg_home_data/lv_home_data

# 创建主存储
yes | lvcreate -l 100%FREE -n lv_home_data vg_home_data /dev/sdc
# 2.在 SSD 上切出新的蓄水池:必须在命令末尾指定 /dev/nvme0n1.既然空间释放了，我们要在这个大 VG 里切出一块名为 nvme_writecache 的新逻辑卷。极其重要： 因为你的 VG 里同时有机械盘和固态盘，为了防止系统把这个蓄水池建在机械盘上，必须在命令最后指名道姓要求用 /dev/nvme0n1
lvcreate -n home_writecache -l 95%FREE vg_home_data /dev/nvme1n1

# 3.当你刚用 lvcreate 创建完 home_writecache 时，系统会自动把它“激活”（挂载在内核中备用）。
# 但是 dm-writecache 架构有一个硬性要求：它必须在底层彻底接管这个卷的格式。所以在此之前，我们需要手动把这个新建的缓存卷“停用”（从内核中剥离出休眠状态），才能把它当做外挂缓存装定到主数据卷上。
# 停用新建的缓存卷:让内核释放锁定.执行这条命令，把刚才新建的 SSD 卷变成 inactive（非激活）状态：
lvchange -a n vg_home_data/home_writecache

# 4.激活 dm-writecache 模式:将蓄水池盖在数据卷上.最后，将刚才创建的高速蓄水池，以 writecache 模式正式绑定到你的 2.73T 主数据卷上：
lvconvert --type writecache --cachevol vg_home_data/home_writecache vg_home_data/lv_home_data
# Erase all existing data on vg_home_data/home_writecache? [y/n]: y
#   Using writecache block size 4096 for unknown file system block size, logical block size 512, physical block size 512.
#   WARNING: unable to detect a file system block size on vg_home_data/lv_home_data
#   WARNING: using a writecache block size larger than the file system block size may corrupt the file system.
# Use writecache block size 4096? [y/n]: y
# 第二个 y（Use writecache block size 4096?）：
# 为什么会弹这个？ 因为你的 lv_home_data 是通过 iSCSI 挂载给 Windows 使用的，底层格式化（如 NTFS）是在 Windows 端完成的。PVE 宿主机无法直接“透视”到里面的文件系统块大小，所以它报了个“无法检测”的警告。
# 为什么选 4096？ Windows 的 NTFS 文件系统默认簇大小（Block Size）几乎全都是 4096 字节 (4KB)。dm-writecache 使用 4096 字节不仅性能最好，而且能与 Windows 的文件系统完美对齐。

# 5.targetcli 找到旧的 LUN 和 fileio 名称
targetcli
ls

# 6.删除旧的 LUN 映射:必须先删 LUN，才能删底层存储.先解除 iSCSI 目标对旧 fileio 的占用。把下面命令中的 iqn... 替换为你自己的名称（多用 Tab 补全）：
/iscsi/iqn.2026-07.local.pve:homedata/tpg1/luns/ delete lun0

# 7.删除旧的 fileio/block 设备:释放对 LVM 的 fileio/block 占用.删除旧的 fileio/block 后端存储（把 旧的名字 换成你刚才看到的名称）：
/backstores/fileio delete fileio_home_data

# 8.创建全新的 Block 设备:指定我们刚才搞好的 LVM 路径.现在，创建一个纯粹的块级设备，命名为 block_home_data ，并指向你的主数据卷
# 在底层已经是 4K 的情况下，必须显式告诉 iSCSI 协议对外广播自己是 4K 盘。进入 targetcli，在创建块设备后，必须立即设置 block_size：
/backstores/block create name=block_home_data dev=/dev/vg_home_data/lv_home_data
/backstores/block/block_home_data set attribute block_size=4096

# 9.将新 Block 映射为 LUN:重新挂载给 iSCSI 目标.把刚刚建好的 block_home 挂载到你的 iSCSI 目标上
/iscsi create iqn.2026-07.local.pve:homedata
/iscsi/iqn.2026-07.local.pve:home-data/tpg1/acls create 你的Windows_IQN 
/iscsi/iqn.2026-07.local.pve:homedata/tpg1/luns create /backstores/block/block_home_data

# 保存退出 
saveconfig
exit

# 监控 lvm-cache dm-cache状态
watch -n 1 "lvs -o name,data_percent,cache_write_hits,cache_dirty_blocks vg_home_data/lv_home_data"

# 监控 lvm-cache dm-writecache 状态
watch -n 1 'dmsetup status vg_home_data-lv_home_data'

#监控系统内存状态
watch -n 1 "free -h; echo '===================='; grep -E 'Dirty|Writeback' /proc/meminfo"
```

**Q**: 为什么挂在后会变成容量变大且不能访问？
**A**: 记得刚才我们配置 dm-writecache 时，按下的那两个 y 吗？当时系统提示：Use writecache block size 4096? [y/n]: y。你之前的旧架构（fileio）默认向 Windows 汇报的磁盘扇区大小是 512 字节。我们刚才建立的 dm-writecache 底层使用的是 4096 字节 (4K) 扇区。$4096 \div 512 = 8$。Windows 的分区表原本是用 512 字节一把尺子量出来的，现在突然尺子的刻度放大了 8 倍，Windows 傻乎乎地直接把你的磁盘容量也乘以了 8！（如果你原本的磁盘分区是 2T 左右，$2 \text{T} \times 8 = 16\text{T}$，完全对上了！）


读取加速：交给 Windows 客户端 (PrimoCache L2 读缓存)

在你日常使用的 Windows 电脑里，划出一块 SSD 给 PrimoCache 当作二级缓存（L2 Cache）。

关键设置：进入 PrimoCache，关闭“延迟写入”，将这块 L2 缓存配置为 100% 纯读取（Read-Data Only）。

作用：当你第一次从 iSCSI 看电影或读数据时，数据从 PVE 的机械硬盘流向 Windows，PrimoCache 会在后台悄悄把这些数据在 Windows 本地的 SSD 里存一份。明天你再去读这个文件，它直接从你电脑本地的 SSD 秒开，连 2.5G 的网络带宽都不占！