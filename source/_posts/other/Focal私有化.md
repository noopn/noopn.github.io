---
layout: posts
title: FocalBoard 私有化部署
date: 2024-08-26 13:17:00
categories:
  - 其他
tags:
  - focalBoard
---

#### 最后更新

**2024-12-13**

#### 官方安装包

安装 [官方包](https://github.com/mattermost-community/focalboard/releases), [\[官方文档\]](https://www.focalboard.com/download/personal-edition/ubuntu/)

```bash
wget https://github.com/mattermost/focalboard/releases/download/v0.15.0/focalboard-server-linux-amd64.tar.gz
tar -xvzf focalboard-server-linux-amd64.tar.gz
sudo mv focalboard /opt
```

#### 安装数据库

```bash
sudo apt install postgresql postgresql-contrib
```

以 postgres 用户创建一个新的数据库

```bash
sudo --login --user postgres
psql

CREATE DATABASE <your-db-user>;
CREATE USER <your-db-user> WITH PASSWORD <'your-password'>;

# 查看schema列表
\dn

# 查看用户列表
\du

# 查看数据库列表

\l+

# 赋予用于操作数据库的所有权限
GRANT ALL PRIVILEGES ON DATABASE <your-db> TO <your-db-user>;

GRANT ALL ON SCHEMA public TO <your-db-user>;

\c <your-db-user> postgres
# You are now connected to database "your-db-user" as user "postgres".

# 赋予有用操作public schema的权限
GRANT ALL ON SCHEMA public TO <your-db-user>;

# 退出 postgres 用户
\q

exit
```

配置链接信息

```bash
vi /opt/focalboard/config.json

"dbtype": "postgres",
"dbconfig": "postgres://your-db-user:your-db-password@localhost/boards?sslmode=disable&connect_timeout=10"
```

#### 启动服务

```bash
sudo vi /lib/systemd/system/focalboard.service

[Unit]
Description=Focalboard server

[Service]
Type=simple
Restart=always
RestartSec=5s
ExecStart=/opt/focalboard/bin/focalboard-server
WorkingDirectory=/opt/focalboard

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl start focalboard.service
sudo systemctl enable focalboard.service

curl localhost:8000
```

#### nginx 配置

```bash
server {
   listen      443;
   listen [::]:443;
   server_name focal.iftrue.me;

   location ~ /ws/* {
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       client_max_body_size 50M;
       proxy_set_header Host $http_host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_set_header X-Frame-Options SAMEORIGIN;
       proxy_buffers 256 16k;
       proxy_buffer_size 16k;
       client_body_timeout 60;
       send_timeout 300;
       lingering_timeout 5;
       proxy_connect_timeout 1d;
       proxy_send_timeout 1d;
       proxy_read_timeout 1d;
       proxy_pass http://192.168.48.148:8000;
   }

   location / {
       client_max_body_size 50M;
       proxy_set_header Connection "";
       proxy_set_header Host $http_host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_set_header X-Frame-Options SAMEORIGIN;
       proxy_buffers 256 16k;
       proxy_buffer_size 16k;
       proxy_read_timeout 600s;
       proxy_cache_revalidate on;
       proxy_cache_min_uses 2;
       proxy_cache_use_stale timeout;
       proxy_cache_lock on;
       proxy_http_version 1.1;
       proxy_pass http://192.168.48.148:8000;
   }
}
```

#### FAQ

- error [2025-03-17 04:28:23.400 Z] Table creation / migration failed caller="sqlstore/sqlstore.go:75" error="pq: permission denied for schema public"

  参照数据库配置步骤，需要赋予用户操作 public schema 的权限


