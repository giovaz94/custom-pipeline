resource "kubernetes_deployment" "redis" {
  metadata {
    name = "redis"
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "redis"
      }
    }

    template {
      metadata {
        labels = {
          app = "redis"
        }
      }

      spec {
        container {
          name  = "redis"
          image = "redis"
          command = [
            "sh",
            "-cx",
            "redis-server --daemonize yes && redis-cli config set notify-keyspace-events KEA && sleep infinity"
          ]

          port {
            container_port = 6379
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "redis_service" {
  metadata {
    name = "redis-service"
  }

  spec {
    selector = {
      app = "redis"
    }

    port {
      protocol    = "TCP"
      port        = 6379
      target_port = 6379
    }
  }
  
  depends_on = [ 
    kubernetes_deployment.redis
  ]
}
