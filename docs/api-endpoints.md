# CSS API Architect Proposal and Requirments

## API Token Management System

- Team admin can request for an API Account through CSS App for managing gold integrations. Using the API Account credentials, the team admin can request for a token with an expiry duration
- Token url would be `https://loginproxy.gov.bc.ca/auth/realms/standard/protocol/openid-connect/token`

## API Token Validation System

- The backend API system finds the API token from the `Authorization request header`.
- The backend validates the token and obtains the requester identity.
- The backend declines the request if the action is not authorized.
- The backend processes the request if the action is authorized.

## OpenAPI Spec

### Get List of Gold Integrations managed by the Team

```sh
GET /api/integrations
```

- Responses

<table style="margin-left: 2em;">
<tr><td>Status Code</td><td>Response</td></tr>
<tr>
<td>200</td>
<td>

```json
{
  "data": [
    {
      "id": 2,
      "projectName": "test",
      "protocol": "oidc",
      "requester": "James Smith",
      "teamId": 1,
      "environments": ["dev"],
      "createdAt": "2022-08-10T21:21:25.303Z",
      "updatedAt": "2022-08-10T21:21:53.598Z"
    }
  ]
}
```

</td>
</tr>
</table>

```sh
curl -H "Authorization: Bearer $API_TOKEN" -X GET /api/integrations
```

### Get a Gold Integration managed by the Team

```
GET /api/integrations/{integrationId}
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
  "data": [
    {
      "id": 2,
      "projectName": "test",
      "protocol": "oidc",
      "requester": "James Smith",
      "teamId": 1,
      "environments": ["dev"],
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
{ "success": false, "message": "integration #{integrationId} not found" }
```
</td></tr>
</table>

```sh
curl -H "Authorization: Bearer $API_TOKEN" -X GET /api/integrations/2
```

### List all available roles for an Integration

```sh
GET /api/integrations/{integrationId}/{environment}/roles
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
  "data": ["role1", "role2", "role3"]
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
curl -H "Authorization: Bearer $API_TOKEN" -X GET /api/integrations/2/dev/roles
```

### Create role for an Integration

```sh
GET /api/integrations/{integrationId}/{environment}/roles
```

- Parameters

  | Name            | Type   | In   | Description             |
  | --------------- | ------ | ---- | ----------------------- |
  | `integrationId` | number | path | The integration id      |
  | `environment`   | string | path | Integration Environment |

- Payload

```json
{
  "roleName": "role1"
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
curl -H "Authorization: Bearer $API_TOKEN" --data '{"roleName":"role1"}' -X POST /api/integrations/2/dev/roles
```

### Delete role for an Integration

```sh
GET /api/integrations/{integrationId}/{environment}/roles/{roleName}
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
<td>204</td>
<td>

`No Content`

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
curl -H "Authorization: Bearer $API_TOKEN" -X DELETE /api/integrations/2/dev/roles/role1
```

### Update role for an Integration

```sh
GET /api/integrations/{integrationId}/{environment}/roles/{roleName}
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
  "roleName": "role2"
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
curl -H "Authorization: Bearer $API_TOKEN" --data '{"newRoleName":"role2"}' -X PUT /api/integrations/2/dev/roles/role1
```

### Get all the user-role mappings for an Integration

```sh
GET /api/integrations/{integrationId}/{environment}/user-role-mappings
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
  "data": [
    {
      "role": "role1",
      "users": []
    }
  ]
}
```

</td>
</tr>
</table>

- Request Sample

```sh
curl -H "Authorization: Bearer $API_TOKEN" -X GET /api/integrations/2/dev/user-role-mappings
```

### Add/Delete user-role mappings for an Integration

```sh
GET /api/integrations/{integrationId}/{environment}/roles/user-role-mappings
```

- Parameters

  | Name            | Type   | In   | Description             |
  | --------------- | ------ | ---- | ----------------------- |
  | `integrationId` | number | path | The integration id      |
  | `environment`   | string | path | Integration Environment |

- Payload

```json
{
  "userName": "002c1e0f30fa48e782809a0726ef263c@bceidbasic",
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
curl -H "Authorization: Bearer $API_TOKEN" --data '{"userName":"002c1e0f30fa48e782809a0726ef263c@bceidbasic","roleName":"role1","operation":"add"}' -X POST /api/integrations/2/dev/user-role-mappings
```
