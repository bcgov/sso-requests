# Proxy routes starting with /app to the app handler allowing any method
resource "aws_api_gateway_resource" "app" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend.id
  parent_id   = aws_api_gateway_rest_api.sso_backend.root_resource_id
  path_part   = "app"
}

resource "aws_api_gateway_resource" "app_proxy" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend.id
  parent_id   = aws_api_gateway_resource.app.id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "app_proxy" {
  rest_api_id   = aws_api_gateway_rest_api.sso_backend.id
  resource_id   = aws_api_gateway_resource.app_proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "app" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend.id
  resource_id = aws_api_gateway_method.app_proxy.resource_id
  http_method = aws_api_gateway_method.app_proxy.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app.invoke_arn
}

resource "aws_api_gateway_method_response" "app_cors" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend.id
  resource_id = aws_api_gateway_method.app_proxy.resource_id
  http_method = aws_api_gateway_method.app_proxy.http_method
  status_code = 200

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Credentials" = true,
  }

  depends_on = [aws_api_gateway_method.app_proxy]
}

resource "aws_api_gateway_integration_response" "app_cors" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend.id
  resource_id = aws_api_gateway_method.app_proxy.resource_id
  http_method = aws_api_gateway_method.app_proxy.http_method
  status_code = 200

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"      = "'https://bcgov.github.io'",
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type,Authorization'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,POST,GET,PUT,DELETE'"
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }

  depends_on = [aws_api_gateway_integration.app, aws_api_gateway_method_response.app_cors]
}
