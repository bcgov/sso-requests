import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Tabs } from '@bcgov-sso/common-react-components';
import AsyncSelect from 'react-select/async';
import { components, SingleValue } from 'react-select';
import CenteredModal from 'components/CenteredModal';
import Dropdown from 'components/Dropdown';
import PresetPicker from 'components/PresetPicker';
import WarningModalContents from 'components/WarningModalContents';
import ActionButton from 'components/ActionButton';
import TableNew from 'components/TableNew';
import {
  Organization,
  OrganizationApiAccount,
  OrganizationMember,
  OrganizationTeamLink,
  TeamIntegration,
} from 'interfaces/organization';
import { UserSession } from 'interfaces/props';
import { Permission, PRESETS, describePermissions } from '@sso/authz';
import {
  addOrganizationMember,
  createOrganizationApiAccount,
  deleteOrganizationApiAccount,
  getOrganizationApiAccountCredentials,
  getOrganizationApiAccounts,
  getOrganizationMembers,
  getOrganizationTeams,
  inviteTeamToOrganization,
  removeOrganizationMember,
  removeTeamFromOrganization,
  searchTeamsForOrganization,
  getTeamIntegrationsForOrganization,
} from 'services/organization';
import { TopAlert, withTopAlert } from '@app/layout/TopAlert';
import { faCopy, faTrash } from '@fortawesome/free-solid-svg-icons';
import { PRIMARY_BUTTON_HOVER_COLOR, PRIMARY_RED } from '@app/styles/theme';
import {
  appPermissions,
  hasAppPermission,
  hasOrganizationPermission,
  organizationPermissions,
} from '@app/utils/authorize';
import { copyTextToClipboard, prettyJSON } from '@app/utils/text';
import { throttledIdirSearch } from '@app/utils/users';

const Panel = styled.div`
  margin-top: 10px;

  table {
    width: 100%;
  }

  th,
  td {
    padding: 0.4em 0.5em;
    text-align: left;
    vertical-align: top;
  }

  td ul {
    margin: 0;
    padding-left: 1.2em;
  }
`;

const Pill = styled.span<{ pending: boolean }>`
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.85em;
  background: ${(props) => (props.pending ? '#fff4d6' : '#dff0d8')};
`;

const describeLink = (link: OrganizationTeamLink, integrations: TeamIntegration[]): string[] => {
  const nameFor = (id: number) => integrations.find((integration) => integration.id === id)?.projectName;
  const parts = [`All integrations: ${describePermissions(link.permissions)}`];

  if (link.overrides.length > 0 && link.overrides.length <= 3) {
    parts.push(
      ...link.overrides.map(
        (override) =>
          `${nameFor(override.requestId) ?? `#${override.requestId}`}: ${describePermissions(override.permissions)}`,
      ),
    );
  } else if (link.overrides.length > 0) {
    parts.push(`${link.overrides.length} integrations capped below it`);
  }

  return parts;
};

interface Props {
  organization: Organization;
  currentUser: UserSession;
  alert: TopAlert;
}

