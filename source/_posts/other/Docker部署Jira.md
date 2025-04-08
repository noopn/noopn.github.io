---
layout: posts
title: Docker 部署Jira + 破解
date: 2022-03-04 22:00:05
categories:
  - 其他
tags:
  - Docker
---

#### 创建必要目录

```bash
mkdir -p docker-compose/jira
```

#### 创建 docker-compose.yml

- 修改映射路径为当前文件夹下的相对路径
- JIRA_PROXY_NAME = 域名
- JIRA_PROXY_PORT = 外部端口
- JIRA_PROXY_SCHEME = 协议
- POSTGRES_PASSWORD 修改数据库密码

```yml
services:
  jira_db:
    image: mysql:8.0
    container_name: jira_mysql
    environment:
      MYSQL_ROOT_PASSWORD: w.521@@ong.COM
      MYSQL_DATABASE: jira
      MYSQL_USER: jira
      MYSQL_PASSWORD: w.521@@ong.COM
    ports:
      - 19306:3306
    volumes:
      - ./data:/var/lib/mysql
    networks:
      - jira_network # 将 mysql 服务连接到 mynetwork 网络
    restart: always
  jira:
    image: atlassian/jira-software
    container_name: jira
    ports:
      - 19140:8080
    volumes:
      - ./jiraVolume:/var/atlassian/application-data/jira
      - ./lib:/opt/atlassian/jira/lib #驱动的目录，需要映射
    networks:
      - jira_network # 将 jira 服务连接到 mynetwork 网络
    restart: unless-stopped
volumes:
  mysql-data:
    driver: local
  jiraVolume:
    driver: local
networks:
  jira_network:
    # 定义名为 mynetwork 的网络
    driver: bridge # 使用默认的 bridge 驱动
```

#### 破解

- [下载](https://github.com/xiaonandl/atlassian-agent) atlassian-agent.jar 文件压缩包，并解压

- 将 `atlassian-agent.jar` 复制到容器内 `docker cp ./atlassian-agent.jar jira容器名称:/opt/jira`

- 在 `docker-compose/jira` 目录下执行 `docker-compose up` 启动动容器

- 进入容器 `docker exec -it jira` 容器名称 `/bin/bash`

- 修改环境变量 `cd /opt/jira/bin vi setenv.sh`

![](0001.png)

export JAVA_OPTS 修改为 export JAVA_OPTS="-javaagent:/opt/jira/atlassian-agent.jar ${JAVA_OPTS}"

- 重启容器, 在日志中可以看到 `========= agent working =========` 字样表示成功

- 再次进入容器 执行 `java -jar atlassian-agent.jar -p jsm -m aaa@bbb.com -n my_name -o https://zhile.io -s ABCD-1234-EFGH-5678`

**特别注意 -p 参数设置，通过 java -jar atlassian-agent.jar 查看使用帮助，每种产品有不同的标识**

-m 邮箱任意填写
-n 名称任意填写
-o 网址任意填写
-s server id 再安装时查看

复制执行命令之后产生的激活码，复制到激活码的窗口完成激活。

#### FAQ

- 连接时报错 Could not find driver with class name: com.mysql.cj.jdbc.Driver

  [下载](https://dev.mysql.com/downloads/connector/j/8.0.html) 对应版本的驱动

  将驱动放在 jira 安装目录(或 docker 映射的目录)/lib 下面

  重启 jira 服务
