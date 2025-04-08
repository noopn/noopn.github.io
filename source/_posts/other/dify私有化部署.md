---
layout: posts
title: Dify 工作流
date: 2025-02-05 12:17:00
categories:
  - 其他
tags:
  - AI
  - Dify
---

#### 下载 Dify 源码

```bash
git clone https://github.com/langgenius/dify.git
```

#### 启动 Dify

进入 Dify 源代码的 docker 目录，执行一键启动命令：

```bash
cd dify/docker
docker compose up -d
```

如果您的系统安装了 Docker Compose V2 而不是 V1，请使用 docker compose 而不是 docker-compose。通过$ docker compose version 检查版本号：Docker

```bash
[+] Running 7/7
✔ Container docker-web-1 Started 1.0s
✔ Container docker-redis-1 Started 1.1s
✔ Container docker-weaviate-1 Started 0.9s
✔ Container docker-db-1 Started 0.0s
✔ Container docker-worker-1 Started 0.7s
✔ Container docker-api-1 Started 0.8s
✔ Container docker-nginx-1 Started
```

检查容器是否正常运行,包括 3 个业务服务 api / worker / web，以及 4 个基础组件 weaviate / db / redis / nginx，都要处于启动状态。注意下面每一个服务的 status 都要是 Up 状态才算真正启动成功。

```bash
docker compose ps

NAME IMAGE COMMAND SERVICE CREATED STATUS PORTS
docker-api-1 langgenius/dify-api:0.3.2 "/entrypoint.sh" api 4 seconds ago Up 2 seconds 80/tcp, 5001/tcp
docker-db-1 postgres:15-alpine "docker-entrypoint.s…" db 4 seconds ago Up 2 seconds 0.0.0.0:5432->5432/tcp
docker-nginx-1 nginx:latest "/docker-entrypoint.…" nginx 4 seconds ago Up 2 seconds 0.0.0.0:80->80/tcp
docker-redis-1 redis:6-alpine "docker-entrypoint.s…" redis 4 seconds ago Up 3 seconds 6379/tcp
docker-weaviate-1 semitechnologies/weaviate:1.18.4 "/bin/weaviate --hos…" weaviate 4 seconds ago Up 3 seconds
docker-web-1 langgenius/dify-web:0.3.2 "/entrypoint.sh" web 4 seconds ago Up 3 seconds 80/tcp, 3000/tcp
docker-worker-1 langgenius/dify-api:0.3.2 "/entrypoint.sh" worker 4 seconds ago Up 2 seconds 80/tcp, 5001/tcp
```

#### 升级 Dify

进入 Dify 源代码的 docker 目录，按顺序执行以下命令：

```bash
cd dify/docker
git pull origin main
docker compose down
docker compose pull
docker compose up -d
```

#### FAQ

- 首页正常显示，当点击设置管理员用户页面一直在加载中，浏览器控制台报错,

```bash
/console/api/setup 502
```

检查服务的状态 status 栏并是不是 Up 状态

```bash
docker compose ps
```

查看日志

```bash
 docker logs docker-api-1
```

![](001.png)

这是由于 Docker 运行权限不够，需要被赋予更高的权限。

在 docker-compose.yaml 文件中，给 services 下每一个 service 最后一行都加上 privileged: true,然后重新启动 Dify 即可。

- 由于在第一个问题中，Ubuntu 系统中，本地修改了 docker-compose.yaml 文件，在使用 git pull origin main 会提示本地有文件没有提交：

```bash
error: Your local changes to the following files would be overwritten by merge:
docker/docker-compose.yaml
Please, commit your changes or stash them before you can merge.

# 需要提交修改
git config --global user.email "xxx"
git config --global user.name "xxx"

git add docker-compose.yaml
git commit -m "local change"
```

- Docker 无法拉取镜像

```bash
// daemon.json可能会不存在，直接 vi /etc/docker/daemon.json可以创建
sudo vi /etc/docker/daemon.json

{
  "registry-mirrors": ["新的镜像源地址"]
}

systemctl restart  docker //重启docker

docker info //查看镜像源有没有配置成功
```
