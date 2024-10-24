resource "aws_alb" "sso_alb" {

  name                             = "sso-alb"
  internal                         = true
  security_groups                  = [data.aws_security_group.web.id]
  subnets                          = [data.aws_subnet.a.id, data.aws_subnet.b.id]
  enable_cross_zone_load_balancing = true

  lifecycle {
    ignore_changes = [access_logs]
  }
}

resource "aws_alb_listener" "grafana" {
  count             = var.install_grafana
  load_balancer_arn = aws_alb.sso_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.grafana[count.index].arn
  }
}

resource "aws_alb_target_group" "grafana" {
  count                = var.install_grafana
  name                 = "grafana"
  port                 = 3000
  protocol             = "HTTP"
  vpc_id               = data.aws_vpc.selected.id
  target_type          = "ip"
  deregistration_delay = 30

  health_check {
    healthy_threshold   = "2"
    interval            = "5"
    protocol            = "HTTP"
    matcher             = "200"
    timeout             = "3"
    path                = "/api/health"
    unhealthy_threshold = "2"
  }
  tags = var.grafana_tags
}
