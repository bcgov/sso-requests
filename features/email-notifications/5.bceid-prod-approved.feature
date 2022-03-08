Feature: BCeID Prod Approved

    As a BCeID integration owner in prod environment
    I want to receive an email when the prod access is approved
    so that I can apply BCeID prod configuration to my application

    Scenario: User BCeID Prod Approval Email
        Given the user is an owner of the integration
        When the BCeID Prod access is approved
        Then BCeID Prod approval email is sent to the user (id: bceid-prod-approved)
        And SSO admin is cc'd on the email sent to the user

    Scenario: Team BCeID Prod Approval Email
        Given the user is a member/admin of the integration team
        When the BCeID Prod access is approved
        Then BCeID Prod approval email is sent to the user (id: bceid-prod-approved)
        And SSO admin is cc'd on the email sent to the team
