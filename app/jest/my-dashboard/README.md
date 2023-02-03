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
- ### Members tab
- ### Integrations tab
- ### CSS API Account tab
