terraform {
  required_providers {
    digitalocean = {
      source = "digitalocean/digitalocean"
      version = "~> 2.0"
      
    }

    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.16.1"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_kubernetes_cluster" "k8s_cluster_do" {
  name    = var.k8s_clustername
  region  = var.region
  version = var.k8s_version

  tags = ["k8s"]

  # This default node pool is mandatory
  node_pool {
    name       = var.k8s_poolname
    size       = var.size
    auto_scale = false
    node_count = var.k8s_count
  }
}

provider "kubernetes" {
  host                   = digitalocean_kubernetes_cluster.k8s_cluster_do.endpoint
  token                  = digitalocean_kubernetes_cluster.k8s_cluster_do.kube_config[0].token
  cluster_ca_certificate = base64decode(digitalocean_kubernetes_cluster.k8s_cluster_do.kube_config[0].cluster_ca_certificate)
  config_path = "~/.kube/config"
}





