# see https://learn.hashicorp.com/tutorials/terraform/lambda-api-gateway
# This structure accepts all request methods and routes leaving handling
# to the lambda function.

resource "aws_api_gateway_rest_api" "sso_backend" {
  name        = "SSOApi"
  description = "Terraform Serverless Application Example"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Proxy requests to /api to the css-api lambda
resource "aws_api_gateway_resource" "api" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend.id
  parent_id   = aws_api_gateway_rest_api.sso_backend.root_resource_id
  path_part   = "api"
}

resource "aws_api_gateway_resource" "api_proxy" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "api_proxy" {
  rest_api_id   = aws_api_gateway_rest_api.sso_backend.id
  resource_id   = aws_api_gateway_resource.api_proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "api" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend.id
  resource_id = aws_api_gateway_method.api_proxy.resource_id
  http_method = aws_api_gateway_method.api_proxy.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.css_api.invoke_arn
}

# Proxy requests to s3 for serving swagger console
resource "aws_api_gateway_resource" "openapi_swagger" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend.id
  parent_id   = aws_api_gateway_rest_api.sso_backend.root_resource_id
  path_part   = "openapi"
}

resource "aws_api_gateway_resource" "openapi_swagger_proxy" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend.id
  parent_id   = aws_api_gateway_resource.openapi_swagger.id
  path_part   = "swagger"
}

resource "aws_api_gateway_method" "openapi_swagger_proxy" {
  rest_api_id   = aws_api_gateway_rest_api.sso_backend.id
  resource_id   = aws_api_gateway_resource.openapi_swagger_proxy.id
  http_method   = "GET"
  authorization = "NONE"

  request_parameters = {
    "method.request.header.Content-Type"        = true,
    "method.request.header.Content-Disposition" = true,
  }
}

resource "aws_api_gateway_method_response" "openapi_swagger_proxy" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend.id
  resource_id = aws_api_gateway_resource.openapi_swagger_proxy.id
  http_method = aws_api_gateway_method.openapi_swagger_proxy.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Content-Type"        = true,
    "method.response.header.Content-Disposition" = true,
  }
}

resource "aws_api_gateway_resource" "swagger_assets_proxy" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend.id
  parent_id   = aws_api_gateway_resource.openapi_swagger.id
  path_part   = "{asset}"
}

resource "aws_api_gateway_method" "swagger_assets_proxy" {
  rest_api_id   = aws_api_gateway_rest_api.sso_backend.id
  resource_id   = aws_api_gateway_resource.swagger_assets_proxy.id
  http_method   = "GET"
  authorization = "NONE"

  request_parameters = {
    "method.request.path.asset"                 = true,
    "method.request.header.Content-Type"        = true,
    "method.request.header.Content-Disposition" = true,
  }
}

resource "aws_api_gateway_method_response" "swagger_assets_proxy" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend.id
  resource_id = aws_api_gateway_resource.swagger_assets_proxy.id
  http_method = aws_api_gateway_method.swagger_assets_proxy.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Content-Type"        = true,
    "method.response.header.Content-Disposition" = true,
  }
}

resource "aws_api_gateway_integration" "openapi_swagger" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend.id
  resource_id = aws_api_gateway_method.openapi_swagger_proxy.resource_id
  http_method = aws_api_gateway_method.openapi_swagger_proxy.http_method

  integration_http_method = "GET"
  type                    = "AWS"
  credentials             = aws_iam_role.api_gateway_s3_role.arn
  uri                     = "arn:aws:apigateway:ca-central-1:s3:path/${module.s3_sso_api_swagger.bucket_name}/index.html"

  request_parameters = {
    "integration.request.header.Content-Type"        = "method.request.header.Content-Type",
    "integration.request.header.Content-Disposition" = "method.request.header.Content-Disposition",
  }
}

resource "aws_api_gateway_integration_response" "openapi_swagger" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend.id
  resource_id = aws_api_gateway_method.openapi_swagger_proxy.resource_id
  http_method = aws_api_gateway_method.openapi_swagger_proxy.http_method
  status_code = aws_api_gateway_method_response.openapi_swagger_proxy.status_code

  response_parameters = {
    "method.response.header.Content-Type"        = "integration.response.header.Content-Type",
    "method.response.header.Content-Disposition" = "integration.response.header.Content-Disposition",
  }

  depends_on = [
    aws_api_gateway_integration.openapi_swagger
  ]
}

resource "aws_api_gateway_integration" "openapi_swagger_assets" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend.id
  resource_id = aws_api_gateway_method.swagger_assets_proxy.resource_id
  http_method = aws_api_gateway_method.swagger_assets_proxy.http_method

  integration_http_method = "GET"
  type                    = "AWS"
  credentials             = aws_iam_role.api_gateway_s3_role.arn
  uri                     = "arn:aws:apigateway:ca-central-1:s3:path/${module.s3_sso_api_swagger.bucket_name}/{asset}"

  request_parameters = {
    "integration.request.path.asset"                 = "method.request.path.asset",
    "integration.request.header.Content-Type"        = "method.request.header.Content-Type",
    "integration.request.header.Content-Disposition" = "method.request.header.Content-Disposition",
  }
}

resource "aws_api_gateway_integration_response" "openapi_swagger_assets" {
  rest_api_id = aws_api_gateway_rest_api.sso_backend.id
  resource_id = aws_api_gateway_method.swagger_assets_proxy.resource_id
  http_method = aws_api_gateway_method.swagger_assets_proxy.http_method
  status_code = aws_api_gateway_method_response.swagger_assets_proxy.status_code

  response_parameters = {
    "method.response.header.Content-Type"        = "integration.response.header.Content-Type",
    "method.response.header.Content-Disposition" = "integration.response.header.Content-Disposition",
  }
  depends_on = [
    aws_api_gateway_integration.openapi_swagger_assets
  ]
}

# Deploy API and authorize to use lambdas
resource "aws_api_gateway_deployment" "this" {
  depends_on = [
    aws_api_gateway_integration.app,
    aws_api_gateway_integration.api,
    aws_api_gateway_integration.openapi_swagger,
    aws_api_gateway_integration.openapi_swagger_assets
  ]

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_integration.app.id,
      aws_api_gateway_integration.api.id,
      aws_api_gateway_integration.openapi_swagger,
      aws_api_gateway_integration.openapi_swagger_assets
    ]))
  }

  rest_api_id = aws_api_gateway_rest_api.sso_backend.id
  stage_name  = "test"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_lambda_permission" "apigw_auth" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.app.function_name
  principal     = "apigateway.amazonaws.com"

  # The "/*/*" portion grants access from any method on any resource
  # within the API Gateway REST API.
  source_arn = "${aws_api_gateway_rest_api.sso_backend.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.css_api.function_name
  principal     = "apigateway.amazonaws.com"

  # The "/*/*" portion grants access from any method on any resource
  # within the API Gateway REST API.
  source_arn = "${aws_api_gateway_rest_api.sso_backend.execution_arn}/*/*"
}

output "base_url" {
  value = aws_api_gateway_deployment.this.invoke_url
}
