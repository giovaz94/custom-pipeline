# Create the RabbitMQ deployment
resource "kubernetes_deployment" "rabbitmq" {
  metadata {
    name = "rabbitmq"
    labels = {
      app = "rabbitmq"
    }
  }

  spec {
    selector {
      match_labels = {
        app = "rabbitmq"
      }
    }

    template {
      metadata {
        labels = {
          app = "rabbitmq"
        }
      }

      spec {
        container {
          name            = "rabbitmq"
          image           = "giovaz94/rabbitmq-service:redis-stream"
          image_pull_policy = "Always"
          port {
            name           = "amqp"
            container_port = 5672
          }
          port {
            name           = "management"
            container_port = 15672
          }
          port {
            name           = "prometheus"
            container_port = 15692
          }
        }

        restart_policy = "Always"
      }
    }
  }
}

# Create the RabbitMQ service
resource "kubernetes_service" "rabbitmq_service" {
  metadata {
    name = "rabbitmq-service"
  }

  spec {
    selector = {
      app = "rabbitmq"
    }

    port {
      name       = "amqp"
      port       = 5672
      target_port = 5672
    }
    port {
      name       = "management"
      port       = 15672
      target_port = 15672
    }

    port {
      name       = "prometheus"
      port       = 15692
      target_port = 15692
    }
  }

  depends_on = [
    kubernetes_deployment.rabbitmq
  ]
}