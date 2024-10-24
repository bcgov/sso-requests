resource "aws_lb" "redis_nlb" {
  name               = "redis-nlb"
  internal           = true
  load_balancer_type = "network"
  security_groups    = [data.aws_security_group.app.id, aws_security_group.rds_sg.id]
  subnets            = [data.aws_subnet.a.id, data.aws_subnet.b.id]
}

resource "aws_lb_target_group" "redis" {
  count       = var.install_redis
  name        = "redis"
  port        = 6379
  protocol    = "TCP"
  vpc_id      = data.aws_vpc.selected.id
  target_type = "ip"

  health_check {
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    protocol            = "TCP"
  }
  tags = var.redis_tags
}

resource "aws_lb_listener" "redis" {
  count             = var.install_redis
  load_balancer_arn = aws_lb.redis_nlb.arn
  port              = 6379
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.redis[count.index].arn
  }
}
