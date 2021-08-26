-- Get IDPs
SELECT
  *
FROM
  identity_provider;

-- List all tables
SELECT
  *
FROM
  pg_catalog.pg_tables
WHERE
  schemaname != 'pg_catalog'
  AND schemaname != 'information_schema';

-- Number of clients with n IDPs
SELECT
  count(*)
FROM (
  SELECT
    count(client.id) AS idp_count,
    client.id
  FROM
    client
    JOIN identity_provider ON client.realm_id = identity_provider.realm_id
  GROUP BY
    client.id
  HAVING
    count(client.id) = 1) AS client_count;

-- List clients with n IDPs
SELECT
    count(client.id) AS idp_count,
    client.id
  FROM
    client
    JOIN identity_provider ON client.realm_id = identity_provider.realm_id
  GROUP BY
    client.id
  HAVING
    count(client.id) = 2

-- List redirect URIs
select name, value from redirect_uris join client on redirect_uris.client_id = client.id order by name;
