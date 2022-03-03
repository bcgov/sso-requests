Feature: Submit Integration Update

    As an user
    I want to submit an integration update request
    so that I can update the configuration of the integration

    Background:
        Given the user is associated with the integration (Self/Team/SSO Admin)

    Scenario: User notification without BCeID prod
        Given the integration is not associated with a team
        And the changes does not include BCeID in prod
        When the integration update request is submitted
        Then the integration owner receives an email (id: update-integration-submitted)
        And SSO admin is cc'd on the email sent to the integration owner
        And the email content includes the requester name

    Scenario: Team notification without BCeID prod
        Given the integration is associated with a team
        And the changes does not include BCeID in prod
        When the integration request is submitted
        Then all team admins/members receive emails (id: update-integration-submitted)
        And SSO admin is cc'd on the email sent to the team
        And the email content includes the requester name

    Scenario: User notification with BCeID prod
        Given the integration is not associated with a team
        And the changes include BCeID in prod
        When the integration update request is submitted
        Then the integration owner receives an email (id: create-integration-submitted-bceid-prod)
        And SSO admin and IDIM consulting are cc'd on the email sent to the integration owner
        And the email content includes the requester name

    Scenario: Team notification without BCeID prod
        Given the integration is associated with a team
        And the changes include BCeID in prod
        When the integration request is submitted
        Then all team admins/members receive emails (id: create-integration-submitted-bceid-prod)
        And SSO admin and IDIM consulting are cc'd on the email sent to the team
        And the email content includes the requester name
