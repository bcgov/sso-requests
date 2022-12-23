resource "aws_api_gateway_rest_api" "sso_backend_test" {
  name        = "SSOApiTest"
  description = "Terraform Serverless Application Example"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_resource" "app_test" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend_test.id
  parent_id   = aws_api_gateway_rest_api.sso_backend_test.root_resource_id
  path_part   = "app"
}

resource "aws_api_gateway_resource" "app_proxy_test" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend_test.id
  parent_id   = aws_api_gateway_resource.app_test.id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "app_proxy_test" {
  rest_api_id   = aws_api_gateway_rest_api.sso_backend_test.id
  resource_id   = aws_api_gateway_resource.app_proxy_test.id
  http_method   = "ANY"
  authorization = "NONE"

  request_parameters = {
    "method.request.path.proxy" = true
  }
}

resource "aws_api_gateway_integration" "app" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend_test.id
  resource_id = aws_api_gateway_method.app_proxy.resource_id
  http_method = aws_api_gateway_method.app_proxy.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_test.invoke_arn

  cache_key_parameters = ["method.request.path.proxy"]
  timeout_milliseconds = 29000

  request_parameters = {
    "integration.request.path.proxy" = "method.request.path.proxy"
  }
}


resource "aws_api_gateway_resource" "api" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend_test.id
  parent_id   = aws_api_gateway_rest_api.sso_backend_test.root_resource_id
  path_part   = "api"
}

resource "aws_api_gateway_resource" "api_proxy" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend_test.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "api_proxy" {
  rest_api_id   = aws_api_gateway_rest_api.sso_backend_test.id
  resource_id   = aws_api_gateway_resource.api_proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "api" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend_test.id
  resource_id = aws_api_gateway_method.api_proxy.resource_id
  http_method = aws_api_gateway_method.api_proxy.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.css_api_test.invoke_arn
}
