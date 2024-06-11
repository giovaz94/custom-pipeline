resource "kubernetes_deployment" "monitor" {
  metadata {
    name = "monitor"
  }

  spec {
    selector {
      match_labels = {
        app = "monitor"
      }
    }

    template {
      metadata {
        labels = {
          app = "monitor"
        }
      }

      spec {
        container {
          name  = "monitor"
          image = "giovaz94/monitor-service:development"
          image_pull_policy = "Always"

          port {
            container_port = 3200
          }

          env {
            name  = "BATCH_SIZE"
            value = "50"
          }
          env {
            name  = "RECORD_NUMBER"
            value = "10"
          }
          env {
            name  = "PORT"
            value = "3200"
          }
        }

        restart_policy = "Always"
      }
    }
  }

  depends_on = [
    kubernetes_deployment.rabbitmq,
    kubernetes_service.rabbitmq_service
  ]
}

# Create the Monitor service
resource "kubernetes_service" "monitor_service" {
  metadata {
    name = "monitor-service"
  }

  spec {
    selector = {
      app = "monitor"
    }

    port {
      protocol   = "TCP"
      port       = 3200
      target_port = 3200
    }
  }

  depends_on = [ 
    kubernetes_service.monitor_service
  ]
}