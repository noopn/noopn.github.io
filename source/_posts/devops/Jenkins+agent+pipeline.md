---
layout: post
title: Jenkins agent/pipeline

date: 2024-01-03 05:20:25
categories:
  - DevOps
tags:
  - 工程化
  - DevOps
---

#### Agent

官方建议使用无论何时都使用 Agent 执行任务，而不是使用内置的节点

##### 停用内置 Agent

- 在 Manage Jenkins -> Nodes -> Build-In Node 的配置中，配置 Number of executors 为 0。

- label 填写 don't use Built-In node

- Usage 选择 Only build jobs with label expressions matching this node。

- 点击保存，这样就不会使用内置节点执行任务了。

##### 创建新的 Agent

Agent 节点可以是物理机，也可以是虚拟机。**必须装有和 Jenkins controller 相同的 Java 环境**， 不需要安装 jenkins, 只用于执行任务。

- 点击新建节点，选择 Permanent agent

- Number of executors 填写数量不能大于物理核心数，或是虚拟核心数。

- Remote root directory 会从 Jenkins controller 中同步 jenkins 相关文件，确保放在登录用户有权限执行的目录下，例如 `/home/user/jenkins`, user 是 Agent 节点的登录用户名。

- Labels 可以描述当前 Agent 的用途内置的环境

- Usage 选择 Use this node as much as possible

- Launch method 选择 Launch agents via SSH，填写 Host，并创建登录凭证， **凭证的类型一定要选择 username with password**

  在使用凭证登录的时候，需要校验相关权限，会去查找 Jenkins controller 上的 `~/.ssh` 目录下的 `known_hosts` 文件，如果没有则会需要手动创建 `.ssh` 文件夹（确保权限正确，不是 root 用户），在使用以下命令同步认证信息 `ssh-keyscan -H your_agent_host >> /home/your_user_name/.ssh/known_hosts`

  Host Key Verification Strategy 选择 Known hosts file Verification Strategy 进行验证

- 执行 docker 命令时报错 `permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock: Get "http://%2Fvar%2Frun%2Fdocker.sock/v1.48/containers/node-18:alpine/json": dial unix /var/run/docker.sock: connect: permission denied`

  Jenkins 会以 jenkins 用户身份运行， 把该用户加入本机 docker 组（例如：docker），以便它可以读写 `/var/run/docker.sock`

  ```bash
  sudo usermod -aG docker jenkins

  # 如果仍然没有权限，尝试重启系统
  docker run hello-world
  ```

- 点击保存，Jenkins 会自动检查 Agent 链接

#### Pipeline

##### workspace

通过在线的方式创建一个简单的 pipeline

```docker
pipeline {
    agent any

    stages {
        stage('without docker') {
            steps {
               sh '''
                touch without-docker.txt
               '''
            }
        }

         stage('with docker') {

            agent {
                docker {
                    image 'node:18-alpine'
                }
            }
            steps {
               sh '''
                npm -v
                touch with-docker.txt
               '''
            }
        }
    }
}

```

执行结束后在任务的 workspaces 目录下可以看到生成的多个文件夹，每个文件夹对应一个执行阶段

```bash
/home/jenkins/jenkins-agent/workspace/simple-pipeline on Agent1
/home/jenkins/jenkins-agent/workspace/simple-pipeline@2 on Agent1
```

如果想要合并这些文件夹,**共用上一阶段的产物**,添加如下的配置

```docker
agent {
  docker {
      image 'node:18-alpine'
      reuseNode true
  }
}
```

##### [Gitlab Plugin Pipeline](https://plugins.jenkins.io/gitlab-plugin/#plugin-content-introduction)

- 测试 Gitlab 对 Jenkins 的认证

  Jenkins 中点击右上角的头像，选择 security, 创建一个 API Token.

  点击任意一个任务，查看浏览器地址栏 `https://jenkins.iftrue.me/job/simple-freesyle/`,simple-freesyle 即为项目的名称（特殊字符需要转义，所以按地址栏中显示的准）, 记下这个项目名称

  在 Gitlab 中进入到一个项目中， setting -> webhooks -> add webhook, 填写 Jenkins 的地址，规则为 `https://[Jenkins用户ID]:[Jenkins_Api_Token]@jenkins.iftrue.me/project/[项目名称]`

  点击测试通过，在内网环境中可能需要关闭 webhook 的 ssl 验证，才不会报错。（内网环境使用 nginx 作为统一入口，会提示 `unable to get local issuer certificate`）

