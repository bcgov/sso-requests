import React, { ReactNode, useState } from 'react';
import styled from 'styled-components';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import CenteredModal from '@app/components/CenteredModal';
import Link from '@app/components/Link';
import { ErrorMessage, InfoMessage } from '@app/components/MessageBox';
import ServiceAccountActionbuttons from '@app/components/ServiceAccountActionButtons';
import TableNew from '@app/components/TableNew';
import WarningModalContents from '@app/components/WarningModalContents';
import { Organization, OrganizationApiAccount } from '@app/interfaces/organization';
import { TopAlert, withTopAlert } from '@app/layout/TopAlert';
import {
  createOrganizationApiAccount,
  deleteOrganizationApiAccount,
  getOrganizationApiAccountCredentials,
  updateOrganizationApiAccountSecret,
} from '@app/services/organization';
import { docusaurusURL } from '@app/utils/constants';
import { copyTextToClipboard, downloadText, prettyJSON } from '@app/utils/text';

const RightFloatButtons = styled.td`
  float: right;
`;

const StyledP = styled.div`
  margin-bottom: 5px;
  display: flex;
  align-items: center;
`;

const Failed = styled.div`
  display: inline-flex;
  margin: 20px 0;
  padding: 5px;
  background: #ffcccb;
  border-radius: 5px;
`;

function ActionsHeader() {
  return <span style={{ float: 'right', paddingRight: '2.7em' }}>Actions</span>;
}

interface Props {
  organization: Organization;
  // The one account an organization may hold, or null before it is requested.
  account: OrganizationApiAccount | null;
  // What the account reaches, as the accounts tab describes it.
  permissionsSummary: ReactNode;
  canManage: boolean;
  reload: () => void;
  alert: TopAlert;
}

/**
 * An organization's CSS API account, presented the way a team's is: one
 * account at most, a row with the four credential actions, and a confirmation
 * before a request that says what the account will be able to reach.
 */
