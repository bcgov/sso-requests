# Migrations

This folder contains code to run database migrations.
It can be run to invoke migrations updating request information that is not intended to
be committed to the repository, in case the sso-terraform repository becomes out of sync with the database (e.g error recovery).

## Use

1. Add the migration you want to run as a typescript file to the `src/migrations` repository.
   e.g

```javascript
// migration-1.ts
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().bulkUpdate('requests', { status: 'pr' }, { id: 2 });
};
```

2. Run `make lambda` from this directory
3. Add required tf variables. You will need:

- **db_hostname**: the hostname for the database
- **db_username**:the username for the database
- **db_password**:the password for the database
- **db_name**: the name of the database
- **vpc_sg_ids**: array of the security group ids for the database cluster
- **subnet_ids**: array of the subnet ids for the vpc

4. Run `terraform apply` to run the migration

To cleanup afterwards, run `terraform destroy`
