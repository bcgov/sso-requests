import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import CenteredModal from 'components/CenteredModal';
import PresetPicker from 'components/PresetPicker';
import { ActionButtonContainer, VerticalLine } from 'components/ActionButtons';
import { IntegrationOverride, OrganizationTeamLink, TeamIntegration } from 'interfaces/organization';
import { Permission, describePermissions } from '@sso/authz';
import { getTeamIntegrations } from 'services/request';
import {
  getTeamOrganizations,
  leaveOrganization,
  respondToOrganizationInvitation,
  updateIntegrationOverrides,
  updateTeamConsent,
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

  td ul {
    margin: 0;
    padding-left: 1.2em;
  }
`;

// The dashboard's own action spacing: an even gap and a divider between the
// buttons, rather than two buttons touching.
const Actions = styled(ActionButtonContainer)`
  justify-content: start;
  padding-right: 0;

  & > * {
    margin-left: 0;
    margin-right: 15px;
  }
`;

const Grid = styled.table`
  width: 100%;
  margin-bottom: 1em;

  td.level {
    min-width: 17em;
  }
`;

// One line per thing granted: the team-wide level first, then the integrations
// held below it. A list rather than a sentence, because a link with several
// limits reads as a list wherever it is shown.
const describeLink = (link: OrganizationTeamLink, integrations: TeamIntegration[]): string[] => {
  const nameFor = (id: number) => integrations.find((integration) => integration.id === id)?.projectName;
  const parts = [`All integrations: ${describePermissions(link.permissions)}`];

  if (link.overrides.length > 0 && link.overrides.length <= 3) {
    parts.push(
      ...link.overrides.map((override) => {
        const label = nameFor(override.requestId) ?? `#${override.requestId}`;
        return `${label}: ${describePermissions(override.permissions)}`;
      }),
    );
  } else if (link.overrides.length > 0) {
    parts.push(`${link.overrides.length} integrations capped below it`);
  }

  return parts;
};

interface Props {
  teamId: number;
  alert: TopAlert;
}

function TeamOrganizations({ teamId, alert }: Readonly<Props>) {
  const [links, setLinks] = useState<OrganizationTeamLink[]>([]);
  const [activeLink, setActiveLink] = useState<OrganizationTeamLink | null>(null);
  const [consent, setConsent] = useState<Permission[]>([]);
  const [overrides, setOverrides] = useState<IntegrationOverride[]>([]);
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
    setConsent(link.permissions);
    setOverrides(link.overrides);
    setOpenModal(true);
  };

  const overrideFor = (requestId: number) => overrides.find((override) => override.requestId === requestId);

  const setOverride = (requestId: number, permissions: Permission[] | null) => {
    const others = overrides.filter((override) => override.requestId !== requestId);
    setOverrides(permissions === null ? others : others.concat([{ requestId, permissions }]));
  };

  const confirm = async () => {
    if (!activeLink) return;

    const [, err] = activeLink.pending
      ? await respondToOrganizationInvitation(teamId, activeLink.organizationId, { accept: true, permissions: consent })
      : await updateTeamConsent(teamId, activeLink.organizationId, consent);

    if (err) return fail('Could not save. You cannot grant more than the organization asked for.');

    const [, overrideErr] = await updateIntegrationOverrides(teamId, activeLink.organizationId, overrides);
    if (overrideErr) return fail('The access level was saved, but the per-integration limits were not.');

    setOpenModal(false);
    reload();
  };

  return (
    <Panel>
      <p>
        An organization can manage integrations across several teams. It holds only what this team agrees to here, read
        live: narrowing it takes effect on the organization’s next request, and leaving withdraws it entirely.
      </p>
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
                <ul>
                  {describeLink(link, integrations).map((part) => (
                    <li key={part}>{part}</li>
                  ))}
                </ul>
              </td>
              <td>
                <Actions>
                  <button className="primary" onClick={() => review(link)}>
                    {link.pending ? 'Review' : 'Change'}
                  </button>
                  <VerticalLine />
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
                </Actions>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <CenteredModal
        id="team-consent-modal"
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
              {activeLink?.pending
                ? 'Lower anything you are not willing to grant. You cannot go above what was requested.'
                : 'This is yours to change. The organization cannot raise it — it can only ask again.'}{' '}
              Changes apply immediately.
            </p>
            <label htmlFor="team-consent-level">Access level for all integrations</label>
            <PresetPicker
              id="team-consent-level"
              ariaLabel="Access level for all integrations"
              value={consent}
              onChange={(permissions) => setConsent(permissions ?? [])}
              boundedBy={activeLink?.pending ? activeLink.permissions : undefined}
            />
            <p>Includes any integration this team creates later.</p>

            {integrations.length > 0 && (
              <>
                <h4>Limit individual integrations</h4>
                <p>An integration can be held below the level above, never raised past it.</p>
                <Grid>
                  <thead>
                    <tr>
                      <th>Integration</th>
                      <th>Access level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {integrations.map((integration) => (
                      <tr key={integration.id}>
                        <td>
                          <label htmlFor={`team-override-${integration.id}`}>
                            {integration.projectName || integration.clientId || `Integration #${integration.id}`}
                          </label>
                        </td>
                        <td className="level">
                          <PresetPicker
                            id={`team-override-${integration.id}`}
                            ariaLabel={`Access level for integration ${integration.id}`}
                            value={overrideFor(integration.id)?.permissions ?? null}
                            onChange={(permissions) => setOverride(integration.id, permissions)}
                            boundedBy={consent}
                            allowInherit
                            allowNoAccess
                            inheritedFrom={consent}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Grid>
              </>
            )}
          </div>
        }
      />
    </Panel>
  );
}

export default withTopAlert(TeamOrganizations);
