resource "kubernetes_deployment" "parser" {
  metadata {
    name = "parser"
  }

  spec {
    selector {
      match_labels = {
        app = "parser"
      }
    }

    template {
      metadata {
        labels = {
          app = "parser"
        }
      }

      spec {
        container {
          name  = "parser"
          image = "lorenzobacchiani/parser"
          image_pull_policy = "Always"

          port {
            container_port = 8011
          }

          env {
            name  = "REDIS_HOST"
            value = "redis-service"
          }

          env {
            name  = "MCL"
            value = "110"
          }

          env {
            name  = "LIMIT"
            value = "400"
          }

          env {
            name  = "BATCH"
            value = "110"
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

# Parser Service
resource "kubernetes_service" "parser_service" {
  metadata {
    name      = "parser-service"
  }

  spec {
    selector = {
      app = "parser"
    }

    port {
      protocol   = "TCP"
      port       = 8011
      target_port = 8011
    }
  }

  depends_on = [
    kubernetes_deployment.parser
  ]
}