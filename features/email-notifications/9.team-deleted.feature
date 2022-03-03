Feature: Delete Team

    As a team admin
    I want to delete an team
    so that I revoke the access to the team

    Scenario: Team removal email
        Given the user is an admin of the team
        And the team does not have active integrations
        When the user deletes the team
        Then notification emails are sent to the all team admins/members (id: team-deleted)
