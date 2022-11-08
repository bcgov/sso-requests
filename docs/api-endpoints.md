# CSS API Architect Proposal and Requirments

## API Token Management System

- Team admin can request for an API Account through CSS App for managing gold integrations. Using the API Account credentials, the team admin can request for a token with an expiry duration
- Token url would be `https://loginproxy.gov.bc.ca/auth/realms/standard/protocol/openid-connect/token`

### Requesting a token

- Request a token using below command

  ```sh
  export CLIENT_ID=
  export CLIENT_SECRET=
  export TOKEN_URL=

  curl -X POST -d grant_type=client_credentials -d client_id=$CLIENT_ID -d client_secret=$CLIENT_SECRET $TOKEN_URL
  ```

- Set `API_TOKEN` variable with `access_token` value from the response

## API Token Validation System

- The backend API system finds the API token from the `Authorization request header`.
- The backend validates the token and obtains the requester identity.
- The backend declines the request if the action is not authorized.
- The backend processes the request if the action is authorized.

## OpenAPI Spec

### Get List of Gold Integrations managed by the Team

```sh
GET /api/v1/integrations
```

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Description</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>OK</td>
<td>

```json
{
  "data": [
    {
      "id": 2,
      "projectName": "test",
      "authType": "oidc",
      "environments": ["dev"],
      "status": "applied",
      "createdAt": "2022-08-10T21:21:25.303Z",
      "updatedAt": "2022-08-10T21:21:53.598Z"
    }
  ]
}
```

</td>
</tr>
<tr>
<td>422</td>
<td>Unprocessable Entity</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
</table>

```sh
curl -H "Authorization: Bearer $API_TOKEN" -X GET /api/v1/integrations
```

### Get a Gold Integration managed by the Team

```
GET /api/v1/integrations/{integrationId}
```

- Parameters

  | Name            | Type   | In   | Description        |
  | --------------- | ------ | ---- | ------------------ |
  | `integrationId` | number | path | The integration id |

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Description</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>OK</td>
<td>

```json
{
  "id": 2,
  "projectName": "test",
  "authType": "oidc",
  "environments": ["dev"],
  "status": "applied",
  "createdAt": "2022-08-10T21:21:25.303Z",
  "updatedAt": "2022-08-10T21:21:53.598Z"
}
```

</td>
</tr>
<tr>
<td>404</td>
<td>Not Found</td>
<td>

```json
{ "message": "string" }
```

</td>
</tr>
<tr>
<td>422</td>
<td>Unprocessable Entity</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
</table>

```sh
curl -H "Authorization: Bearer $API_TOKEN" -X GET /api/v1/integrations/2
```

### List all available roles for an Integration

```sh
GET /api/v1/integrations/{integrationId}/{environment}/roles
```

- Parameters

  | Name            | Type   | In   | Description             |
  | --------------- | ------ | ---- | ----------------------- |
  | `integrationId` | number | path | The integration id      |
  | `environment`   | string | path | Integration Environment |

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Description</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>OK</td>
<td>

```json
{
  "data": [
    {
      "name": "role1",
      "composite": false
    },
    {
      "name": "role2",
      "composite": false
    }
  ]
}
```

</td>
</tr>
<tr>
<td>422</td>
<td>Unprocessable Entity</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
</table>

```sh
curl -H "Authorization: Bearer $API_TOKEN" -X GET /api/v1/integrations/2/dev/roles
```

### Get a role for an Integration

```sh
GET /api/v1/integrations/{integrationId}/{environment}/roles/{roleName}
```

- Parameters

  | Name            | Type   | In   | Description             |
  | --------------- | ------ | ---- | ----------------------- |
  | `integrationId` | number | path | The integration id      |
  | `environment`   | string | path | Integration Environment |
  | `roleName`      | string | path | Role name               |

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Description</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>OK</td>
<td>

```json
{
  "name": "role1",
  "composite": false
}
```

</td>
</tr>
<tr>
<td>404</td>
<td>Not Found</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
<tr>
<td>422</td>
<td>Unprocessable Entity</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
</table>

```sh
curl -H "Authorization: Bearer $API_TOKEN" -X GET /api/v1/integrations/2/dev/roles/role1
```

### Create role for an Integration

```sh
POST /api/v1/integrations/{integrationId}/{environment}/roles
```

