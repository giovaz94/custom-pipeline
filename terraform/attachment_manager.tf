# Attachment Manager Deployment
resource "kubernetes_deployment" "attachment_manager" {
  metadata {
    name      = "attachment-manager"
    labels = {
      app = "attachment-manager"
    }
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
          image = "giovaz94/attachment-manager-service:development"
          image_pull_policy = "Always"
          port {
            container_port = 8002
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
            value = "attachmentman.queue"
          }
          env {
            name  = "DB_URL"
            value = "http://monitor-service:3200"
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
    kubernetes_deployment.rabbitmq,
    kubernetes_service.rabbitmq_service,
    kubernetes_deployment.monitor,
    kubernetes_service.monitor_service
  ]
  
}

# Attachment Manager Service
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
