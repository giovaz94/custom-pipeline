resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = "monitoring"
  }
}

resource "helm_release" "prometheus" {
  depends_on = [ kubernetes_namespace.monitoring ]
  name       = "prometheus-stack"
  chart      = "kube-prometheus-stack"
  version    = "60.2.0"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  repository = "https://prometheus-community.github.io/helm-charts"
 
  set {
    name  = "grafana.adminUser"
    value = "admin"
  }

  set {
    name  = "grafana.adminPassword"
    value = "graf4n4k8s"
  }

  set {
    name  = "prometheus.service.port"
    value = "9090"
  }

  set {
    name  = "prometheus.service.type"
    value = "LoadBalancer"
  }

  set {
    name  = "prometheus.prometheusSpec.additionalScrapeConfigs"
    value = <<-EOT
      global:
        scrape_interval: 1s
        evaluation_interval: 1s
      scrape_configs:
        - job_name: 'prometheus'
          static_configs:
            - targets: [ 'localhost:9090' ]
        - job_name: 'kubernetes-service-endpoints'
          kubernetes_sd_configs:
            - role: endpoints
          relabel_configs:
            - action: labelmap
              regex: __meta_kubernetes_service_label_(.+)
            - source_labels: [ __meta_kubernetes_namespace ]
              action: replace
              target_label: kubernetes_namespace
            - source_labels: [ __meta_kubernetes_service_name ]
              action: replace
              target_label: kubernetes_name
        - job_name: 'envoy'
          metrics_path: /stats/prometheus
          static_configs:
            - targets: ['envoy-admin.default.svc.cluster.local:9901']
    EOT
  }
}