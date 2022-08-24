locals {
  mime_types = jsondecode(file("${path.module}/mime-types.json"))
}

resource "aws_s3_object" "swagger_dist" {
  for_each     = fileset("swagger-ui-dist/", "*")
  bucket       = module.s3_sso_api_swagger.bucket_id
  key          = each.value
  source       = "swagger-ui-dist/${each.value}"
  etag         = filemd5("swagger-ui-dist/${each.value}")
  content_type = lookup(local.mime_types, regex("\\.[^.]+$", each.value), null)
}
