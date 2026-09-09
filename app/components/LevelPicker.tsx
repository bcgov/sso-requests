import React, { useState } from 'react';
import styled from 'styled-components';
import Dropdown from 'components/Dropdown';
import { Scope, TeamIntegration } from 'interfaces/organization';
import { LEVELS, LEVEL_DESCRIPTIONS, LEVEL_LABELS, LEVEL_RANK, Level } from '@app/shared/enums';
import { resolveLevel } from '@app/utils/levels';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfo, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

const INHERIT = 'inherit';

const Grid = styled.table`
  width: 100%;
  margin-bottom: 1em;

  th,
  td {
    padding: 0.25em 0.5em;
    text-align: left;
    vertical-align: top;
  }

  tr.team-wide td {
    border-bottom: 1px solid #ddd;
    font-weight: 600;
  }

  td.ceiling {
    color: #666;
    font-weight: normal;
  }
`;

const BulkBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-bottom: 0.75em;

  > div {
    min-width: 12em;
  }
`;

const SelectCell = styled.td`
  min-width: 17em;
`;

interface LevelOption {
  value: Level | typeof INHERIT;
  label: string;
}

interface Props {
  value: Scope[];
  onChange: (scopes: Scope[]) => void;
  integrations: TeamIntegration[];
  // When given, no row may be set above the level this resolves to, which is
  // how an organization is stopped from claiming more than a team consented to.
  boundedBy?: Scope[];
  // Shows what the team consented to beside each row. Off for the team's own
  // consent screen, where there is nothing above it to compare against.
  showCeilingColumn?: boolean;
  ceilingLabel?: string;
  disabled?: boolean;
  idPrefix: string;
  bulkAfterTeamWide?: boolean;
}

const rowFor = (scopes: Scope[], integrationId: number | null) =>
  scopes.find((scope) => (scope.integrationId ?? null) === integrationId);

function LevelPicker({
  value,
  onChange,
  integrations,
  boundedBy,
  showCeilingColumn = false,
  ceilingLabel = 'Team allows',
  disabled = false,
  idPrefix,
  bulkAfterTeamWide = false,
}: Readonly<Props>) {
  const [bulk, setBulk] = useState<Level>('viewer');

  const ceilingFor = (integrationId: number | null): Level =>
    boundedBy ? resolveLevel(boundedBy, { integrationId }) : 'editor';

  const teamWide = rowFor(value, null);
  const teamWideLevel: Level = teamWide?.level ?? 'none';

  const setRow = (integrationId: number | null, level: Level | typeof INHERIT) => {
    const others = value.filter((scope) => (scope.integrationId ?? null) !== integrationId);
    if (level === INHERIT) return onChange(others);
    onChange(others.concat([{ integrationId, level }]));
  };

  const applyToAll = () => {
    const rows: Scope[] = [];
    if (teamWide) rows.push(teamWide);
    for (const integration of integrations) {
      const capped = LEVEL_RANK[bulk] <= LEVEL_RANK[ceilingFor(integration.id)] ? bulk : ceilingFor(integration.id);
      rows.push({ integrationId: integration.id, level: capped });
    }
    onChange(rows);
  };

  const options = (integrationId: number | null) => {
    const ceiling = ceilingFor(integrationId);
    return LEVELS.filter((level) => LEVEL_RANK[level] <= LEVEL_RANK[ceiling]);
  };

  const renderSelect = (integrationId: number | null, current: Level | undefined) => {
    const id = `${idPrefix}-${integrationId ?? 'team'}`;
    const available = options(integrationId);
    // Only offer "inherit" when the team-wide level is actually achievable for
    // this integration; otherwise it would look like a valid choice while the
    // ceiling silently caps it down to something else, which is confusing.
    const inheritAllowed = integrationId !== null && LEVEL_RANK[teamWideLevel] <= LEVEL_RANK[ceilingFor(integrationId)];
    const selectOptions: LevelOption[] = [
      ...(inheritAllowed
        ? [{ value: INHERIT, label: `Same as all integrations (${LEVEL_LABELS[teamWideLevel]})` } as LevelOption]
        : []),
      ...available.map((level) => ({
        value: level,
        label: LEVEL_LABELS[level],
      })),
    ];
    const selectedValue = current ?? (integrationId === null || !inheritAllowed ? 'none' : INHERIT);

    return (
      <Dropdown
        inputId={id}
        data-testid={id}
        aria-label={integrationId === null ? 'Access level for all integrations' : `Access level for integration ${id}`}
        options={selectOptions}
        value={selectOptions.find((option) => option.value === selectedValue)}
        isDisabled={disabled}
        isSearchable={false}
        onChange={(option: any) => setRow(integrationId, option.value as Level | typeof INHERIT)}
        formatOptionLabel={(option: any) => (
          <span title={option.value === INHERIT ? undefined : LEVEL_DESCRIPTIONS[option.value as Level]}>
            {option.label}
          </span>
        )}
      />
    );
  };

  const bulkBar = integrations.length > 0 && !disabled && (
    <BulkBar>
      <label htmlFor={`${idPrefix}-bulk`}>Set every integration to</label>
      <Dropdown
        inputId={`${idPrefix}-bulk`}
        data-testid={`${idPrefix}-bulk`}
        aria-label="Bulk access level"
        options={LEVELS.map((level) => ({ value: level, label: LEVEL_LABELS[level] }))}
        value={{ value: bulk, label: LEVEL_LABELS[bulk] }}
        isSearchable={false}
        onChange={(option: any) => setBulk(option.value as Level)}
      />
      <button type="button" data-testid={`${idPrefix}-bulk-apply`} onClick={applyToAll}>
        Apply
      </button>
    </BulkBar>
  );

  const teamWideRow = (
    <tr className="team-wide">
      <td>
        <label htmlFor={`${idPrefix}-team`}>Default Integration Permission</label>
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip>
              The default permission level applied to integrations this team owns, including ones added in the future.
            </Tooltip>
          }
        >
          <FontAwesomeIcon icon={faInfoCircle} />
        </OverlayTrigger>
      </td>
      <SelectCell>{renderSelect(null, teamWide?.level)}</SelectCell>
      {showCeilingColumn && <td className="ceiling">{LEVEL_LABELS[ceilingFor(null)]}</td>}
    </tr>
  );

  const integrationRows = integrations.map((integration) => {
    const current = rowFor(value, integration.id);
    return (
      <tr key={integration.id}>
        <td>
          <label htmlFor={`${idPrefix}-${integration.id}`}>
            {integration.projectName || integration.clientId || `Integration #${integration.id}`}
          </label>
        </td>
        <SelectCell>{renderSelect(integration.id, current?.level)}</SelectCell>
        {showCeilingColumn && <td className="ceiling">{LEVEL_LABELS[ceilingFor(integration.id)]}</td>}
      </tr>
    );
  });

  const tableHeader = (
    <thead>
      <tr>
        <th>Integration</th>
        <th>Access level</th>
        {showCeilingColumn && <th>{ceilingLabel}</th>}
      </tr>
    </thead>
  );

  return (
    <>
      {bulkAfterTeamWide ? (
        <>
          <Grid>
            {tableHeader}
            <tbody>{teamWideRow}</tbody>
          </Grid>
          <h4>Integration Permission Override</h4>
          {bulkBar}
          <Grid>
            {tableHeader}
            <tbody>{integrationRows}</tbody>
          </Grid>
        </>
      ) : (
        <>
          {bulkBar}
          <Grid>
            {tableHeader}
            <tbody>
              {teamWideRow}
              {integrationRows}
            </tbody>
          </Grid>
        </>
      )}
    </>
  );
}

export default LevelPicker;
