# Jest UI Testing

This folder contains the Jest test-cases for UI components within the `My Dashboard` panel.
It is divided into two pages: `My Projects` and `My Teams`.

## Commands

### To run tests for the front-end application, run:

```sh
  make app_test
```

under path `/sso-requests`

or

```sh
  yarn test -u
```

under path `/sso-requests/app`

### For some specific test case only, run:

```sh
  yarn test someTestCase.test.tsx
```

under path `/sso-requests/app`

## My Projects

- ### Integration List

  - Background:
    GIVEN I login as a client
    WHEN I am at the `My Dashboard -> My Project` panel
    AND there exists integration(s) in the `INTEGRATIONS` list

  - Test Coverage:
    1.  THEN there should have the button name displaied as `+ Request SSO Integration`;
    2.  WHEN client click on the `+ Request SSO Integration` button to create an integration,
        THEN the page will turn to integration configuration page;
    3.  THEN there should have the table column headers displaied as `Reqiest ID`, `Project Name`, `Status`, `Usecase`, `Service Type`, and `Actions`;
    4.  THEN there should have the integration been highlighted when client click on a specific integration;
    5.  WHEN client click on the trash bin icon to delete the integration,
        THEN a modal will show up to let client confirm deletion,
        WHEN client click on `Delete` button to confirm deletion,
        THEN the integration will be deleted;
    6.  WHEN client click on the pencil-shape icon to edit the integration,
        THEN the page will turn to integration configuration page;

- ### Technical Details tab

  - Background:
    GIVEN I login as a client
    WHEN I am at the `My Dashboard -> My Project` panel
    AND there exists integration(s) in the list
    WHEN I click on an integration
    AND I am at the `Technical Details` tab

  - Test Coverage:
    1.  GIVEN that the integration is in `In Draft` status,
        THEN the message should be displaied as `Your request has not been submitted`;
    2.  GIVEN that the integration is in `Submitted` status,
        a. THEN the message should be displaied as `Access to environment(s) will be provided in approx 20 min`;
        b. GIVEN that the integration has `BCeID Prod` option included,
        THEN the message should have `BCeID Prod` related contents been displaied, such as `Access to BCeID Prod`, `Please reach out to IDIM`;
        c. GIVEN that the integration has `BCeID Prod` option been approved,
        THEN the message should have `BCeID Prod Approved` related contents been displaied, such as `Your integration has been approved`;
    3.  GIVEN that the integration is in `Submitted` status,
        a. WHEN the `Status Indicator` is in `planned` state,
        THEN the message `Terraform plan succeeded...` should be checked;
        b. WHEN the `Status Indicator` is in `submitted` state,
        THEN the message `Process request submitted...` should be checked;
        c. WHEN the `Status Indicator` is in `pr` state,
        THEN the message `Pull request created...` should be checked;
        d. WHEN the `Status Indicator` is in `prFailed` state,
        THEN the message `An error has occurred` should be included;
        e. WHEN the `Status Indicator` is in `planFailed` state,
        THEN the message `An error has occurred` should be included;
        f. WHEN the `Status Indicator` is in `applyFailed` state,
        THEN the message `An error has occurred` should be included;
        g. Should display the `Last updated at` message for each state;
    4.  GIVEN that the integration is in `Completed` status,
        a. THEN the message should include `Installation JSONs` header;
        b. GIVEN that the integration has `BCeID Prod` option included,
        THEN the message should have `BCeID Prod` related contents been displaied, such as `Access to BCeID Prod`, `Please reach out to IDIM`;
        c. GIVEN that the integration has `BCeID Prod` option been approved,
        THEN the message should have `BCeID Prod Approved` related contents been displaied, such as `Your integration is approved and available`;
    5.  GIVEN that the integration is in `Completed` status,
        a. THEN the correct environment name(s) and IDP option(s) should be displaied, such as `Development (IDIR, Basic BCeID)`;
        AND should open correct hyper link page when click on the link icon;
        b. WHEN client click on the `Copy` button to copy the integration info,
        THEN the infomation should be correct and ready to use;
        c. WHEN client click on the `Download` button to download the integration information file,
        THEN the information file should be ready to download;

