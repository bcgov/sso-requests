resource "aws_acm_certificate" "this" {
  domain_name       = var.custom_domain_name
  validation_method = "DNS"
}

resource "aws_apigatewayv2_domain_name" "this" {
  domain_name = var.custom_domain_name

  domain_name_configuration {
    certificate_arn = aws_acm_certificate.this.arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  depends_on = [
    aws_acm_certificate.this
  ]
}

resource "aws_apigatewayv2_api_mapping" "this" {
  api_id      = aws_api_gateway_rest_api.sso_backend.id
  domain_name = aws_apigatewayv2_domain_name.this.id
  stage       = "test"
}
