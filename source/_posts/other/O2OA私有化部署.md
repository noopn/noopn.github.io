---
layout: posts
title: O2OA 私有化部署
date: 2024-09-22 12:02:05
categories:
  - 其他
tags:
  - o2oa
---

#### 安装 mysql 数据库

```bash
# 安装服务
sudo apt install -y mysql-server

# 检查服务是否启动
systemctl status mysql

# 首次登录没有密码
sudo mysql -u root -p

# 创建对应的数据库

CREATE DATABASE my_database
CHARACTER SET utf8mb4
COLLATE utf8mb4_general_ci;
# 查看所有数据库
SHOW DATABASES;

# 删除数据库
DROP DATABASE database_name;
# 修改字符集和排序
ALTER DATABASE database_name
CHARACTER SET utf8mb4
COLLATE utf8mb4_general_ci;

# 创建新用户
# 'localhost'：表示该用户只能从本地机器连接到数据库。如果希望该用户可以从任何主机连接，可以使用 '%'，如 'new_user'@'%'。
CREATE USER 'new_user'@'localhost' IDENTIFIED BY 'your_password';
# 查看所有用户
SELECT User, Host FROM mysql.user;


#ALL PRIVILEGES：赋予所有权限。
# my_database.*：指示该用户可以对 my_database 数据库中的所有表进行操作。
# 'localhost'：表示该用户只能从本地连接。
GRANT ALL PRIVILEGES ON my_database.* TO 'new_user'@'localhost';

# 刷新权限
FLUSH PRIVILEGES;

# 查看端口
SHOW VARIABLES LIKE 'port';

cat /etc/mysql/mysql.conf.d/mysqld.cnf
```

#### 下载安装包

[下载](http://www.o2oa.net/download.html) 安装包

解压并复制到 /opt

```bash
unzip  o2server-8.2.3-linux-x64.zip

mv o2server /opt
```

#### 配置服务器端口

O2OA 服务器端口配置文件所在位置：o2server/config/node_127.0.0.1.json

如果目录里没有该文件或者没有 config 目录，可以新建一个 config 目录，然后从 configSample 目录里 COPY 一个到新建的 config 目录下。

```bash
# 自行修改web端口配置
```

#### 自启动服务

因为需要用 root 用户启动服务，所以先配置开机启动服务

```bash
./service_linux.sh o2server start_linux.sh

systemctl enable o2server
systemctl start o2server
```

#### 配置数据库链接

```bash
jdbc:mysql://127.0.0.1:3306/o2oa_db?autoReconnect=true&allowPublicKeyRetrieval=true&useSSL=false&useUnicode=true&characterEncoding=UTF-8&useLegacyDatetimeCode=false&serverTimezone=GMT%2B8
```
