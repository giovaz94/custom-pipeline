resource "kubernetes_deployment" "attachment_manager" {
  metadata {
    name = "attachment-manager"
  }

  spec {
    selector {
      match_labels = {
        app = "attachment-manager"
      }
    }

    template {
      metadata {
        labels = {
          app = "attachment-manager"
        }
      }

      spec {
        container {
          name  = "attachment-manager"
          image = "lorenzobacchiani/attachment-manager"
          image_pull_policy = "Always"

          port {
            container_port = 8002
          }

          env {
            name  = "MCL"
            value = "231"
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
            value = "231"
          }
        }

        restart_policy = "Always"
      }
    }
  }
  depends_on = [
    kubernetes_service.redis_service,
  ]
}

resource "kubernetes_service" "attachment_manager_service" {
  metadata {
    name      = "attachment-manager-service"
  }

  spec {
    selector = {
      app = "attachment-manager"
    }

    port {
      protocol   = "TCP"
      port       = 8002
      target_port = 8002
    }
  }

  depends_on = [
    kubernetes_deployment.attachment_manager
  ]
}
