Feature: New Integration Approved

    As an user
    I want to be notified when the new integration is approved
    so that I can login to the dashboard to access the integration

    Background:
        Given the user is associated with the integration (Self/Team)

    Scenario: User notification
        Given the integration is not associated with a team
        When the integration request is approved
        Then the integration owner receives an email (id: create-integration-approved)
        And SSO admin is cc'd on the email sent to the integration owner

    Scenario: Team notification
        Given the integration is associated with a team
        When the integration request is approved
        Then all team admins/members receive emails (id: create-integration-approved)
        And SSO admin is cc'd on the email sent to the team
