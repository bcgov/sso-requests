resource "helm_release" "sso-keycloak" {
  name       = "sso-keycloak"
  repository = "https://codecentric.github.io/helm-charts"
  chart      = "sso-charts/sso-keycloak"
  version    = "v1.14.2"

  namespace = "c6af30-dev"

  # Wait 10 minutes instead of default 5 mins
  # because HA seems to take a bit longer to fully start
  wait    = true
  timeout = 720

  values = [
    <<EOT

image:
  pullPolicy: IfNotPresent
  repository: ghcr.io/bcgov/sso
  tag: 7.6.5-build.25

additionalServerOptions: "-Dkeycloak.profile.feature.impersonation=disabled -Djboss.persistent.log.dir=/var/log/eap"

resources:
  requests:
    cpu: 150m
    memory: 768Mi
  limits:
    cpu: 250m
    memory: 1024Mi

configuration:
  enabled: true
  version: "7.6"

annotations:
  timeout: 90s

livenessProbe:
  enabled: true
  verification: script
  initialDelaySeconds: 240
  periodSeconds: 20
  timeoutSeconds: 5
  successThreshold: 1
  failureThreshold: 6

readinessProbe:
  enabled: true
  verification: script
  initialDelaySeconds: 180
  periodSeconds: 20
  timeoutSeconds: 5
  successThreshold: 1
  failureThreshold: 6

replicaCount: 1

maintenancePage:
  enabled: false
  active: false

patroni:
  replicaCount: 2

  persistentVolume:
    size: 1Gi

  podDisruptionBudget:
    enabled: true

  transportServerClaim:
    enabled: true

rollingUpdate:
  maxSurge: 2
  maxUnavailable: 0

EOT
  ]
}
