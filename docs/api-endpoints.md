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

<table style="margin-left: 2em;">
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

#### Create roles for the integration

```
POST /api/integrations/{id}/roles
```

- Parameters

  | Name    | Type        | In   | Description               |
  | ------- | ----------- | ---- | ------------------------- |
  | `id`    | number      | path | The id of the integration |
  | `roles` | `NewRole`[] | body | Array of roles            |

  ```ts
  interface NewRole {
    name: string;
    envs: 'dev' | 'test' | 'prod';
  }
  ```

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>

```json
[
  {
    "env": "dev",
    "success": ["admin", "manager"],
    "duplicate": [],
    "failure": [],
    "clientNotFound": false
  },
  {
    "env": "test",
    "success": ["admin"],
    "duplicate": ["manager"],
    "failure": [],
    "clientNotFound": false
  },
  {
    "env": "prod",
    "success": [],
    "duplicate": [],
    "failure": ["admin", "manager"],
    "clientNotFound": true
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

#### Delete a role for the integration

```
DELETE /api/{environment}/integrations/{id}/roles/{roleName}
```

- Parameters

  | Name          | Type                      | In   | Description                            |
  | ------------- | ------------------------- | ---- | -------------------------------------- |
  | `environment` | 'dev' \| 'test' \| 'prod' | path | The environment to search the users in |
  | `id`          | number                    | path | The id of the integration              |
  | `roleName`    | string                    | path | The role name to delete                |

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>

```json
// the deleted role name
manager
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
  | `id`                | number                    | path  | The id of the integration                 |
  | `search` (optional) | string                    | query | The search key                            |
  | `first` (optional)  | number                    | query | The pagination offset (defaults to 0)     |
  | `max` (optional)    | number                    | query | The maximum results size (defaults to 50) |

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>

```json
["admin", "manager"]
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

#### Get all roles for the integration user

```
GET /api/{environment}/integrations/{id}/users/{username}/roles
```

- Parameters

  | Name          | Type                      | In   | Description                            |
  | ------------- | ------------------------- | ---- | -------------------------------------- |
  | `environment` | 'dev' \| 'test' \| 'prod' | path | The environment to search the users in |
  | `id`          | number                    | path | The id of the integration              |
  | `username`    | string                    | path | The username of the user               |

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>

```json
["admin", "manager"]
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

#### Manage the user roles

```
PUT /api/{environment}/integrations/{id}/users/{username}/roles
```

- Parameters

  | Name            | Type                      | In   | Description                            |
  | --------------- | ------------------------- | ---- | -------------------------------------- |
  | `environment`   | 'dev' \| 'test' \| 'prod' | path | The environment to search the users in |
  | `id`            | number                    | path | The id of the integration              |
  | `username`      | string                    | path | The username of the user               |
  | `rolesToAdd`    | string[]                  | body | array of roles to add                  |
  | `rolesToRemove` | string[]                  | body | array of roles to remove               |

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>

```json
// all roles for the user after the changes
["admin", "manager"]
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

### Request Sample

```sh
curl -H "Authorization: Bearer $API_TOKEN" --data '{"rolesToAdd":"["admin"]","rolesToRemove":"["manager"]"}' -X PUT /api/dev/integrations/111/users/f9468f2708443a0729704d475f1e8bc3@idir/roles
```
