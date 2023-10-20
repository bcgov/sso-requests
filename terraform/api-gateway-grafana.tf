locals {
  api_gateway_log_format_with_newlines = <<EOF
{
"requestId":"$context.requestId",
"ip":"$context.identity.sourceIp",
"requestTime":"$context.requestTime",
"httpMethod":"$context.httpMethod",
"status":"$context.status",
"path":"$context.path",
"responseLength":"$context.responseLength",
"errorMessage":"$context.error.message"
}
EOF
  api_gateway_log_format               = replace(local.api_gateway_log_format_with_newlines, "\n", "")
}

resource "aws_apigatewayv2_api" "sso_grafana_api" {
  count         = var.install_sso_css_grafana
  name          = var.sso_grafana_name
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_vpc_link" "sso_grafana_vpc_link" {
  count              = var.install_sso_css_grafana
  name               = var.sso_grafana_name
  subnet_ids         = module.network.aws_subnet_ids.web.ids
  security_group_ids = [module.network.aws_security_groups.web.id]
}

resource "aws_apigatewayv2_integration" "sso_grafana_api_integration" {
  count              = var.install_sso_css_grafana
  api_id             = aws_apigatewayv2_api.sso_grafana_api.id
  integration_type   = "HTTP_PROXY"
  connection_id      = aws_apigatewayv2_vpc_link.sso_grafana_vpc_link.id
  connection_type    = "VPC_LINK"
  integration_method = "ANY"
  integration_uri    = aws_alb_listener.alb_listener_sso_grafana.arn
}

resource "aws_apigatewayv2_route" "sso_grafana_route_any" {
  count     = var.install_sso_css_grafana
  api_id    = aws_apigatewayv2_api.sso_grafana_api.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.sso_grafana_api_integration.id}"
}

resource "aws_apigatewayv2_stage" "sso_grafana_api_default_stage" {
  count       = var.install_sso_css_grafana
  api_id      = aws_apigatewayv2_api.sso_grafana_api.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway_sso_grafana_logs.arn
    format          = local.api_gateway_log_format
  }
}

resource "aws_cloudwatch_log_group" "api_gateway_sso_grafana_logs" {
  name              = "${var.sso_grafana_name}/gateway_logs"
  retention_in_days = 90
}
