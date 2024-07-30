# Create the Entrypoint deployment
resource "kubernetes_deployment" "entrypoint" {
  metadata {
    name = "entrypoint"
    labels = {
      app = "entrypoint"
    }
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "entrypoint"
      }
    }

    template {
      metadata {
        labels = {
          app = "entrypoint"
        }
      }

      spec {
        termination_grace_period_seconds = 60

        container {
          name  = "entrypoint"
          image = "lorenzobacchiani/entrypoint"
          image_pull_policy = "Always"

          port {
            container_port = 8010
          }

          env {
            name  = "PORT"
            value = "8010"
          }

          env {
            name  = "REFRESH_TIME"
            value = "300000"
          }

          env {
            name  = "LS_ENABLED"
            value = "true"
          }

          env {
            name  = "REDIS_HOST"
            value = "redis-service"
          }

          env {
            name  = "LIMIT"
            value = "10000"
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

resource "kubernetes_service" "entrypoint_service" {
  metadata {
    name      = "entrypoint-service"
    labels = {
      app = "entrypoint"
    }
  }

  spec {
    selector = {
      app = "entrypoint"
    }

    port {
      port        = 80
      protocol    = "TCP"
      target_port = 8010
    }

    type = "LoadBalancer"
  }

  depends_on = [ 
    kubernetes_deployment.entrypoint 
  ]
}
