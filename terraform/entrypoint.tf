# Create the Entrypoint deployment
resource "kubernetes_deployment" "entrypoint" {
  metadata {
    name = "entrypoint"
    labels = {
      app = "entrypoint"
    }
  }

  spec {
    replicas = 3
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
        
        container {
          name  = "entrypoint"
          image = "giovaz94/entrypoint:development"
          image_pull_policy = "Always"
        
          port {
            container_port = 8010
          }

          env {
            name  = "DB_URL"
            value = "http://monitor-service:3200"
          }
          env {
            name  = "HOSTNAME"
            value = "rabbitmq-service"
          }
          env {
            name  = "PORT"
            value = "8010"
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
            name  = "EXCHANGE_NAME"
            value = "pipeline.direct"
          }
          env {
            name  = "QUEUE_TYPE"
            value = "parser.req"
          }
          env {
            name  = "REFRESH_TIME"
            value = "1000"
          }
          env {
            name  = "LS_ENABLED"
            value = "true"
          }
        }

        restart_policy = "Always"
      }
    }
  }
  
}

# Create the Entrypoint service
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
      target_port = 8010
    }

    type = "LoadBalancer"
  }

  depends_on = [ 
    kubernetes_deployment.entrypoint 
  ]
}
