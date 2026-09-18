import React, { MouseEvent, useState } from 'react';
import styled from 'styled-components';
import { Organization } from 'interfaces/organization';
import { UserSession } from 'interfaces/props';
import CenteredModal from 'components/CenteredModal';
import PageLoader from 'components/PageLoader';
import WarningModalContents from 'components/WarningModalContents';
import ErrorText from 'components/ErrorText';
import ActionButton from 'components/ActionButton';
import { ActionButtonContainer } from 'components/ActionButtons';
import { createOrganization, deleteOrganization } from 'services/organization';
import { SystemUnavailableMessage, NoEntitiesMessage } from './Messages';
import { hasAppPermission, appPermissions } from '@app/utils/authorize';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { PRIMARY_RED } from '@app/styles/theme';
import Input from '@app/components/Input';
import TableNew from '@app/components/TableNew';

const Container = styled.div`
  padding-top: 0.5em;
`;

function OrganizationListActionsHeader() {
  return <span style={{ float: 'right', paddingRight: '1em' }}>Actions</span>;
}

interface Props {
  currentUser: UserSession;
  organizations: Organization[];
  loading: boolean;
  hasError: boolean;
  setOrganization: (organization: Organization) => void;
  reload: () => void;
}

function OrganizationList({ currentUser, organizations, loading, hasError, setOrganization, reload }: Readonly<Props>) {
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [organizationToDelete, setOrganizationToDelete] = useState<Organization | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canManageOrganizations = hasAppPermission(currentUser?.client_roles, appPermissions.MANAGE_ORGANIZATIONS);

  const handleCreate = async () => {
    const [, err] = await createOrganization({ name, description });
    if (err) {
      setError('Could not create the organization.');
      return;
    }
    setError(null);
    setName('');
    setDescription('');
    setOpenCreateModal(false);
    reload();
  };

  const showDeleteModal = (event: MouseEvent, organization: Organization) => {
    event.stopPropagation();
    if (!canManageOrganizations) return;
    setDeleteError(null);
    setOrganizationToDelete(organization);
  };

  const handleDelete = async () => {
    if (!organizationToDelete) return;
    const [, err] = await deleteOrganization(organizationToDelete.id);
    if (err) {
      const message = String(err);
      setDeleteError(
        message.includes('active api accounts')
          ? 'Delete the active CSS API accounts for this organization before deleting the organization.'
          : 'Could not delete the organization. Please try again.',
      );
      return;
    }

    setOrganizationToDelete(null);
    setDeleteError(null);
    reload();
  };

  const contents = () => {
    if (hasError) return <SystemUnavailableMessage />;
    if (organizations.length === 0) {
      return <NoEntitiesMessage message="You do not belong to any organizations yet." />;
    }

    return (
      <TableNew
        dataTestId="organization-list-table"
        columns={[
          {
            accessorKey: 'name',
            header: 'Organization',
          },
          {
            accessorKey: 'description',
            header: 'Description',
          },
          {
            accessorKey: 'actions',
            header: () => <OrganizationListActionsHeader />,
            cell: (props) => {
              const organization = props.row.original as Organization;
              return (
                <div>
                  <ActionButtonContainer>
                    <ActionButton
                      icon={faTrash}
                      role="button"
                      disabled={!canManageOrganizations}
                      aria-label={`delete-${organization.name}`}
                      data-testid={`delete-organization-${organization.id}`}
                      title={
                        canManageOrganizations ? 'Delete organization' : 'Only CSS admins can delete organizations'
                      }
                      size="lg"
                      activeColor={PRIMARY_RED}
                      onClick={(event) => showDeleteModal(event, organization)}
                    />
                  </ActionButtonContainer>
                </div>
              );
            },
          },
        ]}
        data={organizations}
        enableGlobalSearch={false}
        enablePagination={false}
        onRowSelect={setOrganization}
      />
    );
  };

  return (
    <Container>
      {canManageOrganizations && (
        <button className="callout" onClick={() => setOpenCreateModal(true)}>
          + Create a New Organization
        </button>
      )}
      {loading ? <PageLoader /> : contents()}
      <CenteredModal
        id="create-organization-modal"
        openModal={openCreateModal}
        handleClose={() => setOpenCreateModal(false)}
        content={
          <div>
            <Input
              id="organization-name"
              label={'Name'}
              value={name}
              maxLength={255}
              onChange={(event) => setName(event.target.value)}
            />
            <Input
              id="organization-description"
              value={description}
              maxLength={255}
              onChange={(event) => setDescription(event.target.value)}
              label="Description"
            />
            {error && <p className="error">{error}</p>}
          </div>
        }
        onConfirm={handleCreate}
        confirmText="Create"
        title="Create Organization"
        icon={false}
        buttonStyle="primary"
        closable
      />
      <CenteredModal
        id="delete-organization-modal"
        openModal={Boolean(organizationToDelete)}
        handleClose={() => {
          setOrganizationToDelete(null);
          setDeleteError(null);
        }}
        content={
          <div>
            <WarningModalContents
              title={`Are you sure that you want to delete ${organizationToDelete?.name ?? 'this organization'}?`}
              content="This permanently removes the organization, its memberships, and its team links. This action cannot be undone."
            />
            {deleteError && <ErrorText>{deleteError}</ErrorText>}
          </div>
        }
        onConfirm={handleDelete}
        confirmText="Delete Organization"
        title="Delete Organization"
        icon={null}
        buttonStyle="danger"
        closable
        skipCloseOnConfirm
      />
    </Container>
  );
}

export default OrganizationList;