- Parameters

  | Name            | Type   | In   | Description             |
  | --------------- | ------ | ---- | ----------------------- |
  | `integrationId` | number | path | The integration id      |
  | `environment`   | string | path | Integration Environment |

- Payload

```json
{
  "name": "role1"
}
```

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Description</td><td>Response</td></tr>
<tr>
<td>201</td>
<td>Created</td>
<td>

```json
{
  "name": "role1",
  "composite": false
}
```

</td>
</tr>
<tr>
<td>400</td>
<td>Bad Request</td>
<td>

```json
{
  "message": "string"
}
```

</td>
</tr>
<tr>
<td>404</td>
<td>Not Found</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
<tr>
<td>409</td>
<td>Conflict</td>
<td>

```json
{
  "message": "string"
}
```

</td>
</tr>
<tr>
<td>422</td>
<td>Unprocessable Entity</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
</table>

```sh
curl -H "Authorization: Bearer $API_TOKEN" --data '{"name":"role1"}' -X POST /api/v1/integrations/2/dev/roles
```

### Delete role for an Integration

```sh
DELETE /api/v1/integrations/{integrationId}/{environment}/roles/{roleName}
```

- Parameters

  | Name            | Type   | In   | Description                    |
  | --------------- | ------ | ---- | ------------------------------ |
  | `integrationId` | number | path | The integration id             |
  | `environment`   | string | path | Integration Environment        |
  | `roleName`      | string | path | Name of the role to be deleted |

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Description</td><td>Response</td></tr>
<tr>
<td>204</td>
<td>No Content</td>
<td></td>
</tr>
<tr>
<td>404</td>
<td>Not Found</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
<tr>
<td>422</td>
<td>Unprocessable Entity</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
</table>

```sh
curl -H "Authorization: Bearer $API_TOKEN" -X DELETE /api/v1/integrations/2/dev/roles/role1
```

### Update role for an Integration

```sh
PUT /api/v1/integrations/{integrationId}/{environment}/roles/{roleName}
```

- Parameters

  | Name            | Type   | In   | Description                    |
  | --------------- | ------ | ---- | ------------------------------ |
  | `integrationId` | number | path | The integration id             |
  | `environment`   | string | path | Integration Environment        |
  | `roleName`      | string | path | Name of the role to be updated |

- Payload

```json
{
  "name": "role2"
}
```

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Description</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>OK</td>
<td>

```json
{
  "name": "role2",
  "composite": false
}
```

</td>
</tr>
<tr>
<td>400</td>
<td>Bad Request</td>
<td>

```json
{
  "message": "string"
}
```

</td>
</tr>
<tr>
<td>404</td>
<td>Not Found</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
<tr>
<td>409</td>
<td>Conflict</td>
<td>

```json
{
  "message": "string"
}
```

</td>
</tr>
<tr>
<td>422</td>
<td>Unprocessable Entity</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
</table>

- Request Sample

```sh
curl -H "Authorization: Bearer $API_TOKEN" --data '{"name":"role2"}' -X PUT /api/v1/integrations/2/dev/roles/role1
```

### List all composites of a role for an Integration

```sh
GET /api/v1/integrations/{integrationId}/{environment}/roles/{roleName}/composite-roles
```

- Parameters

  | Name            | Type   | In   | Description             |
  | --------------- | ------ | ---- | ----------------------- |
  | `integrationId` | number | path | The integration id      |
  | `environment`   | string | path | Integration Environment |
  | `roleName`      | string | path | The role name           |

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Description</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>OK</td>
<td>

```json
{
  "data": [
    {
      "name": "role1",
      "composite": false
    },
    {
      "name": "role2",
      "composite": false
    }
  ]
}
```

</td>
</tr>
<tr>
<td>422</td>
<td>Unprocessable Entity</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
</table>

```sh
curl -H "Authorization: Bearer $API_TOKEN" -X GET /api/v1/integrations/2/dev/roles/role1/composite-roles
```

### Get a composite of a role for an Integration

```sh
GET /api/v1/integrations/{integrationId}/{environment}/roles/{roleName}/composite-roles/{compositeRoleName}
```

