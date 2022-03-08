Feature: Delete Integration

    As an user
    I want to delete an integration
    so that I can revoke my access to the integration

    Background:
        Given the user is associated with the integration (Self/Team/SSO Admin)

    Scenario: User notification for non-BCeID
        Given the integration is not associated with a team
        And the integration does not include BCeID IDP
        When the integration delete request is submitted
        Then the requester receives an email (id: delete-integration-submitted)
        And SSO admin is cc'd on the email sent to the requester
        And the email content includes the requester name

    Scenario: Team notification for non-BCeID
        Given the integration is associated with a team
        And the integration does not include BCeID IDP
        When the integration delete request is submitted
        Then all team admins/members receive emails (id: delete-integration-submitted)
        And SSO admin is cc'd on the email sent to the team
        And the email content includes the requester name

    Scenario: User notification for BCeID
        Given the integration is not associated with a team
        And the integration includes BCeID IDP
        When the integration delete request is submitted
        Then SSO admin and IDIM consulting receive emails (id: delete-integration-submitted-bceid)
        And the owner of the integration is cc'd on the email sent
        And the email content includes the requester name

    Scenario: Team notification for BCeID
        Given the integration is associated with a team
        And the integration includes BCeID IDP
        When the integration delete request is submitted
        Then SSO admin and IDIM consulting receive emails (id: delete-integration-submitted-bceid)
        And all team admins/members are cc'd on the email sent
        And the email content includes the requester name
