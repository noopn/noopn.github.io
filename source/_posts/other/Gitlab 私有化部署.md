---
layout: posts
title: Gitlab 私有化部署
date: 2022-03-04 22:17:00
categories:
  - 其他
tags:
  - gitlab
---

#### 最后更新

**2024-08-12**

#### 官方安装包

安装必要依赖

```bash
sudo apt-get update
sudo apt-get install -y curl openssh-server ca-certificates tzdata perl
```

安装邮件服务，配置项选择 Internet Site，mail name 填写当前服务器 DNS.

```bash
sudo apt-get install -y postfix
```

添加仓库

```bash
curl https://packages.gitlab.com/install/repositories/gitlab/gitlab-ee/script.deb.sh | sudo bash
```

安装, 填写需要访问的域名

```bash
sudo EXTERNAL_URL="https://gitlab.example.com" apt-get install gitlab-ee
```

nginx 配置

```bash
server {
    listen      80  ssl;
    listen [::]:443  ssl;
    server_name gitlab.iftrue.me;

    location / {
        proxy_pass http://192.168.48.160; # 按照 gitlab.rb 是否开启了 https 访问，选择 http 或 https    
        proxy_set_header X-Forwarded-Host $host:$server_port;
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

配置自动启动

```bash
[Unit]
Description=SonarQube service
After=syslog.target network.target

[Service]
Type=simple
User=sonar
Group=sonar
PermissionsStartOnly=true

# java 路径使用 whereis java 插卡
# /opt/sonarqube/lib/sonar-application-<sonar-version>.jar
ExecStart=/bin/nohup /opt/java/bin/java -Xms32m -Xmx32m -Djava.net.preferIPv4Stack=true -jar /opt/sonarqube/lib/sonar-application-25.1.0.102122.jar

StandardOutput=journal
LimitNOFILE=131072
LimitNPROC=8192
TimeoutStartSec=5
Restart=always
SuccessExitStatus=143

[Install]
WantedBy=multi-user.target
```

修改配置文件 `/etc/gitlab/gitlab.rb`

```bash
# 修改外部访问地址，用于项目的下载地址，需要有完整的协议和端口号
external_url "https://gitlab.iftrue.me"

# 修改ssh端口，用于 ssh 克隆项目

gitlab_rails['gitlab_shell_ssh_port'] = 24922

# 保存后应用配置
sudo gitlab-ctl stop
sudo gitlab-ctl reconfigure
sudo gitlab-ctl start
```

如果在 Gitlab 前面有统一的反向代理，无需 Gitlab 本身处理 SSL 证书，可以将 Gitlab 的 nginx 配置为 80 端口。[\[文档\]](https://docs.gitlab.com/omnibus/settings/ssl/#configure-a-reverse-proxy-or-load-balancer-ssl-termination)

```bash
nginx['enable'] = true
nginx['listen_port'] = 80
nginx['listen_https'] = false

sudo gitlab-ctl reconfigure
```

nginx 配置参照 docker 的配置

#### Docker 方式安装

只需要准备好证书文件，配置.yml 文件即可使用

> /docker/gitlab/docker-compose.yml

```bash
version: '3.6'
services:
  gitlab:
    image: gitlab/gitlab-ee:latest
    container_name: gitlab
    restart: always
    # 必填：访问gitlab的域名
    hostname: 'gitlab.iftrue'
    environment:
      GITLAB_OMNIBUS_CONFIG: |
        # 必填： 外部访问gitlab的地址
        # 用于内部生成外部访问的链接，例如 clone地址
        # 即使通过nginx代理访问gitlab, 协议也必须相同
        external_url 'https://gitlab.iftrue.com'
        # 首次登录时的免密
        gitlab_rails['initial_root_password']='xxxx'
        # ssh 端口
        gitlab_rails['gitlab_shell_ssh_port'] = 24922
    ports:
      # 外部和内部端口必须与external_url端口相同
      - '9348:9348'
      - '24922:22'
    volumes:
      - './config:/etc/gitlab'
      - './logs:/var/log/gitlab'
      - './data:/var/opt/gitlab'
    shm_size: '256m'
    # 设置日志大小，避免磁盘写满
    logging:
      driver: "json-file"
      options:
        max-size: "50m"  # 单个日志文件最大为 50MB
        max-file: "5"    # 最多保留 5 个日志文件
```

启动服务，需要等待一段时间，观察 docker 状态是否是 healthy

```bash
#  拉取最新镜像
docker compose pull
docker compose up -d
```

获取/修改 初始密码

```bash
docker exec -it  gitlab /bin/bash
```

查看初始密码，安装 gitlab 后 24 小时会自动删除

```bash
cat /etc/gitlab/initial_root_password
```

修改初始密码

```bash
gitlab-rails console                   # 进入命令行
u=User.where(id:1).first               # 查找root用户
u.password='12345678'                  # 修改密码
u.password_confirmation='12345678'     # 确认密码
u.save                                 # 保存配置
```

nginx 配置

```yml
server {
  listen      443  ssl;
  listen [::]:443  ssl;
  server_name gitlab.iftrue.me;

  location / {
    # 如果 external_url 设置了 https 就要访问https地址
    # 可以选择关闭强制https跳转的配置
    proxy_pass https://192.168.48.213:9348;
    proxy_set_header X-Forwarded-Host $host:$server_port;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}


# 因为社区版的 nginx 不支持 tcp 流量转发，因此下面配置无效
# 可以使用防火墙进行转发

# server {
#   listen      24922  ssl;
#     listen [::]:24922  ssl;
#     server_name gitlab.iftrue.me;
#     location / {
#     proxy_pass https://192.168.48.213:24922;
#   }
# }
```
