---
layout: posts
title: OpenFaas 部署/应用
mathjax: true
date: 2025-03-22 11:49:46
categories:
  - 其他
tags:
  - OpenFaaS
---

#### 安装

OpenFaaS 依赖 Kubernetes 集群， 参考 [kubernetes 安装文档](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/), 首先关闭 swap 

```bash
# 删除swap所在行
sudo vi /etc/fstab
sudo swapoff -a
# 验证
free -h
```

安装一个 container runtime 官方推荐 [containerd](https://github.com/containerd/containerd/blob/main/docs/getting-started.md)，安装成功后，初始化控制节点

```bash
sudo kubeadm init --pod-network-cidr=10.244.0.0/16

# 如果报错  [ERROR FileContent--proc-sys-net-ipv4-ip_forward]: /proc/sys/net/ipv4/ip_forward contents are not set to 1
# Kubernetes 节点需要开启 IPv4 转发（IP forwarding），这样 Node 可以把 Pod 的网络流量转发到其他节点或外部网络。

sudo nano /etc/sysctl.conf
net.ipv4.ip_forward=1 # 添加或打开注释
sudo sysctl -p # 保存
```

初始化成功后参照控制台输出执行 [配置命令](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/#more-information)

安装一个 [网络插件](https://kubernetes.io/docs/concepts/cluster-administration/addons/#networking-and-network-policy) 以便于容器间通信，或访问外部网络

```bash
kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml

# 如果报错Failed to check br_netfilter: stat /proc/sys/net/bridge/bridge-nf-call-iptables: no such file or directory
# 说明 内核缺少 br_netfilter 模块或相关配置没有启用，这是 Flannel 启动 VXLAN 网络所必须的。

sudo modprobe br_netfilter  # 加载 br_netfilter 模块
lsmod | grep br_netfilter   # 确认模块加载

# 开启 bridge-nf-call-iptables
echo "br_netfilter" | sudo tee /etc/modules-load.d/k8s.conf
echo "net.bridge.bridge-nf-call-iptables = 1" | sudo tee /etc/sysctl.d/k8s.conf
echo "net.bridge.bridge-nf-call-ip6tables = 1" | sudo tee -a /etc/sysctl.d/k8s.conf
sudo sysctl --system

#  重新部署
kubectl delete -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml
kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml
```

OpenFaaS 安装参考 [官方文档](https://docs.openfaas.com/deployment/kubernetes/), 安装 openfaas-ce 后，命令行会返回一段信息, 依次执行这些命令

```bash
# 获取 faas-cli（OpenFaaS 的命令行工具），用来操作 OpenFaaS
arkade get faas-cli

#  安装后查看版本
faas-cli version

# 等待 OpenFaaS Gateway 部署完成，gateway 是 OpenFaaS 的 核心入口 / UI / API Server。
kubectl rollout status -n openfaas deploy/gateway
```

如果命令 `kubectl rollout status -n openfaas deploy/gateway` 不成功， 检查 coredns 的 forward 配置

```bash
kubectl edit configmap coredns -n kube-system

forward . 192.168.48.1 # 修改为宿主机ip

kubectl rollout restart deployment coredns -n kube-system # 重启服务
```

UI 界面访问

```bash
# 查看端口 
kubectl get svc -n openfaas
# gateway-external   NodePort    10.103.137.90    <none>        8080:31112/TCP   39m
# 此时就可以通过 31112 端口访问 ui 界面了


# 登录
echo -n $PASSWORD | faas-cli login --gateway http://192.168.48.133:31112 --username admin --password-stdin
# Calling the OpenFaaS server to validate the credentials...
# WARNING! You are not using an encrypted connection to the gateway, consider using HTTPS.
# credentials saved for admin http://192.168.48.133:31112

echo $PASSWORD

# 修改密码
echo -n "NewPassword123" | base64

kubectl get secret basic-auth -n openfaas -o yaml
# 替换 basic-auth-password

# 重启服务
kubectl rollout restart deployment gateway -n openfaas
```

系统重启准备

```bash
kubectl drain openfass --ignore-daemonsets --force --delete-emptydir-data

# --ignore-daemonsets → 不驱逐 DaemonSet Pod
# --force → 强制在单节点上驱逐 Pod
# --delete-emptydir-data → 删除使用 emptyDir 的 Pod
sudo reboot

# 把节点状态改回 可调度
kubectl uncordon openfass
kubectl get nodes
```

