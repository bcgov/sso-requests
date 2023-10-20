data "aws_alb" "sso_alb" {
  name = "sso-alb"
}

resource "aws_alb_listener" "alb_listener_sso_grafana" {
  count             = var.install_sso_css_grafana
  load_balancer_arn = data.aws_alb.sso_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.alb_target_group_sso_grafana.arn
  }
}

resource "aws_alb_target_group" "alb_target_group_sso_grafana" {
  count                = var.install_sso_css_grafana
  name                 = "${var.sso_grafana_name}-tg"
  port                 = var.sso_grafana_container_port
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
    path                = var.sso_grafana_health_check_path
    unhealthy_threshold = "2"
  }
  tags = var.sso_grafana_tags
}
