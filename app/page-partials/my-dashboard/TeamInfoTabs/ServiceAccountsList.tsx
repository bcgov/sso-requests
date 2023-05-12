import CenteredModal from '@app/components/CenteredModal';
import ServiceAccountActionbuttons from '@app/components/ServiceAccountActionButtons';
import ModalContents from '@app/components/WarningModalContents';
import { Integration } from '@app/interfaces/Request';
import { Team } from '@app/interfaces/team';
import {
  deleteServiceAccount,
  getServiceAccount,
  getServiceAccountCredentials,
  getServiceAccounts,
  updateServiceAccountCredentials,
} from '@app/services/team';
import { copyTextToClipboard, downloadText, prettyJSON } from '@app/utils/text';
import Table from 'components/TableNew';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import isEmpty from 'lodash.isempty';
import { useEffect, useState } from 'react';
import ReactPlaceholder from 'react-placeholder';
import styled from 'styled-components';

const RightFloatButtons = styled.td`
  float: right;
`;

const RedIcon = styled(FontAwesomeIcon)`
  color: #000000;
`;

const ModalContentContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 6fr;
`;

function ActionsHeader() {
  return <span style={{ float: 'right', paddingRight: '2.7em' }}>Actions</span>;
}

interface Props {
  team: Team;
  selectedServiceAccount: Integration | null;
  setSelectedServiceAccount: (serviceAccount: Integration | null) => void;
  teamServiceAccounts: Integration[];
  getTeamServiceAccounts: (teamId: number) => void;
}

export default function ServiceAccountsList({
  team,
  selectedServiceAccount,
  setSelectedServiceAccount,
  teamServiceAccounts,
  getTeamServiceAccounts,
}: Props) {
  const deleteServiceAccountModalId = 'delete-service-account-modal';
  const updateServiceAccountSecretModalId = 'update-service-account-secret-modal';

  const checkDisabled = (serviceAccount: Integration | null) => {
    return serviceAccount && serviceAccount?.status !== 'applied' && !serviceAccount?.archived;
  };

  const handleDelete = () => {
    if (checkDisabled(selectedServiceAccount)) return;
    window.location.hash = deleteServiceAccountModalId;
  };

  const handleConfirmDelete = async () => {
    await deleteServiceAccount(team.id, selectedServiceAccount?.id);
    getTeamServiceAccounts(team.id);
  };

  const handleUpdate = () => {
    if (checkDisabled(selectedServiceAccount)) return;
    window.location.hash = updateServiceAccountSecretModalId;
  };

  const handleConfirmUpdate = async () => {
    await updateServiceAccountCredentials(team.id, selectedServiceAccount?.id);
  };

  const copyOrDownloadServiceAccount = async (download: boolean) => {
    if (checkDisabled(selectedServiceAccount)) return;
    let [data] = await getServiceAccountCredentials(team.id, selectedServiceAccount?.id);
    data = data || {};

    const text = {
      tokenUrl: `${data['auth-server-url']}/realms/${data.realm}/protocol/openid-connect/token`,
      clientId: `${data.resource}`,
      clientSecret: `${data.credentials?.secret}`,
    };

    if (download) {
      downloadText(prettyJSON(text), `${selectedServiceAccount?.clientId}.json`);
    } else {
      copyTextToClipboard(prettyJSON(text));
    }
  };

  const activateRow = (request: any) => {
    const serviceAccountId = request['cells'][0].row.original.id;
    teamServiceAccounts.forEach((serviceAccount) => {
      if (serviceAccount.id == serviceAccountId) setSelectedServiceAccount(serviceAccount);
    });
  };

  return (
    <>
      <Table
        headers={[
          {
            accessor: 'id',
            Header: 'API Account ID',
          },
          {
            accessor: 'actions',
            Header: <ActionsHeader />,
            disableSortBy: true,
          },
        ]}
        data={teamServiceAccounts.map((serviceAccount: Integration) => {
          return {
            id: serviceAccount.id,
            actions: (
              <RightFloatButtons>
                <ServiceAccountActionbuttons
                  copyOrDownloadAction={copyOrDownloadServiceAccount}
                  showUpdateModal={handleUpdate}
                  showDeleteModal={handleDelete}
                  actionsDisabled={Boolean(checkDisabled(serviceAccount))}
                />
              </RightFloatButtons>
            ),
          };
        })}
        colfilters={[]}
        activateRow={activateRow}
        rowSelectorKey={'id'}
      />

      <CenteredModal
        title="Request a new secret for CSS API Account"
        icon={null}
        onConfirm={handleConfirmUpdate}
        id={updateServiceAccountSecretModalId}
        content={
          <>
            <ModalContentContainer>
              <RedIcon icon={faTriangleExclamation} size="3x" />
              <div>
                <strong>You are about to request a new secret for CSS API Account</strong>
                <hr style={{ width: '100%', height: '2px' }} />
                <p>
                  Once new secret gets generated, your previous secret will no longer be valid for any applications
                  using it.
                </p>
                <p>
                  This means any application using CSS API through this account should be configured with the new
                  secret.
                </p>
              </div>
            </ModalContentContainer>
          </>
        }
        buttonStyle={'danger'}
        confirmText={'Confirm'}
        closable
      />
      <CenteredModal
        title="Delete CSS API Account"
        icon={null}
        onConfirm={handleConfirmDelete}
        id={deleteServiceAccountModalId}
        content={
          <ModalContents
            title="Are you sure that you want to delete this CSS API Account?"
            content={'Once you delete this CSS PI Account, this action cannot be undone.'}
          />
        }
        buttonStyle={'danger'}
        confirmText={'Delete CSS API Account'}
        closable
      />
    </>
  );
}