function OrganizationInfoTabs({ organization, currentUser, alert }: Readonly<Props>) {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [links, setLinks] = useState<OrganizationTeamLink[]>([]);
  const [accounts, setAccounts] = useState<OrganizationApiAccount[]>([]);
  const [teamResults, setTeamResults] = useState<any[]>([]);
  const [teamQuery, setTeamQuery] = useState('');
  const [integrationsByTeam, setIntegrationsByTeam] = useState<Record<number, TeamIntegration[]>>({});

  const [openMemberModal, setOpenMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');

  const [openInviteModal, setOpenInviteModal] = useState(false);
  const [inviteTeamId, setInviteTeamId] = useState<number | undefined>(undefined);
  const [proposed, setProposed] = useState<Permission[]>([...PRESETS.viewer]);

  const [accountToDelete, setAccountToDelete] = useState<OrganizationApiAccount | null>(null);

  const activeLinks = links.filter((link) => !link.pending);
  const activeAccounts = accounts.filter((account) => !account.archived);
  // sso-admins can manage any organization regardless of their membership role in it.
  const isSsoAdmin = hasAppPermission(currentUser?.client_roles, appPermissions.MANAGE_ORGANIZATIONS);
  const canManage = (permission: string) => isSsoAdmin || hasOrganizationPermission(organization.role, permission);
  const canAddMember = canManage(organizationPermissions.ADD_ORG_MEMBER);
  const canRemoveMember = canManage(organizationPermissions.REMOVE_ORG_MEMBER);
  const canInviteTeam = canManage(organizationPermissions.INVITE_TEAM);
  const canRemoveTeam = canManage(organizationPermissions.REMOVE_TEAM);
  const canManageApiAccounts = canManage(organizationPermissions.MANAGE_ORG_API_ACCOUNTS);

  const reload = async () => {
    const [memberResult] = await getOrganizationMembers(organization.id);
    setMembers(memberResult || []);
    const [linkResult] = await getOrganizationTeams(organization.id);
    setLinks(linkResult || []);
    const [accountResult] = await getOrganizationApiAccounts(organization.id);
    setAccounts(accountResult || []);
  };

  useEffect(() => {
    reload();
  }, [organization.id]);

  useEffect(() => {
    if (!openInviteModal) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const [results] = await searchTeamsForOrganization(organization.id, teamQuery);
      if (!cancelled) setTeamResults(results || []);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [openInviteModal, teamQuery, organization.id]);

  const loadIntegrations = async (teamId: number) => {
    if (integrationsByTeam[teamId]) return;
    const [result] = await getTeamIntegrationsForOrganization(organization.id, teamId);
    setIntegrationsByTeam((current) => ({ ...current, [teamId]: result || [] }));
  };

  useEffect(() => {
    activeLinks.forEach((link) => loadIntegrations(link.teamId));
  }, [links]);

  const integrationsFor = (teamId?: number) => (teamId ? integrationsByTeam[teamId] ?? [] : []);
  const teamOptions = teamResults.map((team) => ({
    value: team.id,
    label: `${team.name} (#${team.id})${team.available ? '' : ' - already in another organization'}`,
    available: team.available,
  }));

  const fail = (content: string) => alert.show({ variant: 'danger', fadeOut: 10000, closable: true, content });

  const handleAddMember = async () => {
    const [, err] = await addOrganizationMember(organization.id, { idirEmail: memberEmail, role: memberRole });
    if (err) return fail('Could not add that member.');
    setMemberEmail('');
    setOpenMemberModal(false);
    reload();
  };

  const handleInvite = async () => {
    if (!inviteTeamId) return;
    const [, err] = await inviteTeamToOrganization(organization.id, { teamId: inviteTeamId, permissions: proposed });
    if (err) return fail('Could not invite that team.');
    setOpenInviteModal(false);
    setProposed([...PRESETS.viewer]);
    setInviteTeamId(undefined);
    setTeamQuery('');
    reload();
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;
    const [, err] = await deleteOrganizationApiAccount(organization.id, accountToDelete.id);
    if (err) return fail('Could not delete the CSS API account. Please try again.');
    setAccountToDelete(null);
    reload();
  };

  const membersTab = (
    <Panel>
      <button className="primary" onClick={() => setOpenMemberModal(true)} disabled={!canAddMember}>
        + Add Member
      </button>
      <TableNew
        dataTestId="organization-members-table"
        readOnly
        enableGlobalSearch={false}
        enablePagination={false}
        columns={[
          { accessorKey: 'email', header: 'Email' },
          { accessorKey: 'role', header: 'Role' },
          {
            accessorKey: 'actions',
            header: 'Actions',
            cell: (props) => {
              const member = props.row.original as OrganizationMember;
              return (
                <ActionButton
                  icon={faTrash}
                  role="button"
                  disabled={!canRemoveMember}
                  aria-label={`remove-organization-member-${member.userId}`}
                  data-testid={`remove-organization-member-${member.userId}`}
                  title="Remove organization member"
                  size="lg"
                  activeColor={PRIMARY_RED}
                  onClick={async () => {
                    await removeOrganizationMember(organization.id, member.userId);
                    reload();
                  }}
                />
              );
            },
          },
        ]}
        data={members.map((member) => ({
          ...member,
          email: member.user?.idirEmail,
        }))}
      />
    </Panel>
  );

  const teamsTab = (
    <Panel>
      <button className="primary" onClick={() => setOpenInviteModal(true)} disabled={!canInviteTeam}>
        + Invite a Team
      </button>
      <br />
      <p>You can invite teams to your organization to have access to their integrations.</p>
      <TableNew
        dataTestId="organization-teams-table"
        readOnly
        enableGlobalSearch={false}
        enablePagination={false}
        columns={[
          { accessorKey: 'teamName', header: 'Team' },
          {
            accessorKey: 'status',
            header: 'Status',
            cell: (props) => {
              const link = props.row.original as OrganizationTeamLink;
              return <Pill pending={link.pending}>{link.pending ? 'invitation pending' : 'joined'}</Pill>;
            },
          },
          {
            accessorKey: 'permissions',
            header: 'Consented permissions',
            cell: (props) => {
              const link = props.row.original as OrganizationTeamLink;
              return (
                <>
                  {link.pending && <em>proposed: </em>}
                  <ul>
                    {describeLink(link, integrationsFor(link.teamId)).map((part) => (
                      <li key={part}>{part}</li>
                    ))}
                  </ul>
                </>
              );
            },
          },
          {
            accessorKey: 'actions',
            header: '',
            cell: (props) => {
              const link = props.row.original as OrganizationTeamLink;
              return (
                <ActionButton
                  icon={faTrash}
                  role="button"
                  disabled={!canRemoveTeam}
                  aria-label={`remove-organization-team-${link.teamId}`}
                  data-testid={`remove-organization-team-${link.teamId}`}
                  title="Remove team from organization"
                  size="lg"
                  activeColor={PRIMARY_RED}
                  onClick={async () => {
                    await removeTeamFromOrganization(organization.id, link.teamId);
                    reload();
                  }}
                />
              );
            },
          },
        ]}
        data={links.map((link) => ({
          ...link,
          teamName: link.team?.name,
        }))}
      />
    </Panel>
  );

  const apiAccountsTab = (
    <Panel>
      <button
        className="primary"
        disabled={!canManageApiAccounts}
        onClick={async () => {
          const [, err] = await createOrganizationApiAccount(organization.id);
          if (err) return fail('Could not create the API account.');
          reload();
        }}
      >
        + Request CSS API Account
      </button>
      <p>
        An account holds whatever the organization holds, read at the moment of each request. A team joining, leaving or
        narrowing its consent reaches every account at once — there is nothing to keep in step.
      </p>
      <TableNew
        dataTestId="organization-api-accounts-table"
        readOnly
        enableGlobalSearch={false}
        enablePagination={false}
        columns={[
          { accessorKey: 'clientId', header: 'Client ID' },
          { accessorKey: 'status', header: 'Status' },
          {
            accessorKey: 'permissions',
            header: 'Permissions',
            cell: () => (
              <>
                {activeLinks.length === 0 && <em>no teams have joined yet</em>}
                {activeLinks.map((link) => (
                  <div key={link.id}>
                    <strong>{link.team?.name}:</strong>
                    <ul>
                      {describeLink(link, integrationsFor(link.teamId)).map((part) => (
                        <li key={part}>{part}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </>
            ),
          },
          {
            accessorKey: 'actions',
            header: 'Actions',
            cell: (props) => {
              const account = props.row.original as OrganizationApiAccount;
              return (
                <>
                  <ActionButton
                    icon={faCopy}
                    role="button"
                    aria-label={`copy-api-account-${account.id}-credentials`}
                    data-testid={`copy-organization-api-account-${account.id}-credentials`}
                    title="Copy CSS API account Credentials"
                    size="lg"
                    activeColor={PRIMARY_BUTTON_HOVER_COLOR}
                    disabled={!canManageApiAccounts || account.status !== 'applied'}
                    onClick={async () => {
                      const [result, err] = await getOrganizationApiAccountCredentials(organization.id, account.id);
                      if (err) return fail('Could not fetch credentials.');
                      copyTextToClipboard(prettyJSON(result));
                      alert.show({ variant: 'success', fadeOut: 3000, content: 'Credentials copied to clipboard' });
                    }}
                  />
                  {canManageApiAccounts && (
                    <ActionButton
                      icon={faTrash}
                      role="button"
                      aria-label={`delete-api-account-${account.id}`}
                      data-testid={`delete-organization-api-account-${account.id}`}
                      title="Delete CSS API account"
                      size="lg"
                      activeColor={PRIMARY_RED}
                      disabled={account.status !== 'applied'}
                      onClick={() => {
                        if (account.status === 'applied') setAccountToDelete(account);
                      }}
                      style={{ marginLeft: '12px' }}
                    />
                  )}
                </>
              );
            },
          },
        ]}
        data={activeAccounts}
      />
    </Panel>
  );

  return (
    <>
      <h2>{organization.name}</h2>
      <Tabs
        defaultActiveKey="members"
        tabBarGutter={30}
        items={[
          { key: 'members', label: 'Members', children: membersTab },
          { key: 'teams', label: 'Teams', children: teamsTab },
          { key: 'api-accounts', label: 'CSS API Accounts', children: apiAccountsTab },
        ]}
      />

      <CenteredModal
        id="add-org-member-modal"
        openModal={openMemberModal}
        handleClose={() => setOpenMemberModal(false)}
        title="Add Organization Member"
        icon={false}
        closable
        confirmText="Add"
        onConfirm={handleAddMember}
        content={
          <div>
            <label htmlFor="org-member-email">IDIR Email</label>
            <AsyncSelect
              inputId="org-member-email"
              loadOptions={throttledIdirSearch}
              onChange={(option: SingleValue<{ value: string; label: string }>) =>
                setMemberEmail(option?.label.toLowerCase() || '')
              }
              value={memberEmail ? { value: memberEmail, label: memberEmail } : null}
              noOptionsMessage={() => 'Start typing email...'}
              placeholder="Enter email address"
              menuPlacement="top"
              maxMenuHeight={120}
              components={{
                Input: (props) => <components.Input {...props} data-testid="org-member-email-input" />,
              }}
            />
            <label htmlFor="org-member-role">Role</label>
            <Dropdown
              inputId="org-member-role"
              data-testid="org-member-role"
              options={[
                { value: 'member', label: 'Member' },
                { value: 'admin', label: 'Admin' },
              ]}
              value={{ value: memberRole, label: memberRole === 'admin' ? 'Admin' : 'Member' }}
              isSearchable={false}
              onChange={(option: any) => setMemberRole(option?.value ?? 'member')}
            />
            <p>
              Both roles reach the same integrations — whatever the teams consented to. An admin also manages the
              organization itself: its members, its teams and its API accounts.
            </p>
          </div>
        }
      />

      <CenteredModal
        id="invite-team-modal"
        openModal={openInviteModal}
        handleClose={() => setOpenInviteModal(false)}
        title="Invite a Team"
        icon={false}
        closable
        confirmText="Send Invitation"
        onConfirm={handleInvite}
        content={
          <div>
            <p>
              Ask a team for an access level over its integrations. Nothing is in force until a team admin accepts, and
              they may accept on narrower terms. From then on the level is theirs to change.
            </p>
            <label htmlFor="invite-team-select">Team</label>
            <Dropdown
              inputId="invite-team-select"
              data-testid="invite-team-select"
              placeholder="Search by team name or id"
              options={teamOptions}
              value={teamOptions.find((option) => option.value === inviteTeamId) ?? null}
              filterOption={() => true}
              isOptionDisabled={(option: any) => !option.available}
              noOptionsMessage={() => (teamQuery ? 'No matching teams' : 'Start typing to find a team')}
              onInputChange={(value, action) => {
                if (action.action === 'input-change') setTeamQuery(value);
              }}
              onChange={async (option: any) => {
                const teamId = option?.value as number | undefined;
                setInviteTeamId(teamId);
                if (teamId) await loadIntegrations(teamId);
              }}
              isClearable
            />
            {inviteTeamId && (
              <div style={{ margin: '0.8em 0' }}>
                <label htmlFor="invite-permissions">Access level requested</label>
                <PresetPicker
                  id="invite-permissions"
                  ariaLabel="Access level requested"
                  value={proposed}
                  onChange={(permissions) => setProposed(permissions ?? [])}
                />
                <p>
                  Default permission level organization members and API Accounts will have over the teams integrations.
                  Teams may choose to restrict access further on accepting the invitation. Newly added integrations to
                  the team will default to this level.
                </p>
                <p>
                  <strong>Role Description:</strong>
                </p>
                <ul>
                  <li>
                    <strong>Viewer:</strong> Allows viewing integration data, roles, and role assignments.
                  </li>
                  <li>
                    <strong>Editor:</strong> Allows editing integration data.
                  </li>
                  <li>
                    <strong>Role Manager:</strong> Allows viewing and editing integration roles and role assignments.
                  </li>
                  <li>
                    <strong>Admin:</strong> Full write access to integrations.
                  </li>
                </ul>
              </div>
            )}
          </div>
        }
      />

      <CenteredModal
        id="delete-organization-api-account-modal"
        openModal={Boolean(accountToDelete)}
        handleClose={() => setAccountToDelete(null)}
        title="Delete CSS API Account"
        icon={null}
        closable
        confirmText="Delete"
        buttonStyle="danger"
        skipCloseOnConfirm
        onConfirm={handleDeleteAccount}
        content={
          <WarningModalContents
            title="Are you sure that you want to delete this CSS API Account?"
            content="Once you delete this CSS API Account, this action cannot be undone."
          />
        }
      />
    </>
  );
}

export default withTopAlert(OrganizationInfoTabs);