- ### Role Management tab

  - Background:
    GIVEN I login as a client
    WHEN I am at the `My Dashboard -> My Project` panel
    AND there exists integration(s) in the list
    WHEN I click on a `Completed`, `Gold environment` integration with `Browser Login` option included as Selected Usecase
    AND I am at the `Role Management` tab

  - Test Coverage:
    1.  THEN there should have the button name displaied as `+ Create a New Role`;
    2.  WHEN client click on the `+ Create a New Role` button,
        THEN the `Create New Role` modal will show up,
        THEN client should be able to input some keywords into the text-input-bar;
    3.  THEN there should have corresponding environment tab(s) been displaied in the tab list, such as `Dev`, `Test`, `Prod`;
    4.  THEN there should have the table column header displaied as `Role Name`;
    5.  Then there should have the placeholder text displaied as `Search existing roles` in the search bar;
    6.  THEN client should be able to input some keywords into the search bar;
    7.  WHEN client click on an environment,
        THEN the corresponding role(s) will be listed;
    8.  WHEN client input some keywords AND click the `Search` button,
        THEN the corresponding role(s) will be listed;
    9.  WHEN client click on the trash bin icon to delete a specific role,
        THEN the `Delete Role` modal will show up to let client confirm deletion,
        WHEN client click on `Delete` button to confirm deletion,
        THEN the role will be deleted;
    10. WHEN client click on a specific role,
        THEN the right panel which consistes of `Users` and `Composite Roles` tabs will show up,
        WHEN client click on the `Users` tab AND then click on the `User Detail` eye-shape button,
        THEN the `Additional User Info` modal will show up to let client review the user details;
    11. WHEN client click on a specific role,
        THEN the right panel which consistes of `Users` and `Composite Roles` tabs will show up,
        WHEN client click on the `Users` tab AND then click on the `Remove User` button,
        THEN the `Remove User from Role` modal will show up to let client confirm removal,
        WHEN client click on `Remove` button to confirm removal,
        THEN the user of that role will be removed;
    12. WHEN client click on a specific role,
        THEN the right panel which consistes of `Users` and `Composite Roles` tabs will show up,
        WHEN client click on the `Composite Roles` tab,
        THEN there should be a message displaied as `Select the roles to be nested under the Parent role`,
        AND all the composite roles of that selected role will be listed;

- ### Assign Users to Roles tab

  - Background:
    GIVEN I login as a client
    WHEN I am at the `My Dashboard -> My Project` panel
    AND there exists integration(s) in the list
    WHEN I click on a `Completed`, `Gold environment` integration with `Browser Login` option included as Selected Usecase
    AND I am at the `Assign Users to Roles` tab

  - Test Coverage:
    1.  THEN client should see different options from the drop-down box, depending on the configuration of the selected integration, such as `Dev`, `Test`, `IDIR`, `Basic BCeID`, `Email`, `IDP GUID`;
    2.  THEN client should be able to input some keywords into the search bar;
    3.  WHEN client input some keywords AND click the `Search` button,
        THEN the corresponding user(s) will be listed;
        WHEN client click on a listed user AND then click on the `View` eye-shape button,
        THEN the `Additional User Info` modal will show up to let client review the user details;
    4.  WHEN client input some keywords AND click the `Search` button,
        THEN the `Search in IDIM Web Service Lookup` button will show up after the search process,
        WHEN client click on the `Search in IDIM Web Service Lookup` button,
        THEN the `IDIM Web Service Lookup` modal will show up;

- ### Secrets tab

  - Background:
    GIVEN I login as a client
    WHEN I am at the `My Dashboard -> My Project` panel
    AND there exists integration(s) in the list
    WHEN I click on a `Completed` integration with `Confidential` option included as Selected Client Type
    AND I am at the `Secrets` tab

  - Test Coverage:
    1.  THEN there should have corresponding environment(s) been displaied in the list, such as `Development:`, `Test:`, `Production:`;
        AND there should have `Change your client secret` button under each evvironment;
    2.  WHEN client click on the `Change your client secret` button,
        THEN the `You're About to Change Your Client Secret` modal will show up to let client confirm change;
        WHEN client click on the `Confirm` button,
        THEN the `JSON details` of that selected integration will be changed;

- ### Change History tab

  - Background:
    GIVEN I login as a client
    WHEN I am at the `My Dashboard -> My Project` panel
    AND there exists integration(s) in the list
    WHEN I click on a `Completed` integration
    AND I am at the `Change History` tab

  - Test Coverage:
    1.  THEN client should be able to review all the event details of the selected integration;

## My Teams

