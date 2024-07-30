resource "kubernetes_deployment" "header_analyzer" {
  metadata {
    name = "header-analyzer"
  }

  spec {
    selector {
      match_labels = {
        app = "header-analyzer"
      }
    }

    template {
      metadata {
        labels = {
          app = "header-analyzer"
        }
      }

      spec {
        container {
          name  = "header-analyzer"
          image = "lorenzobacchiani/no-mcl"
          image_pull_policy = "Always"

          port {
            container_port = 8012
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
    kubernetes_service.redis_service
  ]
}

resource "kubernetes_service" "header_analyzer_service" {
  metadata {
    name = "header-analyzer-service"
  }

  spec {
    selector = {
      app = "header-analyzer"
    }

    port {
      protocol    = "TCP"
      port        = 8012
      target_port = 8012
    }
  }
}