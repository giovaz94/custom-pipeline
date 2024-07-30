resource "kubernetes_deployment" "link_analyzer" {
  metadata {
    name = "link-analyzer"
  }

  spec {
    selector {
      match_labels = {
        app = "link-analyzer"
      }
    }

    template {
      metadata {
        labels = {
          app = "link-analyzer"
        }
      }

      spec {
        container {
          name  = "link-analyzer"
          image = "lorenzobacchiani/link-analyzer"
          image_pull_policy = "Always"

          port {
            container_port = 8013
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
}

resource "kubernetes_service" "link_analyzer_service" {
  metadata {
    name = "link-analyzer-service"
  }

  spec {
    selector = {
      app = "link-analyzer"
    }

    port {
      protocol    = "TCP"
      port        = 8013
      target_port = 8013
    }
  }
}