- Parameters

  | Name                | Type   | In   | Description             |
  | ------------------- | ------ | ---- | ----------------------- |
  | `integrationId`     | number | path | The integration id      |
  | `environment`       | string | path | Integration Environment |
  | `roleName`          | string | path | Role name               |
  | `compositeRoleName` | string | path | Composite Role name     |

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Description</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>OK</td>
<td>

```json
{
  "name": "role2",
  "composite": false
}
```

</td>
</tr>
<tr>
<td>404</td>
<td>Not Found</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
<tr>
<td>422</td>
<td>Unprocessable Entity</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
</table>

```sh
curl -H "Authorization: Bearer $API_TOKEN" -X GET /api/v1/integrations/2/dev/roles/role1/composite-roles/role2
```

### Create role for an Integration

```sh
POST /api/v1/integrations/{integrationId}/{environment}/roles/role1/composite-roles
```

- Parameters

  | Name            | Type   | In   | Description             |
  | --------------- | ------ | ---- | ----------------------- |
  | `integrationId` | number | path | The integration id      |
  | `environment`   | string | path | Integration Environment |
  | `roleName`      | string | path | Name of the role        |

- Payload

```json
[
  {
    "name": "role2"
  }
]
```

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Description</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>OK</td>
<td>

```json
{
  "name": "role1",
  "composite": true
}
```

</td>
</tr>
<tr>
<td>400</td>
<td>Bad Request</td>
<td>

```json
{
  "message": "string"
}
```

</td>
</tr>
<tr>
<td>404</td>
<td>Not Found</td>
<td>

```json
{ "message": "string" }
```

</td>
</tr>
<tr>
<td>422</td>
<td>Unprocessable Entity</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
</table>

```sh
curl -H "Authorization: Bearer $API_TOKEN" --data '{"name":"role1"}' -X POST /api/v1/integrations/2/dev/roles/role1/composite-roles
```

### Delete a composite of a role for an Integration

```sh
DELETE /api/v1/integrations/{integrationId}/{environment}/roles/{roleName}/composite-roles/{compositeRoleName}
```

- Parameters

  | Name                | Type   | In   | Description                       |
  | ------------------- | ------ | ---- | --------------------------------- |
  | `integrationId`     | number | path | The integration id                |
  | `environment`       | string | path | Integration Environment           |
  | `roleName`          | string | path | Role Name                         |
  | `compositeRoleName` | string | path | Composite role name to be deleted |

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Description</td><td>Response</td></tr>
<tr>
<td>204</td>
<td>No Content</td>
<td></td>
</tr>
<tr>
<td>404</td>
<td>Not Found</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
<tr>
<td>422</td>
<td>Unprocessable Entity</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
</table>

```sh
curl -H "Authorization: Bearer $API_TOKEN" -X DELETE /api/v1/integrations/2/dev/roles/role1/composite-roles/role2
```

### Get all the user-role mappings for an Integration

```sh
GET /api/v1/integrations/{integrationId}/{environment}/user-role-mappings
```

- Parameters

  | Name            | Type   | In    | Description             |
  | --------------- | ------ | ----- | ----------------------- |
  | `integrationId` | number | path  | The integration id      |
  | `environment`   | string | path  | Integration Environment |
  | `roleName`      | string | query | The role name           |
  | `username`      | string | query | The username            |

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Description</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>OK</td>
<td>

```json
{
  "users": [
    {
      "username": "username",
      "email": "email",
      "firstName": "firstName",
      "lastName": "lastName",
      "attributes": {
        "attributeKey1": ["attributeValue1"],
        "attributeKey1": ["attributeValue2"]
      }
    }
  ],
  "roles": [
    {
      "name": "role1",
      "composite": false
    }
  ]
}
```

</td>
</tr>
<tr>
<td>400</td>
<td>Bad Request</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
<td>404</td>
<td>Not Found</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
<td>422</td>
<td>Unprocessable Entity</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
</table>

- Request Sample

```sh
curl -H "Authorization: Bearer $API_TOKEN" -X GET /api/v1/integrations/2/dev/user-role-mappings
```

### Manage user-role mappings for an Integration

```sh
POST /api/v1/integrations/{integrationId}/{environment}/roles/user-role-mappings
```

- Parameters

  | Name            | Type   | In   | Description             |
  | --------------- | ------ | ---- | ----------------------- |
  | `integrationId` | number | path | The integration id      |
  | `environment`   | string | path | Integration Environment |

- Payload

