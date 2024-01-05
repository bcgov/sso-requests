resource "aws_cloudwatch_event_rule" "request_queue" {
  name                = "request-queue-scheduler"
  schedule_expression = "rate(5 minutes)"
}

resource "aws_cloudwatch_event_target" "request_queue" {
  rule      = aws_cloudwatch_event_rule.request_queue.name
  target_id = "request_queue"
  arn       = aws_lambda_function.request_queue.arn
}

resource "aws_lambda_permission" "request_queue" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.request_queue.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.request_queue.arn
}
