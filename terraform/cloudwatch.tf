resource "aws_cloudwatch_event_rule" "scheduler" {
  name                = "tf-apply-scheduler"
  schedule_expression = "rate(5 minutes)"
}

resource "aws_cloudwatch_event_target" "scheduler" {
  rule      = aws_cloudwatch_event_rule.scheduler.name
  target_id = "scheduler"
  arn       = aws_lambda_function.scheduler.arn
}

resource "aws_lambda_permission" "scheduler" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scheduler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.scheduler.arn
}

# Request Queue Scheduler

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
