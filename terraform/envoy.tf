resource "kubernetes_config_map" "envoy_config" {
  metadata {
    name = "envoy-config"
  }

  data = {
    "envoy.yaml" = <<-EOT
      node:
        id: test_id
        cluster: ingress_cluster

      admin:
        access_log_path: /dev/null
        address:
          socket_address:
            address: 0.0.0.0
            port_value: 9901

      static_resources:
        listeners:
          - name: listener_0
            address:
              socket_address:
                address: 0.0.0.0
                port_value: 10000
            filter_chains:
              - filters:
                  - name: envoy.filters.network.http_connection_manager
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                      stat_prefix: ingress_http
                      route_config:
                        name: local_route
                        virtual_hosts:
                          - name: local_service
                            domains: ["*"]
                            routes:
                              - match:
                                  prefix: "/"
                                route:
                                  cluster: entrypoint_cluster
                      http_filters:
                        - name: envoy.filters.http.router

        clusters:
          - name: entrypoint_cluster
            connect_timeout: 0.25s
            type: STRICT_DNS
            lb_policy: ROUND_ROBIN
            load_assignment:
              cluster_name: entrypoint_cluster
              endpoints:
                - lb_endpoints:
                    - endpoint:
                        address:
                          socket_address:
                            address: entrypoint-service
                            port_value: 8010
      EOT
  }
}


resource "kubernetes_deployment" "envoy_deployment" {
  metadata {
    name = "envoy-deployment"
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "envoy"
      }
    }

    template {
      metadata {
        labels = {
          app = "envoy"
        }
      }

      spec {
        container {
          name  = "envoy"
          image = "envoyproxy/envoy:v1.17.0"

          port {
            container_port = 9901
          }

          port {
            container_port = 10000
          }

          volume_mount {
            name       = "envoy-config"
            mount_path = "/etc/envoy"
          }
        }

        volume {
          name = "envoy-config"

          config_map {
            name = kubernetes_config_map.envoy_config.metadata[0].name
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "envoy_service" {
  metadata {
    name = "envoy-service"
  }

  spec {
    selector = {
      app = "envoy"
    }

    port {
      port        = 80
      protocol    = "TCP"
      target_port = 10000
    }

    type = "LoadBalancer"
  }
}

resource "kubernetes_service" "envoy_admin" {
  metadata {
    name = "envoy-admin"
  }

  spec {
    selector = {
      app = "envoy"
    }

    port {
      protocol    = "TCP"
      port        = 9901
      target_port = 9901
    }

    type = "ClusterIP"
  }
}
