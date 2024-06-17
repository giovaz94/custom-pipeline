# Create separate namespace for monitoring
resource "kubernetes_namespace" "monitoring_namespace" {
  metadata {
    name = "monitoring"
  }
}

# ClusterRole resource
resource "kubernetes_cluster_role" "prometheus" {
  metadata {
    name = "prometheus"
  }

  rule {
    api_groups = [""]
    resources  = ["nodes", "nodes/proxy", "services", "endpoints", "pods"]
    verbs      = ["get", "list", "watch"]
  }

  rule {
    api_groups = ["extensions"]
    resources  = ["ingresses"]
    verbs      = ["get", "list", "watch"]
  }

  rule {
    non_resource_urls = ["/metrics"]
    verbs             = ["get"]
  }
}

# ClusterRoleBinding resource
resource "kubernetes_cluster_role_binding" "prometheus" {
  metadata {
    name = "prometheus"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.prometheus.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = "default"
  }
}

resource "kubernetes_config_map" "prometheus_server_conf" {
  metadata {
    name      = "prometheus-server-conf"
    labels = {
      name = "prometheus-server-conf"
    }
  }

  data = {
    "prometheus.yml" = <<-EOT
      global:
        scrape_interval: 5s
        evaluation_interval: 5s
      scrape_configs:
        - job_name: 'prometheus'
          scrape_interval: 5s
          static_configs:
            - targets: [ 'localhost:9090' ]
        - job_name: 'kubernetes-service-endpoints'
          kubernetes_sd_configs:
            - role: endpoints
          relabel_configs:
            - action: labelmap
              regex: __meta_kubernetes_service_label_(.+)
            - source_labels: [ __meta_kubernetes_namespace ]
              action: replace
              target_label: kubernetes_namespace
            - source_labels: [ __meta_kubernetes_service_name ]
              action: replace
              target_label: kubernetes_name
        - job_name: 'envoy'
          metrics_path: /stats/prometheus
          static_configs:
            - targets: ['envoy-admin.default.svc.cluster.local:9901']
    EOT
  }
}

resource "kubernetes_deployment" "prometheus_deployment" {
  metadata {
    name      = "prometheus-deployment"
    labels = {
      app = "prometheus-server"
    }
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "prometheus-server"
      }
    }

    template {
      metadata {
        labels = {
          app = "prometheus-server"
        }
      }

      spec {
        container {
          name  = "prometheus"
          image = "prom/prometheus"

          args = [
            "--config.file=/etc/prometheus/prometheus.yml",
            "--storage.tsdb.path=/prometheus/"
          ]

          port {
            container_port = 9090
          }

          volume_mount {
            name       = "prometheus-config-volume"
            mount_path = "/etc/prometheus/"
          }

          volume_mount {
            name       = "prometheus-storage-volume"
            mount_path = "/prometheus/"
          }

          security_context {
            run_as_user = 0
          }
        }

        volume {
          name = "prometheus-config-volume"

          config_map {
            name = kubernetes_config_map.prometheus_server_conf.metadata[0].name
            default_mode = "0444"  # Octal permission mode as string
          }
        }

        volume {
          name = "prometheus-storage-volume"

          empty_dir {}
        }

        service_account_name = "default"
      }
    }
  }
}

resource "kubernetes_service" "prometheus_service" {
  metadata {
    name      = "prometheus-service"
    annotations = {
      "prometheus.io/scrape" = "true"
      "prometheus.io/port"   = "9090"
    }
  }

  spec {
    selector = {
      app = "prometheus-server"
    }

    type = "LoadBalancer"

    port {
      port        = 8080
      target_port = 9090
    }
  }
}