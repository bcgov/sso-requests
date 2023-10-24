resource "aws_apigatewayv2_api" "sso_grafana_api" {
  count         = var.install_sso_css_grafana
  name          = var.sso_grafana_name
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_vpc_link" "sso_grafana_vpc_link" {
  count              = var.install_sso_css_grafana
  name               = var.sso_grafana_name
  subnet_ids         = [data.aws_subnet.a.id, data.aws_subnet.b.id]
  security_group_ids = [data.aws_security_group.app.id]
}

resource "aws_apigatewayv2_integration" "sso_grafana_api_integration" {
  count              = var.install_sso_css_grafana
  api_id             = aws_apigatewayv2_api.sso_grafana_api[count.index].id
  integration_type   = "HTTP_PROXY"
  connection_id      = aws_apigatewayv2_vpc_link.sso_grafana_vpc_link[count.index].id
  connection_type    = "VPC_LINK"
  integration_method = "ANY"
  integration_uri    = aws_alb_listener.alb_listener_sso_grafana[count.index].arn
}

resource "aws_apigatewayv2_route" "sso_grafana_route_any" {
  count     = var.install_sso_css_grafana
  api_id    = aws_apigatewayv2_api.sso_grafana_api[count.index].id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.sso_grafana_api_integration[count.index].id}"
}

resource "aws_apigatewayv2_stage" "sso_grafana_api_default_stage" {
  count       = var.install_sso_css_grafana
  api_id      = aws_apigatewayv2_api.sso_grafana_api[count.index].id
  name        = "$default"
  auto_deploy = true
}
