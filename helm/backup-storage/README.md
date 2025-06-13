# The sso-keycloak implementation of the backup container

As part of the backup restore process we can build and host backup-container images that our helm charts can use to deploy the container. However, currently we are using the backup container's hosted images.

The backup container repo we use is [here](https://github.com/BCDevOps/backup-container).

## The verification and restore process

Currently running backup restoration and verification againts the patroni cluster raises several errors, meaning the `-I` flag needs to be added to the verification config and restoration process. To verify a backup run:

`./backup.sh -I -v all`

To restore from a backup:

`./backup.sh -I -r sso-requests-patroni:5432/ssorequests`

Furhter documentation can be found in the backup container's [repos](https://github.com/BCDevOps/backup-container)

## Building the image

As of May 2024 we are using the backup-container's images directly in our deployments.

## Deploying the charts

### **BEFORE RUNNING HELM UPGRADE:**

Make sure to add the rocket chat webhook to production facing values files. Make sure not to commit this value.

Make certain the image tag reflects the version of the backup container you intend to deploy.

### Installing and upgrading backups

These charts can be upgraded using make commands:

`make upgrade NAMESPACE=<<namespace>>`