- 配置 Jenkins 对 Gitlab 的认证

  此认证配置仅用于访问 GitLab API，以便向 GitLab 发送构建状态。它不用于克隆 git 仓库。用于克隆的凭证（通常是 SSH 凭证）应该在 git 插件中单独配置。

  创建 Gitlab access tokens, setting -> Access Tokens, 选择 api 权限，复制生成的 token

  在 Jenkins 中创建一个凭证，选择 GitLab API Token, 填写生成的 Gitlab Access Token

  jenkins -> System Manage , 找到 GitLab 部分，填写 GitLab host URL 和创建的 GitLab API Token 凭证。（内网环境可能有证书报错的问题，在 高级选项中勾选 Ignore SSL Certificate Errors）

  保存后测试链接是否成功。

- 任务触发配置

  在一个 pipeline 项目中配置触发器，在 Build Triggers 配置中

  选择 Build when a change is pushed to GitLab，复制 GitLab webhook URL 地址，将项目部分的地址替换到 Gitlab 的 webhook 中，Jenkins 用户名和 Api token 仍然需要保留，点击测试通过。

  继续选择 Push Events，表示在 Gitlab 推送代码时触发 Jenkins 的构建。

  pipeline 中选择 pipeline script from SCM, 选择 GitLab 作为 SCM，填写仓库地址。

  保证在 Jenkins controller 中有 Git 环境，否则校验命令会执行失败。

  如果提示 `Host key verification failed.`, Jenkins 凭证中创建一个 SSH Username with private key 类型的凭证，填写 Gitlab 服务器的用户名，Jenkins controller 中的私钥 （如果私钥有密码也需要填写密码）。

  在 Gitlab SSH Key 管理中添加 Jenkins controller 的公钥，这样可以完成 git 的认证。

  如果任务在 Jenkins agent 中执行，Jenkins 默认使用 known_hosts 文件进行认证，gitlab 的认证信息必须添加到 Jenkins agent 的 known_hosts 文件中。

  ```bash
  ssh-keyscan -H gitlab_host >> /home/jenkins/.ssh/known_hosts
  ```

  也可以直接在 System -> Security -> Git Host Key Verification Configuration 中修改为 Accept first connection 会在首次链接后自动保存这个主机指纹。

  这样就可以在拉取代码后，执行项目中的 jenkinsfile 文件

##### 拉取项目

没有编译的过程，当任务被触发时，agent 节点会直接连接上目标服务器，拉取项目并更新并重新执行项目

安装 Publish Over SSH 插件， 进入系统管理 -> Publish over SSH

填写 Jenkins controller 的 SSH Key 密码，添加一个服务器配置，填写服务器的 IP 地址和用户名, 点击测试通过

配置 jenkinsfile

```groovy
pipeline {
    agent any
    stages {
        stage('Deploy') {
            steps {
                sshPublisher(publishers:
                    [sshPublisherDesc(
                        // Publish over SSH 插件配置的服务器名称
                        configName: 'crawler server',
                        transfers: [
                            sshTransfer(
                                // 远程目录，从 /home/your_username 目录下创建
                                remoteDirectory: 'crawler',
                                // 不能使用数组，多类文件可以使用多个 sshTransfer
                                sourceFiles:'*/**'
                            ),
                            sshTransfer(
                                // 由于ssh链接不是使用的交互式命令行所以.bashrc文件不会被执行
                                // 需要手动执行 source ~/.nvm/nvm.sh 以便于找到npm命令
                                execCommand: 'cd crawler && source ~/.nvm/nvm.sh && npm ci && npm run build && npm run start'
                            )
                          ],
                        //  开启查看详细的报错信息
                        verbose: true
                        ),
                    ]
                )
            }
        }
    }
}

```
