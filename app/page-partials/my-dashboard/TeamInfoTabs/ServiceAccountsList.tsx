import CenteredModal from '@app/components/CenteredModal';
import ServiceAccountActionbuttons from '@app/components/ServiceAccountActionButtons';
import ModalContents from '@app/components/WarningModalContents';
import { Integration } from '@app/interfaces/Request';
import { Team } from '@app/interfaces/team';
import {
  deleteServiceAccount,
  getServiceAccountCredentials,
  updateServiceAccountCredentials,
} from '@app/services/team';
import { copyTextToClipboard, downloadText, prettyJSON } from '@app/utils/text';
import Table from 'components/TableNew';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styled from 'styled-components';
import { TopAlert, withTopAlert } from '@app/layout/TopAlert';
import { useState } from 'react';
import { Grid as SpinnerGrid } from 'react-loader-spinner';

const RightFloatButtons = styled.td`
  float: right;
`;

const RedIcon = styled(FontAwesomeIcon)`
  color: #000000;
`;

const StyledP = styled.div`
  margin-bottom: 5px;
  display: flex;
  align-items: center;
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
  alert: TopAlert;
}

function ServiceAccountsList({
  team,
  selectedServiceAccount,
  setSelectedServiceAccount,
  teamServiceAccounts,
  getTeamServiceAccounts,
  alert,
}: Readonly<Props>) {
  const [openUpdateSecretModal, setOpenUpdateSecretModal] = useState(false);
  const [openDeleteApiAccountModal, setOpenDeleteApiAccountModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkDisabled = (serviceAccount: Integration | null) => {
    return serviceAccount && serviceAccount?.status !== 'applied' && !serviceAccount?.archived;
  };

  const handleDelete = () => {
    if (checkDisabled(selectedServiceAccount)) return;
    setOpenDeleteApiAccountModal(true);
  };

  const handleConfirmDelete = async () => {
    const [_result, error] = await deleteServiceAccount(team.id, selectedServiceAccount?.id);
    if (error) {
      alert.show({
        variant: 'danger',
        content: 'Failed to delete service account, please try again.',
      });
      return;
    }
    getTeamServiceAccounts(team.id);
  };

  const handleUpdate = () => {
    if (checkDisabled(selectedServiceAccount)) return;
    setOpenUpdateSecretModal(true);
  };

  const handleConfirmUpdate = async () => {
    const [_, error] = await updateServiceAccountCredentials(team.id, selectedServiceAccount?.id);
    if (error) {
      alert.show({
        variant: 'danger',
        content: 'Failed to update secret, please try again.',
      });
    }
  };

  const copyOrDownloadServiceAccount = async (download: boolean) => {
    if (checkDisabled(selectedServiceAccount)) return;
    setLoading(true);
    let [data, error] = await getServiceAccountCredentials(team.id, selectedServiceAccount?.id);
    setLoading(false);
    if (error) {
      alert.show({
        variant: 'danger',
        content: `Failed to ${download ? 'download' : 'copy'}, please try again.`,
      });
      return;
    }
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
      alert.show({
        variant: 'success',
        content: 'Copied to clipboard',
        fadeOut: 3000,
      });
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
      {loading ? (
        <SpinnerGrid color="#000" height={45} width={45} wrapperClass="d-block" visible={true} />
      ) : (
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
      )}

      <CenteredModal
        title="Request a new secret for CSS API Account"
        onConfirm={handleConfirmUpdate}
        openModal={openUpdateSecretModal}
        handleClose={() => setOpenUpdateSecretModal(false)}
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
        buttonStyle={'custom'}
        confirmText={'Confirm'}
        closable
      />
      <CenteredModal
        title="Delete CSS API Account"
        icon={null}
        onConfirm={handleConfirmDelete}
        openModal={openDeleteApiAccountModal}
        handleClose={() => setOpenDeleteApiAccountModal(false)}
        content={
          <ModalContents
            title="Are you sure that you want to delete this CSS API Account?"
            content={'Once you delete this CSS PI Account, this action cannot be undone.'}
          />
        }
        buttonStyle={'danger'}
        confirmText={'Delete'}
        closable
      />
    </>
  );
}

export default withTopAlert(ServiceAccountsList);
