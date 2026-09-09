import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import CenteredModal from 'components/CenteredModal';
import LevelPicker from 'components/LevelPicker';
import { OrganizationTeamLink, Scope, TeamIntegration } from 'interfaces/organization';
import { LEVEL_LABELS } from '@app/shared/enums';
import { getTeamIntegrations } from 'services/request';
import {
  getTeamOrganizations,
  leaveOrganization,
  respondToOrganizationInvitation,
  updateTeamCeiling,
} from 'services/organization';
import { TopAlert, withTopAlert } from '@app/layout/TopAlert';

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
`;

// A team-wide row is the interesting one; per-integration rows are summarized
// by count so the table stays readable when a team has many integrations.
const describeScopes = (scopes: Scope[], integrations: TeamIntegration[]) => {
  if (scopes.length === 0) return 'none';
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
  return parts.join('; ');
};

interface Props {
  teamId: number;
  alert: TopAlert;
}

function TeamOrganizations({ teamId, alert }: Readonly<Props>) {
  const [links, setLinks] = useState<OrganizationTeamLink[]>([]);
  const [activeLink, setActiveLink] = useState<OrganizationTeamLink | null>(null);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [integrations, setIntegrations] = useState<TeamIntegration[]>([]);

  const reload = async () => {
    const [result] = await getTeamOrganizations(teamId);
    setLinks(result || []);
  };

  useEffect(() => {
    reload();
    getTeamIntegrations(teamId).then(([result]) => setIntegrations((result as unknown as TeamIntegration[]) || []));
  }, [teamId]);

  const fail = (content: string) => alert.show({ variant: 'danger', fadeOut: 10000, closable: true, content });

  const review = (link: OrganizationTeamLink) => {
    setActiveLink(link);
    setScopes(link.ceilings);
    setOpenModal(true);
  };

  const confirm = async () => {
    if (!activeLink) return;

    const [, err] = activeLink.pending
      ? await respondToOrganizationInvitation(teamId, activeLink.organizationId, { accept: true, ceilings: scopes })
      : await updateTeamCeiling(teamId, activeLink.organizationId, scopes);

    if (err) return fail('Could not save. You cannot grant more than the organization asked for.');
    setOpenModal(false);
    reload();
  };

  return (
    <Panel>
      <p>An organization can be used to manage integrations across several teams, with granular permission levels.</p>
      <table data-testid="team-organizations-table">
        <thead>
          <tr>
            <th>Organization</th>
            <th>Status</th>
            <th>Permissions you have granted</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {links.length === 0 && (
            <tr>
              <td colSpan={4}>
                <em>This team does not belong to an organization.</em>
              </td>
            </tr>
          )}
          {links.map((link) => (
            <tr key={link.id}>
              <td>{link.organization?.name}</td>
              <td>{link.pending ? 'invitation pending' : 'joined'}</td>
              <td>
                {link.pending && <em>requested: </em>}
                {describeScopes(link.ceilings, integrations)}
              </td>
              <td>
                <button className="primary" onClick={() => review(link)}>
                  {link.pending ? 'Review' : 'Change'}
                </button>
                <button
                  className="secondary"
                  onClick={async () => {
                    const [, err] = link.pending
                      ? await respondToOrganizationInvitation(teamId, link.organizationId, { accept: false })
                      : await leaveOrganization(teamId, link.organizationId);
                    if (err) return fail('Could not complete that action.');
                    reload();
                  }}
                >
                  {link.pending ? 'Decline' : 'Leave'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <CenteredModal
        id="team-ceiling-modal"
        openModal={openModal}
        handleClose={() => setOpenModal(false)}
        title={activeLink?.pending ? 'Review Invitation' : 'Change Permissions'}
        icon={false}
        closable
        confirmText={activeLink?.pending ? 'Accept' : 'Save'}
        onConfirm={confirm}
        content={
          <div>
            <p>
              Lower anything you are not willing to grant. You cannot go above what was requested. Changes apply
              immediately.
            </p>
            <LevelPicker
              idPrefix="team-ceiling"
              value={scopes}
              onChange={setScopes}
              integrations={integrations}
              boundedBy={activeLink?.pending ? activeLink.ceilings : undefined}
              showCeilingColumn={!!activeLink?.pending}
              ceilingLabel="Requested"
            />
          </div>
        }
      />
    </Panel>
  );
}

export default withTopAlert(TeamOrganizations);
