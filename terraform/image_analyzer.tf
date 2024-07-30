resource "kubernetes_deployment" "image_analyzer" {
  metadata {
    name = "image-analyzer"
  }

  spec {
    selector {
      match_labels = {
        app = "image-analyzer"
      }
    }

    template {
      metadata {
        labels = {
          app = "image-analyzer"
        }
      }

      spec {
        container {
          name  = "image-analyzer"
          image = "lorenzobacchiani/image-analyzer"
          image_pull_policy = "Always"

          port {
            container_port = 8003
          }

          env {
            name  = "REDIS_HOST"
            value = "redis-service"
          }

          env {
            name  = "MCL"
            value = "231"
          }

          env {
            name  = "LIMIT"
            value = "400"
          }

          env {
            name  = "BATCH"
            value = "231"
          }
        }

        restart_policy = "Always"
      }
    }
  }
  depends_on = [
    kubernetes_service.rabbitmq_service,
    kubernetes_service.redis_service
  ]
}

# Image Analyzer Service
resource "kubernetes_service" "image_analyzer_service" {
  metadata {
    name      = "image-analyzer-service"
  }

  spec {
    selector = {
      app = "image-analyzer"
    }

    port {
      protocol   = "TCP"
      port       = 8003
      target_port = 8003
    }
  }

  depends_on = [
    kubernetes_deployment.image_analyzer
  ]
}