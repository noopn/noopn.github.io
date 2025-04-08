---
title: sonarQube
mathjax: true
categories:
  - DevOps
tags:
  - DevOps

date: 2020-12-04 16:40:25
---

#### 最后更新

**2024-12-11**

#### 安装数据库

安装 `postgresql`，[\[文档\]](https://www.postgresql.org/download/linux/ubuntu/)

```bash
apt install postgresql
```

创建 schema

```bash
# 登录数据库
sudo -u postgres psql

# 创建数据库,必须使用 UTF-8 编码
CREATE DATABASE sonarqube_db ENCODING 'UTF8';
# 链接到新的数据库
\c sonarqube_db # 进入数据库
```

创建用户 sonarqube

```bash
CREATE USER sonarqube WITH PASSWORD 'YourSecurePassword';
```

创建 scheme，并赋予 sonarqube 用户所有权限

```bash
CREATE SCHEMA sonarqube_schema AUTHORIZATION sonarqube;
```

由于没有使用默认的 schema，必须要设置 search_path

```bash
ALTER USER sonarqube SET search_path to sonarqube_schema;
```

#### 配置 java 环境

安装 java 环境，[\[文档\]](https://adoptium.net/installation/linux/)

安装依赖包

```bash
apt install -y wget apt-transport-https gpg
```

下载 Eclipse Adoptium GPG 密钥

```bash
wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor | tee /etc/apt/trusted.gpg.d/adoptium.gpg > /dev/null
```

配置库信息

```bash
echo "deb https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" | tee /etc/apt/sources.list.d/adoptium.list
```

安装

```bash
apt update
apt-get install temurin-21-jdk
```

#### 安装前环境准备

确认信息

一个进程可能拥有的最大内存映射区域数（vm.max_map_count）大于等于 524288。
打开的文件描述符的最大数目（fs.file-max）大于或等于 131072。
运行 SonarQube Server 的用户至少可以打开 131072 个文件描述符
运行 SonarQube Server 的用户至少可以打开 8192 个线程

使用以下命令查看信息

```bash
sysctl vm.max_map_count

sysctl fs.file-max

ulimit -n

ulimit -u
```

修改配置

```bash
# 创建一个新的配置文件
/etc/sysctl.d/99-sonarqube.conf

# 添加
vm.max_map_count=524288
fs.file-max=131072
```

```bash
# 创建一个新的配置文件
/etc/security/limits.d/99-sonarqube.conf

# 添加
sonarqube   -   nofile   262144

sonarqube   -   nproc    16384
```

在 Linux 内核上启用 seccomp

```bash
grep SECCOMP /boot/config-$(uname -r)

# 如果您的内核有seccomp，将看到以下内容
# CONFIG_HAVE_ARCH_SECCOMP_FILTER=y
# CONFIG_SECCOMP_FILTER=y
# CONFIG_SECCOMP=y
```

#### 安装 sonar

[下载](https://www.sonarsource.com/products/sonarqube/downloads/),并解压，路径中不能有 `.`开头的文件夹

```bash
unzip sonarqube-25.3.0.104237.zip
```

编辑数据库链接信息

```bash
vi <sonarqubeHome>/conf/sonar.properties

sonar.jdbc.username=sonarqube
sonar.jdbc.password=mypassword
sonar.jdbc.url=jdbc:postgresql://localhost:5432/sonarqube_db?currentSchema=sonarqube_schema
```

配置 Elasticsearch 存储路径

```bash
vi <sonarqubeHome>/conf/sonar.properties

sonar.path.data=/var/sonarqube/data
sonar.path.temp=/var/sonarqube/temp
```

启动服务

```bash
<sonarqubeHome>/bin/linux-x86-64/sonar.sh start

# http://localhost:9000
# admin/admin
```

#### FAQ

##### 检查日志

```bash
cat <sonarqubeHome>/logs/sonar.log
```

##### Startup error: 'can not run elasticsearch as root'

修改 sonar 安装目录权限

```bash
sudo chown -R sonar:sonar /opt/sonarqube-25.3.0.104237/
sudo chown -R sonar:sonar /var/sonarqube
```

##### Process exited with exit value [ElasticSearch]: 143

143 错误 99% 与前端启动相关，检查 web.log

