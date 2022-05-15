## CSS API Architect Proposal and Requirments

### API Token Management System

- Users/Teams create a new user/team token with an expiry duration.
- Users/Teams delete an existing user/team token to invalidate the token.

### API Token Validation System

- The backend API system finds the API token from the `Authorization request header`.
- The backend validates the token and obtains the requester identity.
- The backend declines the request if the action is not authorized.
- The backend processes the request if the action is authorized.

### API Endpoints

#### Get all users for the identity provider filtered according to search criteria

```
GET /api/{environment}/idps/{idp}/users/{search}
```

- Parameters

  | Name                  | Type                                                    | In    | Description                                     |
  | --------------------- | ------------------------------------------------------- | ----- | ----------------------------------------------- |
  | `environment`         | 'dev' \| 'test' \| 'prod'                               | path  | The environment to search the users in          |
  | `idp`                 | 'idir' \| 'bceidbasic' \| 'bceidbusiness'\| 'bceidboth' | path  | The identity provider the users associated with |
  | `search`              | string                                                  | path  | The search key to use for the search criteria   |
  | `property` (optional) | 'email' \| 'firstName' \| 'lastName' \| 'guid'          | query | The search property (defaults to 'email')       |

- Responses

  <table>
  <tr><td>Status Code</td><td>Response</td></tr>
  <tr>
  <td>200</td>
  <td>

```json
[
  {
    "username": "f9468f2708443a0729704d475f1e8bc3@idir",
    "firstName": "James",
    "lastName": "Smith",
    "email": "james.smith@gov.bc.ca",
    "attributes": {
      "idir_user_guid": "F9468F2708443A0729704D475F1E8BC3",
      "idir_username": "jasmith"
    }
  }
]
```

  </td>
  </tr>
  <tr>
  <td>422</td>
  <td>

```json
{ "success": false, "message": "<error_message>" }
```

  </td></tr>
  </table>

#### Get all roles for the integration

```
GET /api/{environment}/integrations/{id}/roles
```

- Parameters

  | Name                | Type                      | In    | Description                               |
  | ------------------- | ------------------------- | ----- | ----------------------------------------- |
  | `environment`       | 'dev' \| 'test' \| 'prod' | path  | The environment to search the users in    |
  | `integrationId`     | number                    | path  | The id of the integration                 |
  | `search` (optional) | string                    | query | The search key                            |
  | `first` (optional)  | number                    | query | The pagination offset (defaults to 0)     |
  | `max` (optional)    | number                    | query | The maximum results size (defaults to 50) |

#### Create Roles

```
POST /api/roles
```

- Parameters

  | Name                | Type                      | Description                               |
  | ------------------- | ------------------------- | ----------------------------------------- |
  | `environment`       | 'dev' \| 'test' \| 'prod' | The environment to search the users in    |
  | `integrationId`     | number                    | The id of the integration                 |
  | `search` (optional) | string                    | The search key                            |
  | `first` (optional)  | number                    | The pagination offset (defaults to 0)     |
  | `max` (optional)    | number                    | The maximum results size (defaults to 50) |

#### List User Roles

```
POST /api/user-roles
```

- Parameters
  | Name | Type | Description |
  | --------------------- | ------- | -------------------------------------------------------------------- |
  | `environment` | 'dev' \| 'test' \| 'prod' | The environment to search the users in |
  | `integrationId` | number | The id of the integration |
  | `username` | string | The username of the user |

#### Manage User Roles

```
PUT /api/user-roles
```

- Parameters
  | Name | Type | Description |
  | --------------------- | ------- | -------------------------------------------------------------------- |
  | `environment` | 'dev' \| 'test' \| 'prod' | The environment to search the users in |
  | `integrationId` | number | The id of the integration |
  | `username` | string | The username of the user |
  | `roleName` | string | The target role name |
  | `mode` | 'add' \| 'del' | The action type |

### Request Sample

```sh
curl -H "Authorization: Bearer $API_TOKEN" --data '{"roleName": "role"}' -X POST /api/
```
