resource "aws_s3_object" "swagger_dist" {
  for_each = fileset("swagger-ui-dist/", "*")
  bucket   = module.s3_sso_api_swagger.sso_api_swagger_bucket_id
  key      = each.value
  source   = "swagger-ui-dist/${each.value}"
  etag     = filemd5("swagger-ui-dist/${each.value}")
}
