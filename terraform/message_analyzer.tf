resource "kubernetes_deployment" "message_analyzer" {
  metadata {
    name = "message-analyzer"
  }

  spec {
    selector {
      match_labels = {
        app = "message-analyzer"
      }
    }

    template {
      metadata {
        labels = {
          app = "message-analyzer"
        }
      }

      spec {
        container {
          name  = "message-analyzer"
          image = "lorenzobacchiani/message-analyzer"
          image_pull_policy = "Always"

          port {
            container_port = 8006
          }

          env {
            name  = "REDIS_HOST"
            value = "redis-service"
          }

          env {
            name  = "MCL"
            value = "300"
          }

          env {
            name  = "LIMIT"
            value = "400"
          }

          env {
            name  = "BATCH"
            value = "300"
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

# Message Analyzer Service
resource "kubernetes_service" "message_analyzer_service" {
  metadata {
    name      = "message-analyzer-service"
  }

  spec {
    selector = {
      app = "message-analyzer"
    }

    port {
      protocol   = "TCP"
      port       = 8006
      target_port = 8006
    }
  }

  depends_on = [
    kubernetes_deployment.message_analyzer
  ]
}