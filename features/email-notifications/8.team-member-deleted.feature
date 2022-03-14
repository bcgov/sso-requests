Feature: Delete Team Member

    As a team admin
    I want to delete an admin/member from the team
    so that team admins receive notification emails

    Scenario: Team member removal email
        Given the user is an admin of the team
        When the user deletes an user from the team
        Then notification emails are sent to the team admins (id: team-member-deleted-admins)
        And another notification email is sent to the user removed from the team (id: team-member-deleted-user-removed)
