resource "aws_s3_bucket" "swagger" {
  bucket = "css-sso-api-swagger"
}

resource "aws_s3_bucket_cors_configuration" "swagger_cors_config" {
  bucket = aws_s3_bucket.swagger.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "GET"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_public_access_block" "swagger_public_access" {
  bucket = aws_s3_bucket.swagger.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_object" "swagger_dist" {
  for_each = fileset("swagger-ui-dist/", "*")
  bucket   = aws_s3_bucket.swagger.id
  key      = each.value
  source   = "swagger-ui-dist/${each.value}"
  etag     = filemd5("swagger-ui-dist/${each.value}")
}
