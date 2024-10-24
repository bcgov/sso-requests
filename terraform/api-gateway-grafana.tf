resource "aws_apigatewayv2_api" "grafana" {
  count         = var.install_grafana
  name          = "grafana"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_vpc_link" "grafana" {
  count              = var.install_grafana
  name               = "grafana"
  subnet_ids         = [data.aws_subnet.a.id, data.aws_subnet.b.id]
  security_group_ids = [data.aws_security_group.app.id]
}

resource "aws_apigatewayv2_integration" "grafana" {
  count              = var.install_grafana
  api_id             = aws_apigatewayv2_api.grafana[count.index].id
  integration_type   = "HTTP_PROXY"
  connection_id      = aws_apigatewayv2_vpc_link.grafana[count.index].id
  connection_type    = "VPC_LINK"
  integration_method = "ANY"
  integration_uri    = aws_alb_listener.grafana[count.index].arn
}

resource "aws_apigatewayv2_route" "grafana" {
  count     = var.install_grafana
  api_id    = aws_apigatewayv2_api.grafana[count.index].id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.grafana[count.index].id}"
}

resource "aws_apigatewayv2_stage" "grafana" {
  count       = var.install_grafana
  api_id      = aws_apigatewayv2_api.grafana[count.index].id
  name        = "$default"
  auto_deploy = true
}

output "grafana_url" {
  value = "https://${aws_apigatewayv2_api.grafana[count.index].id}.execute-api.ca-central-1.amazonaws.com"
}
