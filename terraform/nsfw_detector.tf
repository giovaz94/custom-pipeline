# NSFW Detector Deployment
resource "kubernetes_deployment" "nsfw_detector" {
  metadata {
    name      = "nsfw-detector"
    labels = {
      app = "nsfw-detector"
    }
  }

  spec {
    selector {
      match_labels = {
        app = "nsfw-detector"
      }
    }

    template {
      metadata {
        labels = {
          app = "nsfw-detector"
        }
      }

      spec {
        container {
          name  = "nsfw-detector"
          image = "giovaz94/nsfw-detector-service:development"
          image_pull_policy = "Always"

          port {
            container_port = 8005
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
            value = "nsfwdet.queue"
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
    kubernetes_service.rabbitmq_service,
    kubernetes_service.redis_service,
    kubernetes_service.image_analyzer_service
  ]
}

# NSFW Detector Service
resource "kubernetes_service" "nsfw_detector_service" {
  metadata {
    name      = "nsfw-detector-service"
  }

  spec {
    selector = {
      app = "nsfw-detector"
    }

    port {
      protocol   = "TCP"
      port       = 8005
      target_port = 8005
    }

    type = "ClusterIP"
  }

  depends_on = [
    kubernetes_deployment.nsfw_detector
  ]
}