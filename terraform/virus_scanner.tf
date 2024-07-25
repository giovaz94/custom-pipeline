# Virus Scanner Deployment
resource "kubernetes_deployment" "virus_scanner" {
  metadata {
    name      = "virus-scanner"
    labels = {
      app = "virus-scanner"
    }
  }

  spec {
    selector {
      match_labels = {
        app = "virus-scanner"
      }
    }

    template {
      metadata {
        labels = {
          app = "virus-scanner"
        }
      }

      spec {
        container {
          name  = "virus-scanner"
          image = "giovaz94/virus-scanner-service:refactor-remove-rabbitmq"
          image_pull_policy = "Always"
          port {
            container_port = 8001
          }

          env {
            name  = "HOSTNAME"
            value = "rabbitmq-service"
          }
          env {
            name  = "RABBITMQ_USERNAME"
            value = "pipeline_broker"
          }
          env {
            name  = "RABBITMQ_PASSWORD"
            value = "p1p3l1n3"
          }
          env {
            name  = "RABBITMQ_VHOST"
            value = "pipeline-vhost"
          }
          env {
            name  = "QUEUE_NAME"
            value = "virusscan.queue"
          }
          env {
            name  = "DB_URL"
            value = "http://monitor-service:3200"
          }
          env {
            name  = "MCL"
            value = "120"
          }
        }

        restart_policy = "Always"
      }
    }
  }

  depends_on = [
    kubernetes_service.redis_service
  ]
}

# Virus Scanner Service
resource "kubernetes_service" "virus_scanner_service" {
  metadata {
    name      = "virus-scanner-service"
  }

  spec {
    selector = {
      app = "virus-scanner"
    }

    port {
      protocol   = "TCP"
      port       = 8001
      target_port = 8001
    }
  }

  depends_on = [
    kubernetes_deployment.virus_scanner
  ]
}