function OrganizationApiAccountPanel({
  organization,
  account,
  permissionsSummary,
  canManage,
  reload,
  alert,
}: Readonly<Props>) {
  const [openRequestModal, setOpenRequestModal] = useState(false);
  const [openUpdateSecretModal, setOpenUpdateSecretModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Creation is synchronous on the server, so anything short of applied is a
  // request that did not complete rather than one still in flight.
  const actionsDisabled = !canManage || !account || account.status !== 'applied';

  const fail = (content: string) => alert.show({ variant: 'danger', fadeOut: 10000, closable: true, content });

  const handleRequest = async () => {
    const [, err] = await createOrganizationApiAccount(organization.id);
    if (err) return fail('Could not create the API account.');
    setOpenRequestModal(false);
    reload();
  };

  const handleConfirmDelete = async () => {
    if (!account) return;
    const [, err] = await deleteOrganizationApiAccount(organization.id, account.id);
    if (err) return fail('Could not delete the CSS API account. Please try again.');
    setOpenDeleteModal(false);
    reload();
  };

  const handleConfirmUpdate = async () => {
    if (!account) return;
    const [, err] = await updateOrganizationApiAccountSecret(organization.id, account.id);
    if (err) return fail('Failed to update secret, please try again.');
    setOpenUpdateSecretModal(false);
  };

  const copyOrDownload = async (download: boolean) => {
    if (actionsDisabled || !account) return;
    setLoading(true);
    const [data, err] = await getOrganizationApiAccountCredentials(organization.id, account.id);
    setLoading(false);
    if (err) return fail(`Failed to ${download ? 'download' : 'copy'}, please try again.`);

    const installation = data ?? ({} as any);
    const text = {
      tokenUrl: `${installation['token-url']}`,
      clientId: `${installation.resource}`,
      clientSecret: `${installation.credentials?.secret}`,
    };

    if (download) {
      downloadText(prettyJSON(text), `${account.clientId}.json`);
    } else {
      copyTextToClipboard(prettyJSON(text));
      alert.show({ variant: 'success', content: 'Copied to clipboard', fadeOut: 3000 });
    }
  };

  return (
    <>
      {!account && (
        <button
          className="primary"
          style={{ marginBottom: 10 }}
          disabled={!canManage}
          onClick={() => setOpenRequestModal(true)}
        >
          + Request CSS API Account
        </button>
      )}

      {account && loading && <SpinnerGrid color="#000" height={45} width={45} wrapperClass="d-block" visible={true} />}

      {account && !loading && (
        <TableNew
          dataTestId="organization-api-accounts-table"
          readOnly
          enableGlobalSearch={false}
          enablePagination={false}
          columns={[
            { accessorKey: 'clientId', header: 'API Account ID' },
            {
              accessorKey: 'actions',
              header: () => <ActionsHeader />,
              cell: () => (
                <RightFloatButtons>
                  <ServiceAccountActionbuttons
                    copyOrDownloadAction={copyOrDownload}
                    showUpdateModal={() => {
                      if (!actionsDisabled) setOpenUpdateSecretModal(true);
                    }}
                    showDeleteModal={() => {
                      if (!actionsDisabled) setOpenDeleteModal(true);
                    }}
                    actionsDisabled={actionsDisabled}
                  />
                </RightFloatButtons>
              ),
            },
          ]}
          data={[account]}
        />
      )}

      {account && account.status !== 'applied' && (
        <Failed>
          <ErrorMessage>
            Your request for an API account could not be completed. Please{' '}
            <Link external href="mailto:bcgov.sso@gov.bc.ca">
              contact the SSO Team
            </Link>
          </ErrorMessage>
        </Failed>
      )}

      <p>The created account will hold the same permissions as your organization</p>

      {account && (
        <InfoMessage>
          For more information on how to use the CSS API Account with your integrations,{' '}
          <Link href={`${docusaurusURL}/integrating-your-application/css-app-api`} external>
            click to learn more on our documentation page
          </Link>
          .
        </InfoMessage>
      )}

      <CenteredModal
        id="request-organization-api-account-modal"
        openModal={openRequestModal}
        handleClose={() => setOpenRequestModal(false)}
        title="Request CSS API Account"
        icon={false}
        closable
        confirmText="Request Account"
        skipCloseOnConfirm
        onConfirm={handleRequest}
        content={
          <div>
            <p>
              A new CSS API account for {organization.name} will be able to act on the integrations your organization
              has access to, summarized below:
            </p>
            {permissionsSummary}
            <br />
            <p>
              <strong>Note:</strong> Account permissions will match the organizations, and update as the organizations
              do.
            </p>
          </div>
        }
      />

      <CenteredModal
        id="update-organization-api-account-secret-modal"
        title="Request a new secret for CSS API Account"
        openModal={openUpdateSecretModal}
        handleClose={() => setOpenUpdateSecretModal(false)}
        onConfirm={handleConfirmUpdate}
        skipCloseOnConfirm
        content={
          <>
            <StyledP>
              <strong>You are about to request a new secret for CSS API Account</strong>
            </StyledP>
            <br />
            <p>
              Once the new secret gets generated, your previous secret will no longer be valid for any applications
              using it.
            </p>
            <p>
              This means any application using CSS API through this account should be configured with the new secret.
            </p>
          </>
        }
        buttonStyle="primary"
        confirmText="Confirm"
        closable
      />

      <CenteredModal
        id="delete-organization-api-account-modal"
        title="Delete CSS API Account"
        icon={null}
        openModal={openDeleteModal}
        handleClose={() => setOpenDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        skipCloseOnConfirm
        content={
          <WarningModalContents
            title="Are you sure that you want to delete this CSS API Account?"
            content="Once you delete this CSS API Account, this action cannot be undone."
          />
        }
        buttonStyle="danger"
        confirmText="Delete"
        closable
      />
    </>
  );
}

export default withTopAlert(OrganizationApiAccountPanel);
