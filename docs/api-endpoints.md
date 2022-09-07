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
<tr><td>Status Code</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>

```json
{
  "success": true,
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
<td>

```json
{ "success": false, "message": "<error_message>" }
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
<tr><td>Status Code</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>

```json
{
  "success": true,
  "data": {
    "id": 2,
    "projectName": "test",
    "authType": "oidc",
    "environments": ["dev"],
    "status": "applied",
    "createdAt": "2022-08-10T21:21:25.303Z",
    "updatedAt": "2022-08-10T21:21:53.598Z"
  }
}
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
<tr><td>Status Code</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>

```json
{
  "success": true,
  "data": [
    {
      "name": "role1"
    },
    {
      "name": "role2"
    }
  ]
}
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
<tr><td>Status Code</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>

```json
{
  "success": true,
  "data": {
    "name": "role1"
  }
}
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
<tr><td>Status Code</td><td>Response</td></tr>
<tr>
<td>201</td>
<td>

```json
{
  "success": true,
  "message": "created"
}
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
<tr><td>Status Code</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>

```json
{
  "success": true,
  "message": "deleted"
}
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
<tr><td>Status Code</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>

```json
{
  "success": true,
  "message": "updated"
}
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

- Request Sample

```sh
curl -H "Authorization: Bearer $API_TOKEN" --data '{"name":"role2"}' -X PUT /api/v1/integrations/2/dev/roles/role1
```

### Get all the user-role mappings for an Integration

```sh
GET /api/v1/integrations/{integrationId}/{environment}/user-role-mappings
```

- Parameters

  | Name            | Type   | In   | Description             |
  | --------------- | ------ | ---- | ----------------------- |
  | `integrationId` | number | path | The integration id      |
  | `environment`   | string | path | Integration Environment |

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>

```json
{
  "success": true,
  "data": [
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
      "roles": [{ "name": "role1" }]
    }
  ]
}
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

- Request Sample

```sh
curl -H "Authorization: Bearer $API_TOKEN" -X GET /api/v1/integrations/2/dev/user-role-mappings
```

### Add/Delete user-role mappings for an Integration

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
<tr><td>Status Code</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>

```json
{
  "success": true,
  "message": "created | deleted"
}
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

- Request Sample

```sh
curl -H "Authorization: Bearer $API_TOKEN" --data '{"username":"002c1e0f30fa48e782809a0726ef263c@bceidbasic","roleName":"role1","operation":"add"}' -X POST /api/v1/integrations/2/dev/user-role-mappings
```
