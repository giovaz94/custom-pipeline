# Image Analyzer Deployment
resource "kubernetes_deployment" "image_analyzer" {
  metadata {
    name      = "image-analyzer"
    labels = {
      app = "image-analyzer"
    }
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
          image = "giovaz94/image-analyzer-service:development"
          image_pull_policy = "Always"
          port {
            container_port = 8003
          }

          env {
            name  = "HOSTNAME"
            value = "rabbitmq-service"
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
            name  = "INPUT_QUEUE_NAME"
            value = "imageanalyzer.queue"
          }
          env {
            name  = "OUTPUT_QUEUE_NAME"
            value = "imageanalyzer.out.queue"
          }
          env {
            name  = "DB_URL"
            value = "http://monitor-service:3200"
          }
          env {
            name  = "REDIS_HOST"
            value = "redis-service"
          }
          env {
            name  = "MCL"
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