# How to run the cluster

The following steps will guide you through the process of running the cluster, using 
a local environment. 


## Prerequisites
We'll use [k3d](https://k3d.io/) as wrapper in order to run our examples. A local installation is needed 
for this purpose.

## Steps
We'll start by creating a cluster with 3 nodes, and a load balancer. 

```bash
$ k3d cluster create -p "8081:80@loadbalancer" --agents 3
```

Once the cluster is up and running, we'll apply the manifest files inside the `k8s/parser` folder.
```bash
$ kubectl apply -f k8s/parser
```
