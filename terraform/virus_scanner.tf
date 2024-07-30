resource "kubernetes_deployment" "virus_scanner" {
  metadata {
    name = "virus-scanner"
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
          image = "lorenzobacchiani/virus-scanner"
          image_pull_policy = "Always"

          port {
            container_port = 8001
          }

          env {
            name  = "MCL"
            value = "120"
          }

          env {
            name  = "REDIS_HOST"
            value = "redis-service"
          }

          env {
            name  = "LIMIT"
            value = "400"
          }

          env {
            name  = "BATCH"
            value = "120"
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