Feature: Submit New Integration

    As an user
    I want to submit a new integration request
    so that I can have the access to the SSO service

    Background:
        Given the user is a PO or a technical leader or part of an existing team

    Scenario: User notification for non-BCeID
        Given the integration is not associated with a team
        And the integration does not include BCeID IDP
        When the integration request is submitted
        Then the requester receives an email (id: create-integration-submitted)
        And SSO admin is cc'd on the email sent to the requester

    Scenario: Team notification for non-BCeID
        Given the integration is associated with a team
        And the integration does not include BCeID IDP
        When the integration request is submitted
        Then all team admins/members receive emails (id: create-integration-submitted)
        And SSO admin is cc'd on the email sent to the team

    Scenario: User notification for BCeID in non-Prod
        Given the integration is not associated with a team
        And the integration includes BCeID IDP
        And the integration does not include production environment
        When the integration request is submitted
        Then the requester receives an email (id: create-integration-submitted)
        And SSO admin is cc'd on the email sent to the requester
        And IDIM consulting receives an email (id: create-integration-submitted-bceid-nonprod-idim)
        And SSO admin is cc'd on the email sent to IDIM consulting

    Scenario: Team notification for BCeID in non-Prod
        Given the integration is associated with a team
        And the integration includes BCeID IDP
        And the integration does not include production environment
        When the integration request is submitted
        Then all team admins/members receive emails (id: create-integration-submitted)
        And SSO admin is cc'd on the emails sent to the team admins/members
        And IDIM consulting receives an email (id: create-integration-submitted-bceid-nonprod-idim)
        And SSO admin is cc'd on the email sent to IDIM consulting

    Scenario: User notification for BCeID in Prod
        Given the integration is not associated with a team
        And the integration includes BCeID IDP
        And the integration include production environment
        When the integration request is submitted
        Then the requester receives an email (id: create-integration-submitted-bceid-prod)
        And SSO admin and IDIM consulting are cc'd on the email sent to the requester

    Scenario: Team notification for BCeID in Prod
        Given the integration is associated with a team
        And the integration includes BCeID IDP
        And the integration include production environment
        When the integration request is submitted
        Then all team admins/members receive emails (id: create-integration-submitted-bceid-prod)
        And SSO admin and IDIM consulting are cc'd on the email sent to the team
