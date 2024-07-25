# Parser Deployment
resource "kubernetes_deployment" "parser" {
  metadata {
    name      = "parser"
    labels = {
      app = "parser"
    }
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
          image = "giovaz94/parser-service:refactor-remove-rabbitmq"
          image_pull_policy = "Always"
          port {
            container_port = 8011
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
            value = "parser.queue"
          }
          env {
            name  = "DB_URL"
            value = "http://monitor-service:3200"
          }
          env {
            name  = "MCL"
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