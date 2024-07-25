# Image Recognizer Deployment
resource "kubernetes_deployment" "image_recognizer" {
  metadata {
    name      = "image-recognizer"
    labels = {
      app = "image-recognizer"
    }
  }

  spec {
    selector {
      match_labels = {
        app = "image-recognizer"
      }
    }

    template {
      metadata {
        labels = {
          app = "image-recognizer"
        }
      }

      spec {
        container {
          name  = "image-recognizer"
          image = "giovaz94/image-recognizer-service:refactor-remove-rabbitmq"
          image_pull_policy = "Always"

          port {
            container_port = 8004
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
            name  = "QUEUE_NAME"
            value = "imagerec.queue"
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
            value = "90"
          }
        }

        restart_policy = "Always"
      }
    }
  }
  depends_on = [
    kubernetes_service.redis_service,
    kubernetes_service.image_analyzer_service
  ]
}

# Image Recognizer Service
resource "kubernetes_service" "image_recognizer_service" {
  metadata {
    name      = "image-recognizer-service"
  }

  spec {
    selector = {
      app = "image-recognizer"
    }

    port {
      protocol   = "TCP"
      port       = 8004
      target_port = 8004
    }
  }

  depends_on = [
    kubernetes_deployment.image_recognizer
  ]
}