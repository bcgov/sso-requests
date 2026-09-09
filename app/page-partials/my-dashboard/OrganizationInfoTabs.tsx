import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Tabs } from '@bcgov-sso/common-react-components';
import AsyncSelect from 'react-select/async';
import { components, SingleValue } from 'react-select';
import CenteredModal from 'components/CenteredModal';
import Dropdown from 'components/Dropdown';
import LevelPicker from 'components/LevelPicker';
import WarningModalContents from 'components/WarningModalContents';
import ActionButton from 'components/ActionButton';
import TableNew from 'components/TableNew';
import {
  Organization,
  OrganizationApiAccount,
  OrganizationMember,
  OrganizationTeamLink,
  Grant,
  Scope,
  TeamIntegration,
  TeamSearchResult,
} from 'interfaces/organization';
import { UserSession } from 'interfaces/props';
import { LEVEL_LABELS } from '@app/shared/enums';
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
  updateOrganizationApiAccountGrants,
} from 'services/organization';
import { TopAlert, withTopAlert } from '@app/layout/TopAlert';
import { faCopy, faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import { PRIMARY_BUTTON_HOVER_COLOR, PRIMARY_RED } from '@app/styles/theme';
import {
  appPermissions,
  hasAppPermission,
  hasOrganizationPermission,
  organizationPermissions,
} from '@app/utils/authorize';
import { copyTextToClipboard, prettyJSON } from '@app/utils/text';
import { throttledIdirSearch } from '@app/utils/users';
import Input from '@app/components/Input';

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

// A team-wide row is the interesting one; per-integration rows are summarized
// by count so the table stays readable when a team has many integrations.
const describeScopes = (scopes: Scope[], integrations: TeamIntegration[]): string[] => {
  if (scopes.length === 0) return ['none'];
  const teamWide = scopes.find((scope) => (scope.integrationId ?? null) === null);
  const overrides = scopes.filter((scope) => (scope.integrationId ?? null) !== null);
  const nameFor = (id: number) => integrations.find((integration) => integration.id === id)?.projectName;

  const parts = [`All integrations: ${LEVEL_LABELS[teamWide?.level ?? 'none']}`];
  if (overrides.length > 0 && overrides.length <= 3) {
    parts.push(
      ...overrides.map(
        (scope) => `${nameFor(scope.integrationId!) ?? `#${scope.integrationId}`}: ${LEVEL_LABELS[scope.level]}`,
      ),
    );
  } else if (overrides.length > 0) {
    parts.push(`${overrides.length} integration-specific overrides`);
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
  const [teamResults, setTeamResults] = useState<TeamSearchResult[]>([]);
  const [teamQuery, setTeamQuery] = useState('');
  // Keyed by team id so both the invite modal and the grant modal can read the
  // list without refetching, and so the tables can name an integration.
  const [integrationsByTeam, setIntegrationsByTeam] = useState<Record<number, TeamIntegration[]>>({});

  const [openMemberModal, setOpenMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');

  const [openInviteModal, setOpenInviteModal] = useState(false);
  const [inviteTeamId, setInviteTeamId] = useState<number | undefined>(undefined);
  const [proposedCeiling, setProposedCeiling] = useState<Scope[]>([]);

  const [openGrantModal, setOpenGrantModal] = useState(false);
  const [grantAccount, setGrantAccount] = useState<OrganizationApiAccount | null>(null);
  const [grantTeamId, setGrantTeamId] = useState<number | undefined>(undefined);
  const [grantScopes, setGrantScopes] = useState<Scope[]>([]);

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

  // The search is org-gated rather than membership-gated, because an admin
  // must be able to name a team they do not themselves belong to.
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

  // Naming an integration in a table requires its list, and the org admin has
  // no other reason to have fetched it.
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
    const [, err] = await inviteTeamToOrganization(organization.id, {
      teamId: inviteTeamId,
      ceilings: proposedCeiling,
    });
    if (err) return fail('Could not invite that team.');
    setOpenInviteModal(false);
    setProposedCeiling([]);
    setInviteTeamId(undefined);
    setTeamQuery('');
    reload();
  };

  const handleSaveGrants = async () => {
    if (!grantAccount || !grantTeamId) return;

    // Grants for other teams are left untouched; this modal edits one team's
    // slice of the account's authority at a time.
    const others = grantAccount.grants.filter((grant) => grant.teamId !== grantTeamId);
    const next: Grant[] = [
      ...others,
      ...grantScopes.map((scope) => ({ ...scope, teamId: grantTeamId, integrationId: scope.integrationId ?? null })),
    ];

    const [, err] = await updateOrganizationApiAccountGrants(organization.id, grantAccount.id, next);
    if (err) return fail('Could not save those permissions. The team may not have consented to them.');
    setOpenGrantModal(false);
    reload();
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;
    const [, err] = await deleteOrganizationApiAccount(organization.id, accountToDelete.id);
    if (err) return fail('Could not delete the CSS API account. Please try again.');
    setAccountToDelete(null);
    reload();
  };

  const openGrantsFor = async (account: OrganizationApiAccount, teamId: number) => {
    await loadIntegrations(teamId);
    setGrantAccount(account);
    setGrantTeamId(teamId);
    setGrantScopes(account.grants.filter((grant) => grant.teamId === teamId));
    setOpenGrantModal(true);
  };

  const ceilingForTeam = (teamId?: number) => activeLinks.find((link) => link.teamId === teamId)?.ceilings ?? [];

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
              const scopes = describeScopes(link.ceilings, integrationsFor(link.teamId));
              return (
                <>
                  {link.pending && <em>proposed: </em>}
                  <ul>
                    {scopes.map((scope) => (
                      <li key={scope}>{scope}</li>
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
          const [, err] = await createOrganizationApiAccount(organization.id, []);
          if (err) return fail('Could not create the API account.');
          reload();
        }}
      >
        + Request CSS API Account
      </button>
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
            cell: (props) => {
              const account = props.row.original as OrganizationApiAccount;
              return (
                <>
                  {activeLinks.length === 0 && <em>no teams have joined yet</em>}
                  {activeLinks.map((link) => {
                    const teamGrants = account.grants.filter((grant) => grant.teamId === link.teamId);
                    return (
                      <div key={link.id}>
                        <strong>{link.team?.name}:</strong>
                        <ul>
                          {describeScopes(teamGrants, integrationsFor(link.teamId)).map((part) => (
                            <li key={part}>{part}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </>
              );
            },
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
                  {activeLinks.map((link) => (
                    <ActionButton
                      key={link.id}
                      icon={faEdit}
                      role="button"
                      aria-label={`edit-api-account-${account.id}`}
                      title="Edit CSS API account permissions"
                      size="lg"
                      activeColor={PRIMARY_BUTTON_HOVER_COLOR}
                      disabled={!canManageApiAccounts || account.status !== 'applied'}
                      onClick={async () => openGrantsFor(account, link.teamId)}
                      style={{ marginLeft: '12px' }}
                    />
                  ))}
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
              Invite a team to the organization. Teams in your organization can grant access to their integrations. Once
              invited, the team will receive a notification and can consent to your requested permissions.
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
                setProposedCeiling([]);
                if (teamId) await loadIntegrations(teamId);
              }}
              isClearable
            />
            {inviteTeamId && (
              <div style={{ margin: '0.8em 0' }}>
                <LevelPicker
                  idPrefix="ceiling"
                  value={proposedCeiling}
                  onChange={setProposedCeiling}
                  integrations={integrationsFor(inviteTeamId)}
                  bulkAfterTeamWide
                />
              </div>
            )}
          </div>
        }
      />

      <CenteredModal
        id="edit-grants-modal"
        openModal={openGrantModal}
        handleClose={() => setOpenGrantModal(false)}
        title="Edit API Account Permissions"
        icon={false}
        closable
        confirmText="Save"
        onConfirm={handleSaveGrants}
        content={
          <div>
            <p>An access level cannot be set above what the team has consented to.</p>
            <LevelPicker
              idPrefix="grant"
              value={grantScopes}
              onChange={setGrantScopes}
              integrations={integrationsFor(grantTeamId)}
              boundedBy={ceilingForTeam(grantTeamId)}
              showCeilingColumn
            />
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