```json
{
  "username": "002c1e0f30fa48e782809a0726ef263c@bceidbasic",
  "roleName": "role2",
  "operation": "<add | del>"
}
```

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Description</td><td>Response</td></tr>
<td>201</td>
<td>Created</td>
<td>

```json
{
  "users": [
    {
      "username": "username",
      "email": "email",
      "firstName": "firstName",
      "lastName": "lastName",
      "attributes": {
        "attributeKey1": ["attributeValue1"],
        "attributeKey1": ["attributeValue2"]
      }
    }
  ],
  "roles": [
    {
      "name": "role1",
      "composite": false
    }
  ]
}
```

</td></tr>
<td>204</td>
<td>No Content</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
<td>400</td>
<td>Bad Request</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
<tr>
<td>404</td>
<td>Not Found</td>
<td>

```json
{
  "message": "string"
}
```

</td>
</tr>
<tr>
<td>422</td>
<td>Unprocessable Entity</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
</table>

- Request Sample

```sh
curl -H "Authorization: Bearer $API_TOKEN" --data '{"username":"002c1e0f30fa48e782809a0726ef263c@bceidbasic","roleName":"role1","operation":"add"}' -X POST /api/v1/integrations/2/dev/user-role-mappings
```

### Get List of Users associated with IDIR

```sh
GET /api/v1/environment/idir/users
```

- Parameters

  | Name        | Type   | In    | Description     |
  | ----------- | ------ | ----- | --------------- |
  | `firstName` | string | query | User first name |
  | `lastName`  | string | query | User last name  |
  | `guid`      | string | query | User guid       |
  | `email`     | string | query | User email      |

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Description</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>OK</td>
<td>

```json
{
  "data": [
    {
      "username": "08fe81112408411081ea011cf0ec945d@idir",
      "email": "testuser@gov.bc.ca",
      "firstName": "Test",
      "lastName": "User",
      "attribues": {
        "displayName": "Test User",
        "idir_userid": "AAAFEE111DD24C6D11111DFDC8BC51A1"
      }
    }
  ]
}
```

</td>
</tr>
<td>400</td>
<td>Bad Request</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
<tr>
<td>422</td>
<td>Unprocessable Entity</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
</table>

```sh
curl -H "Authorization: Bearer $API_TOKEN" -X GET /api/v1/environment/idir/users
```

### Get List of Users associated with Azure IDIR

```sh
GET /api/v1/environment/azure-idir/users
```

- Parameters

  | Name        | Type   | In    | Description     |
  | ----------- | ------ | ----- | --------------- |
  | `firstName` | string | query | User first name |
  | `lastName`  | string | query | User last name  |
  | `guid`      | string | query | User guid       |
  | `email`     | string | query | User email      |

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Description</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>OK</td>
<td>

```json
{
  "data": [
    {
      "username": "08fe81112408411081ea011cf0ec945d@azureidir",
      "email": "testuser@gov.bc.ca",
      "firstName": "Test",
      "lastName": "User",
      "attribues": {
        "displayName": "Test User",
        "idir_userid": "AAAFEE111DD24C6D11111DFDC8BC51A1"
      }
    }
  ]
}
```

</td>
</tr>
<td>400</td>
<td>Bad Request</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
<tr>
<td>422</td>
<td>Unprocessable Entity</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
</table>

```sh
curl -H "Authorization: Bearer $API_TOKEN" -X GET /api/v1/environment/azure-idir/users
```

### Get List of Users associated with GitHub bcgov

```sh
GET /api/v1/environment/github-bcgov/users
```

- Parameters

  | Name      | Type   | In    | Description     |
  | --------- | ------ | ----- | --------------- |
  | `name`    | string | query | User first name |
  | `loginid` | string | query | User last name  |
  | `guid`    | string | query | User guid       |
  | `email`   | string | query | User email      |

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Description</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>OK</td>
<td>

```json
{
  "data": [
    {
      "username": "08fe81112408411081ea011cf0ec945d@github",
      "email": "testuser@gov.bc.ca",
      "firstName": "Test",
      "lastName": "User",
      "attribues": {
        "displayName": "Test User",
        "idir_userid": "AAAFEE111DD24C6D11111DFDC8BC51A1"
      }
    }
  ]
}
```

