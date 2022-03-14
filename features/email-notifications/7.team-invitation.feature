Feature: Invite Team Members

    As a team admin
    I want to inviate new team admins/members to the team
    so that they can receive team invitation emails to accept the invitations

    Scenario: Team invitation email
        Given the user is an admin of the team
        When the user adds new email addresses and their roles
        And the user submitted the invitation form
        Then team invitation emails are sent to the email addreses (id: team-invitation)
