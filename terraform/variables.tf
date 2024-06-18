variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
}

variable "region" {
  default = "ams3"
  type = string
  description = "The region where the cluster will be created"
}

variable "k8s_clustername" {
  default = "testing-cluster"
  type = string
  description = "The name of the Kubernetes cluster"
}

variable "size" {
  default = "m-2vcpu-16gb"
  type = string
  description = "The size of the nodes in the cluster"
}

variable "k8s_version" {
  default = "1.30.1-do.0"
  type = string
  description = "The version of Kubernetes to use"
}

variable "k8s_poolname" {
  default = "testing-cluster-pool"
  type = string
  description = "The name of the default node pool"
}

variable "k8s_count" {
  default = "4"
  type = number
  description = "The number of nodes in the default node pool"
}

data "digitalocean_ssh_key" "terraform" {
  name = "macos"
}
