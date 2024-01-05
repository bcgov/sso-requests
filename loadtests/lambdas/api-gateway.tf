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

resource "aws_api_gateway_integration" "app_test" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend_test.id
  resource_id = aws_api_gateway_method.app_proxy_test.resource_id
  http_method = aws_api_gateway_method.app_proxy_test.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_test.invoke_arn

  cache_key_parameters = ["method.request.path.proxy"]
  timeout_milliseconds = 29000

  request_parameters = {
    "integration.request.path.proxy" = "method.request.path.proxy"
  }
}


resource "aws_api_gateway_resource" "api_test" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend_test.id
  parent_id   = aws_api_gateway_rest_api.sso_backend_test.root_resource_id
  path_part   = "api"
}

resource "aws_api_gateway_resource" "api_proxy_test" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend_test.id
  parent_id   = aws_api_gateway_resource.api_test.id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "api_proxy_test" {
  rest_api_id   = aws_api_gateway_rest_api.sso_backend_test.id
  resource_id   = aws_api_gateway_resource.api_proxy_test.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "api_test" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend_test.id
  resource_id = aws_api_gateway_method.api_proxy_test.resource_id
  http_method = aws_api_gateway_method.api_proxy_test.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.css_api_test.invoke_arn
}

# Deploy API and authorize to use lambdas
resource "aws_api_gateway_deployment" "this" {
  depends_on = [
    aws_api_gateway_integration.app_test,
    aws_api_gateway_integration.api_test,

  ]

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_integration.app_test.id,
      aws_api_gateway_integration.api_test.id,
    ]))
  }

  rest_api_id = aws_api_gateway_rest_api.sso_backend_test.id
  stage_name  = "test"
}

resource "aws_lambda_permission" "apigw_app_test" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.app_test.function_name
  principal     = "apigateway.amazonaws.com"

  # The "/*/*" portion grants access from any method on any resource
  # within the API Gateway REST API.
  source_arn = "${aws_api_gateway_rest_api.sso_backend_test.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_api_test" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.css_api_test.function_name
  principal     = "apigateway.amazonaws.com"

  # The "/*/*" portion grants access from any method on any resource
  # within the API Gateway REST API.
  source_arn = "${aws_api_gateway_rest_api.sso_backend_test.execution_arn}/*/*"
}

output "base_url" {
  value = aws_api_gateway_deployment.this.invoke_url
}