</td>
</tr>
<td>400</td>
<td>Bad Request</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
<tr>
<td>422</td>
<td>Unprocessable Entity</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
</table>

```sh
curl -H "Authorization: Bearer $API_TOKEN" -X GET /api/v1/environment/github/users
```

### Get List of Users associated with GitHub public

```sh
GET /api/v1/environment/github-public/users
```

- Parameters

  | Name      | Type   | In    | Description     |
  | --------- | ------ | ----- | --------------- |
  | `name`    | string | query | User first name |
  | `loginid` | string | query | User last name  |
  | `guid`    | string | query | User guid       |
  | `email`   | string | query | User email      |

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Description</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>OK</td>
<td>

```json
{
  "data": [
    {
      "username": "08fe81112408411081ea011cf0ec945d@github",
      "email": "testuser@gov.bc.ca",
      "firstName": "Test",
      "lastName": "User",
      "attribues": {
        "displayName": "Test User",
        "idir_userid": "AAAFEE111DD24C6D11111DFDC8BC51A1"
      }
    }
  ]
}
```

</td>
</tr>
<td>400</td>
<td>Bad Request</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
<tr>
<td>422</td>
<td>Unprocessable Entity</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
</table>

```sh
curl -H "Authorization: Bearer $API_TOKEN" -X GET /api/v1/environment/github/users
```

### Get List of Users associated with Basic BCeID

```sh
GET /api/v1/environment/basic-bceid/users
```

- Parameters

  | Name   | Type   | In    | Description |
  | ------ | ------ | ----- | ----------- |
  | `guid` | string | query | User guid   |

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Description</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>OK</td>
<td>

```json
{
  "data": [
    {
      "username": "08fe81112408411081ea011cf0ec945d@bceidbasic",
      "email": "testuser@gov.bc.ca",
      "firstName": "Test",
      "lastName": "User",
      "attribues": {
        "displayName": "Test User",
        "idir_userid": "AAAFEE111DD24C6D11111DFDC8BC51A1"
      }
    }
  ]
}
```

</td>
</tr>
<td>400</td>
<td>Bad Request</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
<tr>
<td>422</td>
<td>Unprocessable Entity</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
</table>

```sh
curl -H "Authorization: Bearer $API_TOKEN" -X GET /api/v1/environment/basic-bceid/users
```

### Get List of Users associated with Business BCeID

```sh
GET /api/v1/environment/business-bceid/users
```

- Parameters

  | Name   | Type   | In    | Description |
  | ------ | ------ | ----- | ----------- |
  | `guid` | string | query | User guid   |

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Description</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>OK</td>
<td>

```json
{
  "data": [
    {
      "username": "08fe81112408411081ea011cf0ec945d@bceidbusiness",
      "email": "testuser@gov.bc.ca",
      "firstName": "Test",
      "lastName": "User",
      "attribues": {
        "displayName": "Test User",
        "idir_userid": "AAAFEE111DD24C6D11111DFDC8BC51A1"
      }
    }
  ]
}
```

</td>
</tr>
<td>400</td>
<td>Bad Request</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
<tr>
<td>422</td>
<td>Unprocessable Entity</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
</table>

```sh
curl -H "Authorization: Bearer $API_TOKEN" -X GET /api/v1/environment/business-bceid/users
```

### Get List of Users associated with Basic/Business BCeID

```sh
GET /api/v1/environment/basic-business-bceid/users
```

- Parameters

  | Name   | Type   | In    | Description |
  | ------ | ------ | ----- | ----------- |
  | `guid` | string | query | User guid   |

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Description</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>OK</td>
<td>

```json
{
  "data": [
    {
      "username": "08fe81112408411081ea011cf0ec945d@bceidboth",
      "email": "testuser@gov.bc.ca",
      "firstName": "Test",
      "lastName": "User",
      "attribues": {
        "displayName": "Test User",
        "idir_userid": "AAAFEE111DD24C6D11111DFDC8BC51A1"
      }
    }
  ]
}
```

</td>
</tr>
<td>400</td>
<td>Bad Request</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
<tr>
<td>422</td>
<td>Unprocessable Entity</td>
<td>

```json
{ "message": "string" }
```

</td></tr>
</table>

```sh
curl -H "Authorization: Bearer $API_TOKEN" -X GET /api/v1/environment/basic-business-bceid/users
```