- ### Team List

  - Background:
    GIVEN I login as a client
    WHEN I am at the `My Dashboard -> My Teams` panel
    AND there exists team(s) in the `Teams` list which the client is an `Admin`

  - Test Coverage:
    1.  THEN there should have the button name displaied as `+ Create a New Team`;
    2.  WHEN client click on the `+ Create a New Team` button to create a team,
        THEN the `Create a New Team` modal will show up,
        AND within the modal, client should be able to input some words as `Team Name`,
        AND client should be able to input an email address under `Member` column,
        AND client should be able to select either `Admin` or `Member` from the `Role` drop-down box,
        AND client should be able to open correct hyper link page after click on the link,
        WHEN client click on the `Send Invitation` button,
        THEN the invitation will be sent, if the email address is valid;
    3.  THEN there should have the table column headers displaied as `Team Name` and `Actions`;
    4.  THEN there should have the team been highlighted when client click on a specific team;
    5.  WHEN client click on the trash bin icon to delete the team,
        THEN the `Delete team` modal will show up to let client confirm deletion,
        WHEN client click on `Delete Team` button to confirm deletion,
        THEN the team will be deleted;
    6.  WHEN client click on the pencil-shape icon to edit the team,
        THEN the `Edit Team Name` modal will show up to let client edit the `New Team Name`,
        WHEN client click on `Save` button to confirm edition,
        THEN the new team name will be saved;

- ### Members tab

  - Background:
    GIVEN I login as a client
    WHEN I am at the `My Dashboard -> My Teams` panel
    AND there exists team(s) in the `Teams` list which the client is an `Admin`
    WHEN I click on a team
    AND I am at the `Members` tab

  - Test Coverage:
    1.  THEN there should have the button name displaied as `+ Add New Team Members`;
    2.  WHEN client click on the `+ Add New Team Members` button to add member(s),
        THEN the `Add a New Team Member` modal will show up,
        AND within the modal, client should be able to open correct hyper link page after click on the link,
        AND client should be able to select either `Admin` or `Member` from the `Role` drop-down box,
        WHEN client click on the `Confirm` button,
        THEN the new member will be invited to the team, if the email address is valid;
    3.  THEN there should have the table column headers displaied as `Status`, `Email`, `Role`, and `Actions`;
    4.  THEN corresponding members from the team should be listed in the member table;
    5.  WHEN client click on the trash bin icon to delete a member,
        THEN the `Delete Team Member` modal will show up to let client confirm deletion,
        WHEN client click on `Delete` button to confirm deletion,
        THEN the member will be deleted;
    6.  WHEN client click on the arrow icon to resend invitation,
        THEN the invitation will be send to the member again;

- ### Integrations tab

  - Background:
    GIVEN I login as a client
    WHEN I am at the `My Dashboard -> My Teams` panel
    AND there exists team(s) in the `Teams` list which the client is an `Admin` AND there are integration(s) associated with this team
    WHEN I click on a team
    AND I am at the `Integrations` tab

  - Test Coverage:
    1.  THEN there should have the table column headers displaied as `Status`, `Request ID`, `Project Name`, and `Actions`;
    2.  THEN corresponding integrations from the team should be listed in the integration table;
    3.  WHEN client click on the eye-shape button to view on the integration,
        THEN the page will be turn to `My Projects` panel -> `INTEGRATIONS` list
        AND the corresponding integration will be highlighted;
    4.  WHEN client click on the pencil-shape icon to edit the integration,
        THEN the page will turn to integration configuration page;
    5.  WHEN client click on the trash bin icon to delete the integration,
        THEN the `Confirm Deletion` modal will show up to let client confirm deletion,
        WHEN client click on `Delete` button to confirm deletion,
        THEN the integration will be deleted;

- ### CSS API Account tab

  - Background:
    GIVEN I login as a client
    WHEN I am at the `My Dashboard -> My Teams` panel
    AND there exists team(s) in the `Teams` list which the client is an `Admin`
    WHEN I click on a team
    AND I am at the `CSS API Account` tab

  - Test Coverage:

    1.  THEN there should have the table column headers displaied as `API Account ID` and `Actions`;
    2.  THEN there should have the API Account ID been highlighted when client click on a specific API Account ID;
    3.  WHEN client click on the `Copy to clipboard` icon to copy token information,
        THEN the infomation should be correct and ready to use;
    4.  WHEN client click on the `Download` button to download the token information file,
        THEN the information file should be ready to download;
    5.  WHEN client click on the `Update secret` icon to update the token secrets,
        THEN the `Request a new secret for CSS API Account` modal will show up to let client confirm update,
        WHEN client click on `Confirm` button to confirm update,
        THEN the token secrets will be updated;
    6.  WHEN client click on the trash bin icon to delete an API account,
        THEN the `Delete CSS API Account` modal will show up to let client confirm deletion,
        WHEN client click on `Delete CSS API Account` button to confirm deletion,
        THEN the API Account will be deleted;
    7.  AND client should be able to open correct hyper link page after click on the `here` link
