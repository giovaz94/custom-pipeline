resource "kubernetes_deployment" "message_analyzer" {
  metadata {
    name      = "message-analyzer"
    labels = {
      app = "message-analyzer"
    }
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
          image = "giovaz94/message-analyzer-service:development"
          image_pull_policy = "Always"

          port {
            container_port = 8006
          }

          env {
            name  = "HOSTNAME"
            value = "rabbitmq-service"
          }
          env {
            name  = "REDIS_HOST"
            value = "redis-service"
          }
          env {
            name  = "RABBITMQ_USERNAME"
            value = "pipeline_broker"
          }
          env {
            name  = "RABBITMQ_PASSWORD"
            value = "p1p3l1n3"
          }
          env {
            name  = "RABBITMQ_VHOST"
            value = "pipeline-vhost"
          }
          env {
            name  = "QUEUE_NAME"
            value = "messageanalyzer.queue"
          }
          env {
            name  = "DB_URL"
            value = "http://monitor-service:3200"
          }
          env {
            name  = "MCL"
            value = "300"
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