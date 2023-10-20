resource "aws_efs_file_system" "efs_sso_grafana" {
  count          = var.install_sso_css_grafana
  creation_token = "efs-sso-grafana"
  encrypted      = true

  tags = merge(
    {
      Name = "efs-sso-grafana"
    },
    var.sso_grafana_tags
  )
}

resource "aws_efs_mount_target" "efs_sso_grafana_azA" {
  count           = var.install_sso_css_grafana
  file_system_id  = aws_efs_file_system.efs_sso_grafana[count.index].id
  subnet_id       = data.aws_subnet.a_data.id
  security_groups = [data.aws_security_group.app.id]
}

resource "aws_efs_mount_target" "efs_sso_grafana_azB" {
  count           = var.install_sso_css_grafana
  file_system_id  = aws_efs_file_system.efs_sso_grafana[count.index].id
  subnet_id       = data.aws_subnet.b_data.id
  security_groups = [data.aws_security_group.app.id]
}

resource "aws_efs_backup_policy" "efs_sso_grafana_backups_policy" {
  count          = var.install_sso_css_grafana
  file_system_id = aws_efs_file_system.efs_sso_grafana[count.index].id

  backup_policy {
    status = "ENABLED"
  }
}
