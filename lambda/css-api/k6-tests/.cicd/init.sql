INSERT INTO public.users(id, idir_userid, idir_email, created_at, updated_at, additional_email, display_name, has_read_gold_notification)
VALUES(1, 'F9B007700D6F4A26A06CB961ED601A76', 'pathfinder.ssotraining@gov.bc.ca', '2022-08-10 20:21:27.756+00', '2022-08-10 20:21:27.756+00', NULL, 'Pathfinder SSO Training', false);

INSERT INTO public.teams(id, name, created_at, updated_at)
VALUES(2016, 'CSS App K6 CICD', '2022-08-10 20:21:27.756+00', '2022-08-10 20:21:27.756+00');

INSERT INTO public.users_teams(role, created_at, updated_at, user_id, team_id, pending)
VALUES('admin', '2022-08-10 20:21:27.756+00', '2022-08-10 20:21:27.756+00', 1, 2016, false);

INSERT INTO public.requests (project_name, client_name, realm, public_access, dev_valid_redirect_uris, test_valid_redirect_uris, prod_valid_redirect_uris, environments, pr_number, action_number, created_at, updated_at, project_lead, preferred_email, new_to_sso, agree_with_terms, bceid_approved, status, archived, idir_user_display_name, additional_emails, has_unread_notifications, browser_flow_override, team_id, uses_team, requester, user_id, service_type, dev_idps, test_idps, prod_idps, dev_roles, test_roles, prod_roles, dev_access_token_lifespan, dev_offline_session_idle_timeout, dev_offline_session_max_lifespan, dev_session_idle_timeout, dev_session_max_lifespan, test_access_token_lifespan, test_offline_session_idle_timeout, test_offline_session_max_lifespan, test_session_idle_timeout, test_session_max_lifespan, prod_access_token_lifespan, prod_offline_session_idle_timeout, prod_offline_session_max_lifespan, prod_session_idle_timeout, prod_session_max_lifespan, client_id, provisioned, provisioned_at, dev_login_title, test_login_title, prod_login_title, service_account_enabled, api_service_account, auth_type, last_changes, protocol, dev_assertion_lifespan, test_assertion_lifespan, prod_assertion_lifespan, github_approved, additional_role_attribute)
VALUES ('K6 Test Project', NULL, NULL, NULL, '{}', '{}', '{}', '{dev,test}', NULL, NULL, '2022-08-10 21:21:25.303+00', '2022-08-10 21:21:53.598+00', false, NULL, false, false, false, 'applied', false, 'K6 Test User', NULL, NULL, NULL, 2016, true, 'K6 Test User', 1, 'gold', '{idir,bceidbasic}', '{}', '{}', '{}', '{}', '{}', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, false, NULL, 'K6 Test App', 'K6 Test App', 'K6 Test App', false, false, 'browser-login', NULL, 'oidc', 0, 0, 0, false, '');

INSERT INTO public.requests (project_name, client_name, realm, public_access, dev_valid_redirect_uris, test_valid_redirect_uris, prod_valid_redirect_uris, environments, pr_number, action_number, created_at, updated_at, project_lead, preferred_email, new_to_sso, agree_with_terms, bceid_approved, status, archived, idir_user_display_name, additional_emails, has_unread_notifications, browser_flow_override, team_id, uses_team, requester, user_id, service_type, dev_idps, test_idps, prod_idps, dev_roles, test_roles, prod_roles, dev_access_token_lifespan, dev_offline_session_idle_timeout, dev_offline_session_max_lifespan, dev_session_idle_timeout, dev_session_max_lifespan, test_access_token_lifespan, test_offline_session_idle_timeout, test_offline_session_max_lifespan, test_session_idle_timeout, test_session_max_lifespan, prod_access_token_lifespan, prod_offline_session_idle_timeout, prod_offline_session_max_lifespan, prod_session_idle_timeout, prod_session_max_lifespan, client_id, provisioned, provisioned_at, dev_login_title, test_login_title, prod_login_title, service_account_enabled, api_service_account, auth_type, last_changes, protocol, dev_assertion_lifespan, test_assertion_lifespan, prod_assertion_lifespan, github_approved, additional_role_attribute)
VALUES ('Service Account for K6 Testing', NULL, NULL, NULL, '{}', '{}', '{}', '{}', NULL, NULL, '2022-08-10 20:21:27.756+00', '2022-09-25 16:34:29.405+00', false, NULL, false, false, false, 'applied', false, 'K6 Test User', NULL, NULL, NULL, 2016, true, 'K6 Test User', 1, 'gold', '{}', '{}', '{}', '{}', '{}', '{}', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'service-account-team-2016-8255', false, NULL, NULL, NULL, NULL, false, true, 'browser-login', NULL, 'oidc', 0, 0, 0, false, '');
