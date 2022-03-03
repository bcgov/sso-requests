Feature: Update Integration Approved

    As an user
    I want to be notified when the integration update request is approved
    so that I can login to the dashboard to access the integration

    Background:
        Given the user is associated with the integration (Self/Team)

    Scenario: User notification
        Given the integration is not associated with a team
        When the integration update request is approved
        Then the integration owner receives an email (id: update-integration-approved)
        And SSO admin is cc'd on the email sent to the integration owner
        And the email content includes the requester name

    Scenario: Team notification
        Given the integration is associated with a team
        When the integration update request is approved
        Then all team admins/members receive emails (id: update-integration-approved)
        And SSO admin is cc'd on one of the emails sent to the team
        And the email content includes the requester name
