resource "kubernetes_deployment" "text_analyzer" {
  metadata {
    name = "text-analyzer"
  }

  spec {
    selector {
      match_labels = {
        app = "text-analyzer"
      }
    }

    template {
      metadata {
        labels = {
          app = "text-analyzer"
        }
      }

      spec {
        container {
          name  = "text-analyzer"
          image = "lorenzobacchiani/text-analyzer"
          image_pull_policy = "Always"

          port {
            container_port = 8014
          }

          env {
            name  = "REDIS_HOST"
            value = "redis-service"
          }

          env {
            name  = "MCL"
            value = "120"
          }

          env {
            name  = "LIMIT"
            value = "400"
          }

          env {
            name  = "BATCH"
            value = "200"
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

resource "kubernetes_service" "text_analyzer_service" {
  metadata {
    name = "text-analyzer-service"
  }

  spec {
    selector = {
      app = "text-analyzer"
    }

    port {
      protocol    = "TCP"
      port        = 8014
      target_port = 8014
    }
  }
}