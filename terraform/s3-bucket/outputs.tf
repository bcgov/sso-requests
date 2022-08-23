output "sso_api_swagger_bucket_id" {
  value = aws_s3_bucket.this.id
}

output "sso_api_swagger_bucket_arn" {
  value = aws_s3_bucket.this.arn
}
