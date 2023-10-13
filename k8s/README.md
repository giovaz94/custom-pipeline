# How to run the cluster

The following steps will guide you through the process of running the cluster, using 
a local environment. 


## Prerequisites
We'll use [k3d](https://k3d.io/) as wrapper in order to run our examples. A local installation is needed 
for this purpose.

## Steps
We'll start by creating a cluster with 3 nodes, and a load balancer. 

```bash
$ k3d cluster create -p "8010:8010" --agents 3
```

Apply the RabbitMQ server running the following command:
```bash
$ kubectl apply -f k8s/rabbitmq/
```

Once the service is up and running we can apply the rest of the services.
```bash
$ kubectl apply -f k8s/entrypoint/
$ kubectl apply -f k8s/parser/
```

Finally, we expose the application using an ingress.
```bash
$ kubectl apply -f k8s/ingress.yaml
```