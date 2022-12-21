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

  - Test Coverage:
    1. should match the button name, table headers, selected integration info;
    2. expect the endpoint `getRequests` function been called;
    3. should be able to click the `Delete` button, and expect the endpoint `deleteRequest` function been called;
    4. should be able to click the `Edit` button, and expect the endpoint `useRouter` function been called;
    5. should be able to click the `Create Integration` button, and expect the endpoint `useRouter` function been called;

- ### Technical Details tab

- ### Role Management tab

  - Test Coverage:
    1. Should match the expected button name, environment names, select/unselected env, table headers, table contents, place-holder-text in search bar;
    2. Should be able to input keywords in `Search Existing Role` input field;
    3. Should be able to input keywords in `Create New Role` input field;
    4. Should be able to click the `Search` button, and check the endpoint `listClientRoles` function been called;

- ### Assign Users to Roles tab

  - Test Coverage:
    1. Should display correct property options from the drop-down box;
    2. Should be able to input some keywords in the `Enter Search Criteria` input field;
    3. Should be able to click the `Search` button, and check the endpoint `searchKeycloakUsers` function been called;

- ### Secrets tab

  - Test Coverage:
    1. Should match all the included environments and button name;
    2. Should be able to click the `Change your client secret` button and return the expected modal, and check the endpoint `changeClientSecret` function been called when click `Confirm`;

- ### Change History tab
  - Test Coverage:
    1. Should match the event content, and check the endpoint `getEvents` function been called;

## My Teams

- ### Team List
- ### Members tab
- ### Integrations tab
- ### CSS API Account tab
