import { Tabs } from '@bcgov-sso/common-react-components';
import FieldTemplate from './FieldTemplate';
import { FieldTemplateProps } from '@rjsf/utils/lib/types';
import styled from 'styled-components';
import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_FONT_FAMILY,
  FORM_TOP_SPACING,
  LINK_COLOR,
  MAIN_NAV_APP_BAR_COLOR,
  SECONDARY_BLUE,
  SECONDARY_FONT_COLOR,
  TABLE_ACTIVE_BLUE,
} from 'styles/theme';
import {
  SDXAllowedAccessForClient,
  SDXAccessRequest,
  SDXResourceServer,
  SDXService,
  SDXServiceScope,
} from '@app/shared/interfaces';

const TabWrapper = styled.div<{ short?: boolean }>`
  padding-top: ${FORM_TOP_SPACING};
  ${(props) => (props.short ? 'max-width: 800px;' : '')}
`;

const OrganizationSection = styled.section`
  margin-bottom: 2.25rem;
`;

const OrganizationHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #d8d8d8;
  margin-bottom: 1rem;
`;

const OrganizationTitle = styled.h3`
  margin: 0;
  font-size: 1.375rem;
`;

const OrganizationSummary = styled.span`
  margin-left: auto;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${SECONDARY_BLUE};
`;

const SDXServiceGrid = styled.div`
  display: grid;
  gap: 1rem;
`;

const SDXServiceCard = styled.div`
  border: 1px solid #d8d8d8;
  border-left: 3px solid ${SECONDARY_BLUE};
  padding: 1rem 1.125rem;
  background: #fff;
`;

const SDXServiceHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.625rem;
  margin-bottom: 0.875rem;
`;

const SDXServiceName = styled.h4`
  margin: 0;
  font-size: 1.125rem;
`;

const ApiSummary = styled.span`
  margin-left: auto;
  font-size: 0.8125rem;
  color: ${SECONDARY_FONT_COLOR};
  font-weight: 600;
`;

const VersionsGrid = styled.div`
  display: grid;
  gap: 0.125rem;
`;

const VersionRow = styled.div`
  display: grid;
  grid-template-columns: 132px 1fr;
  gap: 1rem;
  align-items: start;
  padding: 0.6875rem 0;
  border-top: 1px solid #e6e6e6;

  @media (max-width: 767px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
`;

const VersionMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  align-items: flex-start;
`;

const VersionLabel = styled.span`
  font-size: 1rem;
  font-weight: 700;
`;

const LinkButton = styled.button`
  border: 0;
  padding: 0;
  background: transparent;
  color: ${LINK_COLOR};
  font-size: 0.8125rem;
  font-family: ${DEFAULT_FONT_FAMILY};
  font-weight: 400;
  text-decoration: underline;

  &:hover {
    color: ${MAIN_NAV_APP_BAR_COLOR};
  }

  &:focus {
    outline: 4px solid #3b99fc;
    outline-offset: 1px;
  }
`;

const ScopeGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.125rem 0.625rem;
  padding-top: 0.0625rem;
`;

const ScopeCheckboxWrapper = styled.div`
  &.checkbox {
    margin: 0;
    display: inline-flex;
  }

  label {
    margin: 0;
    cursor: pointer;
    font-family: ${DEFAULT_FONT_FAMILY};
    font-weight: 400;
  }

  label > span {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.0625rem 0;
  }
`;

const ScopeLabelText = styled.span`
  font-size: 1rem;
  line-height: 1.3;
  border-radius: 2px;
`;

const ScopeCheckbox = styled.input`
  width: 1rem;
  height: 1rem;
  margin: 0.125rem 0 0;
  flex: 0 0 auto;
  accent-color: ${SECONDARY_BLUE};
`;

const SelectedScopesSection = styled.section`
  border: 1px solid #d8d8d8;
  background: #f8f9fa;
  padding: 0.75rem;
  margin-bottom: 1rem;
`;

const SelectedScopesHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
`;

const SelectedScopesTitle = styled.h5`
  margin: 0;
  font-size: 1rem;
  color: ${SECONDARY_BLUE};
`;

const SelectedScopesCount = styled.span`
  font-size: 0.8125rem;
  color: ${SECONDARY_FONT_COLOR};
`;

const SelectedScopesHeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
`;

const ClearAllButton = styled.button`
  border: 1px solid ${SECONDARY_BLUE};
  background: #fff;
  color: ${SECONDARY_BLUE};
  font-size: 0.75rem;
  font-family: ${DEFAULT_FONT_FAMILY};
  font-weight: 700;
  padding: 0.25rem 0.5rem;

  &:hover:not(:disabled) {
    background: ${TABLE_ACTIVE_BLUE};
  }

  &:focus {
    outline: 4px solid #3b99fc;
    outline-offset: 1px;
  }

  &:disabled {
    border-color: #d8d8d8;
    color: ${SECONDARY_FONT_COLOR};
    cursor: not-allowed;
  }
`;

const SelectedScopesList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
`;

const SelectedScopeTag = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff;
  border: 1px solid #c4d6ea;
  color: #313132;
  padding: 0.2rem 0.35rem 0.2rem 0.5rem;
`;

const SelectedScopeLabel = styled.span`
  font-size: 0.8125rem;
`;

const RemoveScopeButton = styled.button`
  border: 0;
  background: transparent;
  color: ${MAIN_NAV_APP_BAR_COLOR};
  font-size: 0.8125rem;
  padding: 0;
  min-width: 0.875rem;
  border-left: 1px solid #c4d6ea;
  border-radius: 0;
  padding-left: 0.3rem;
  font-family: ${DEFAULT_FONT_FAMILY};
  font-weight: 700;

  &:hover {
    color: ${LINK_COLOR};
    text-decoration: underline;
  }

  &:focus {
    outline: 4px solid #3b99fc;
    outline-offset: 1px;
  }

  &:disabled {
    color: ${SECONDARY_FONT_COLOR};
    border-left-color: #d8d8d8;
    opacity: 0.6;
    cursor: not-allowed;
    text-decoration: none;
  }

  &:disabled:hover {
    color: ${SECONDARY_FONT_COLOR};
    text-decoration: none;
  }

  &:disabled:focus {
    outline: none;
  }
`;

const EmptyScopesText = styled.p`
  margin: 0;
  color: ${SECONDARY_FONT_COLOR};
  font-size: 0.8125rem;
`;

type ScopeReference = {
  id: string;
  label: string;
};

export type EnvironmentKey = 'non-production' | 'production';
export type SelectedScopesByTab = Record<EnvironmentKey, Set<string>>;

type ClientScopeState = {
  approvedScopeIds: SelectedScopesByTab;
  pendingScopeIds: SelectedScopesByTab;
};

/** All versions of a service, grouped under a single card. */
type ServiceGroup = {
  key: string;
  title: string;
  services: SDXService[];
};

type SdxServicesPayload = {
  resourceServers: SDXResourceServer[];
};

/** Safely converts nullable values to arrays to avoid repeated null checks. */
function asArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

/** Raw SDX environment values for each tab, per app deployment (sandbox vs prod). */
const SANDBOX_ENVIRONMENT_VALUES: Record<EnvironmentKey, string> = {
  'non-production': 'apsdev',
  production: 'apstest',
};

const PROD_ENVIRONMENT_VALUES: Record<EnvironmentKey, string> = {
  'non-production': 'bct',
  production: 'bc',
};

const ENVIRONMENT_VALUES =
  process.env.NEXT_PUBLIC_APP_ENV === 'production' ? PROD_ENVIRONMENT_VALUES : SANDBOX_ENVIRONMENT_VALUES;

/** Normalizes raw SDX environment values into one of the supported tab keys. */
export function normalizeEnvironment(environment: string | undefined | null): EnvironmentKey {
  const normalized = String(environment || '')
    .trim()
    .toLowerCase();
  return normalized === ENVIRONMENT_VALUES.production ? 'production' : 'non-production';
}

export function getResourceServersForEnvironment(
  sdxServices: SDXResourceServer[],
  environment: EnvironmentKey,
): SDXResourceServer[] {
  return asArray(sdxServices).filter(
    (resourceServer) => normalizeEnvironment(resourceServer?.environment) === environment,
  );
}

/** Separator that cannot occur in scope labels, so scope ids stay parseable. */
const SCOPE_ID_SEPARATOR = '$$';

/** Creates a stable synthetic id for an individual scope. */
export function getScopeId(resourceServerKey: string, serviceKey: string, versionKey: string, scopeKey: string) {
  return [resourceServerKey, serviceKey, versionKey, scopeKey].join(SCOPE_ID_SEPARATOR);
}

/** Strips the resource server/service/version prefix back to the raw scope label. */
function getScopeLabelFromScopeId(scopeId: string): string {
  const segments = scopeId.split(SCOPE_ID_SEPARATOR);
  return segments[segments.length - 1];
}

/** Builds a normalized matcher key used for approved/pending matching. */
function getScopeMatcherKey(apiKey: string, versionKey: string, scopeKey: string) {
  return `${apiKey}::${versionKey}::${scopeKey}`.toLowerCase();
}

/** Returns a stable service key even when fields are partially populated. */
function getServiceKey(service: SDXService): string {
  return service.name || 'unknown-service';
}

/** Returns a stable resource server key even when fields are partially populated. */
function getResourceServerKey(resourceServer: SDXResourceServer): string {
  return resourceServer.id || resourceServer.name || resourceServer.organization || 'unknown-resource-server';
}

/** Extracts the scope label from both string and object-based scope formats. */
function getScopeLabel(scope: SDXServiceScope | string): string {
  return typeof scope === 'string' ? scope : scope.label;
}

/** Normalizes service scopes into a single iterable type. */
function getServiceScopes(service: SDXService): Array<SDXServiceScope | string> {
  return asArray<SDXServiceScope | string>(service?.scopes as Array<SDXServiceScope | string> | undefined | null);
}

/** Gets all synthetic scope ids for a specific service version. */
function getServiceScopeIds(resourceServer: SDXResourceServer, service: SDXService) {
  const resourceServerKey = getResourceServerKey(resourceServer);
  const serviceKey = getServiceKey(service);
  return getServiceScopes(service).map((scope) =>
    getScopeId(resourceServerKey, serviceKey, service.version, getScopeLabel(scope)),
  );
}

/** Groups a resource server's services by name so a single card lists all of its versions. */
function getServiceGroups(resourceServer: SDXResourceServer): ServiceGroup[] {
  const groups = new Map<string, ServiceGroup>();

  asArray(resourceServer?.services).forEach((service) => {
    const key = getServiceKey(service);
    const group = groups.get(key);

    if (group) group.services.push(service);
    else groups.set(key, { key, title: service.title || service.name, services: [service] });
  });

  return Array.from(groups.values());
}

/** Gets all synthetic scope ids across every version of a grouped service. */
function getServiceGroupScopeIds(resourceServer: SDXResourceServer, group: ServiceGroup) {
  return group.services.flatMap((service) => getServiceScopeIds(resourceServer, service));
}

/** Gets all synthetic scope ids for a resource server. */
function getResourceServerScopeIds(resourceServer: SDXResourceServer) {
  return asArray(resourceServer?.services).flatMap((service) => getServiceScopeIds(resourceServer, service));
}

/** Builds a lookup map used by the selected-scope panel for quick label resolution. */
function getScopeReferences(data: SDXResourceServer[] = []) {
  if (!Array.isArray(data)) return {};
  const references: Record<string, ScopeReference> = {};

  data.forEach((resourceServer) => {
    const resourceServerKey = getResourceServerKey(resourceServer);
    asArray(resourceServer?.services).forEach((service) => {
      const serviceKey = getServiceKey(service);
      getServiceScopes(service).forEach((scope) => {
        const scopeLabel = getScopeLabel(scope);
        const scopeId = getScopeId(resourceServerKey, serviceKey, service.version, scopeLabel);
        references[scopeId] = {
          id: scopeId,
          label: scopeLabel,
        };
      });
    });
  });

  return references;
}

/**
 * Computes which scopes should be preselected and/or locked based on approved
 * and pending access returned for the client.
 */
export function getClientScopeState(
  approved: SDXAllowedAccessForClient | null,
  pending: SDXAllowedAccessForClient | null,
  sdxServices: SDXResourceServer[] = [],
): ClientScopeState {
  const approvedScopeIds: SelectedScopesByTab = { 'non-production': new Set<string>(), production: new Set<string>() };
  const pendingScopeIds: SelectedScopesByTab = { 'non-production': new Set<string>(), production: new Set<string>() };

  if (!Array.isArray(sdxServices)) return { approvedScopeIds, pendingScopeIds };

  // Matcher keys are grouped by environment so allowed access in one environment never leaks into the other tab.
  const collectKeysByEnvironment = (allowed: SDXAllowedAccessForClient | null) => {
    const matcherKeys: Record<EnvironmentKey, Set<string>> = {
      'non-production': new Set<string>(),
      production: new Set<string>(),
    };
    const scopeLabels: Record<EnvironmentKey, Set<string>> = {
      'non-production': new Set<string>(),
      production: new Set<string>(),
    };

    asArray(allowed?.resourceServers).forEach((resourceServer) => {
      const environment = normalizeEnvironment(resourceServer?.environment);
      asArray(resourceServer?.services).forEach((service) => {
        const serviceKey = getServiceKey(service);
        getServiceScopes(service).forEach((scope) => {
          const scopeLabel = getScopeLabel(scope);
          scopeLabels[environment].add(scopeLabel.toLowerCase());
          matcherKeys[environment].add(getScopeMatcherKey(serviceKey, service.version, scopeLabel));
        });
      });
    });

    return { matcherKeys, scopeLabels };
  };

  const approvedKeys = collectKeysByEnvironment(approved);
  const pendingKeys = collectKeysByEnvironment(pending);

  asArray(sdxServices).forEach((resourceServer) => {
    const resourceServerKey = getResourceServerKey(resourceServer);
    const environment = normalizeEnvironment(resourceServer?.environment);

    asArray(resourceServer?.services).forEach((service) => {
      const serviceKey = getServiceKey(service);
      getServiceScopes(service).forEach((scope) => {
        const scopeLabel = getScopeLabel(scope);
        const scopeId = getScopeId(resourceServerKey, serviceKey, service.version, scopeLabel);
        const matcherKey = getScopeMatcherKey(serviceKey, service.version, scopeLabel);

        if (
          pendingKeys.matcherKeys[environment].has(matcherKey) ||
          pendingKeys.scopeLabels[environment].has(scopeLabel.toLowerCase())
        )
          pendingScopeIds[environment].add(scopeId);
        if (
          approvedKeys.matcherKeys[environment].has(matcherKey) ||
          approvedKeys.scopeLabels[environment].has(scopeLabel.toLowerCase())
        )
          approvedScopeIds[environment].add(scopeId);
      });
    });
  });

  return { approvedScopeIds, pendingScopeIds };
}

/**
 * Returns only the selected portions of resource servers for a target
 * environment, preserving the same shape expected by the backend.
 */
function getSelectedResourceServers(
  selectedScopeIds: Set<string>,
  sdxServices: SDXResourceServer[],
  environment: EnvironmentKey,
): SDXResourceServer[] {
  const selectedResourceServers: SDXResourceServer[] = [];

  getResourceServersForEnvironment(sdxServices, environment).forEach((resourceServer) => {
    const resourceServerKey = getResourceServerKey(resourceServer);

    const selectedServices = asArray(resourceServer.services)
      .map((service) => {
        const serviceKey = getServiceKey(service);

        const selectedScopes = getServiceScopes(service)
          .map((scope) => getScopeId(resourceServerKey, serviceKey, service.version, getScopeLabel(scope)))
          .filter((scopeId) => selectedScopeIds.has(scopeId))
          .map(getScopeLabelFromScopeId);

        if (selectedScopes.length === 0) return null;

        return {
          name: service.name,
          version: service.version,
          scopes: selectedScopes,
        } as SDXService;
      })
      .filter((service): service is SDXService => !!service);

    if (selectedServices.length === 0) return;

    selectedResourceServers.push({
      id: resourceServer.id,
      name: resourceServer.name,
      organization: resourceServer.organization,
      description: resourceServer.description,
      services: selectedServices,
      environment: resourceServer.environment,
    });
  });

  return selectedResourceServers;
}

/** Combines selected scope state from both tabs into a flat resource-server list payload. */
export function buildSdxRequestPayloadFromSelectedScopes(
  selectedScopesByTab: SelectedScopesByTab,
  sdxServices: SDXResourceServer[],
): SDXAccessRequest['resourceServers'] {
  const nonProductionResourceServers = getSelectedResourceServers(
    selectedScopesByTab['non-production'] ?? new Set<string>(),
    sdxServices,
    'non-production',
  );
  const productionResourceServers = getSelectedResourceServers(
    selectedScopesByTab.production ?? new Set<string>(),
    sdxServices,
    'production',
  );

  return [...nonProductionResourceServers, ...productionResourceServers];
}

/** Flattens resource-server scopes to synthetic ids for state restoration. */
function getSelectedScopeIdsFromResourceServers(resourceServers: SDXResourceServer[] | undefined): string[] {
  const scopeIds: string[] = [];

  asArray(resourceServers).forEach((resourceServer) => {
    const resourceServerKey = getResourceServerKey(resourceServer);
    asArray(resourceServer.services).forEach((service) => {
      const serviceKey = getServiceKey(service);
      getServiceScopes(service).forEach((scope) => {
        const scopeLabel = getScopeLabel(scope);
        scopeIds.push(getScopeId(resourceServerKey, serviceKey, service.version, scopeLabel));
      });
    });
  });

  return scopeIds;
}

/** Creates a tab-state object with each tab's required scopes preloaded. */
function createTabSelection(
  requiredScopeIds: SelectedScopesByTab,
  seed?: Partial<SelectedScopesByTab>,
): SelectedScopesByTab {
  return {
    'non-production': new Set<string>([
      ...Array.from(requiredScopeIds['non-production'] ?? new Set<string>()),
      ...Array.from(seed?.['non-production'] ?? new Set<string>()),
    ]),
    production: new Set<string>([
      ...Array.from(requiredScopeIds.production ?? new Set<string>()),
      ...Array.from(seed?.production ?? new Set<string>()),
    ]),
  };
}

export function restoreSelectedScopesByTab(
  serialized: unknown,
  requiredScopeIds: SelectedScopesByTab,
  defaultScopeIds: SelectedScopesByTab,
): SelectedScopesByTab {
  const fallback = createTabSelection(requiredScopeIds, {
    'non-production': new Set<string>(defaultScopeIds['non-production']),
    production: new Set<string>(defaultScopeIds.production),
  });

  if (!serialized || typeof serialized !== 'object') return fallback;

  const parsed = serialized as Record<string, unknown>;

  // Current format: { integrationId, resourceServers }
  if (Array.isArray(parsed.resourceServers)) {
    const selectedByTab: SelectedScopesByTab = {
      'non-production': new Set<string>(),
      production: new Set<string>(),
    };

    asArray(parsed.resourceServers as SDXResourceServer[]).forEach((resourceServer) => {
      const environment = normalizeEnvironment(resourceServer?.environment);
      const scopeIds = getSelectedScopeIdsFromResourceServers([resourceServer]);
      scopeIds.forEach((scopeId) => selectedByTab[environment].add(scopeId));
    });

    return createTabSelection(requiredScopeIds, selectedByTab);
  }

  // Current format: sdxServices is an array of selected resource servers.
  if (Array.isArray(serialized)) {
    const selectedFromSaved = serialized as SDXResourceServer[];
    const selectedByTab: SelectedScopesByTab = {
      'non-production': new Set<string>(),
      production: new Set<string>(),
    };

    asArray(selectedFromSaved).forEach((resourceServer) => {
      const environment = normalizeEnvironment(resourceServer?.environment);
      const selectedSet = selectedByTab[environment];
      const resourceServerKey = getResourceServerKey(resourceServer);

      asArray(resourceServer?.services).forEach((service) => {
        const serviceKey = getServiceKey(service);
        getServiceScopes(service).forEach((scope) => {
          selectedSet.add(getScopeId(resourceServerKey, serviceKey, service.version, getScopeLabel(scope)));
        });
      });
    });

    return createTabSelection(requiredScopeIds, selectedByTab);
  }

  // Backward compatibility: prior payload stored selected ids directly.
  if (Array.isArray(parsed['non-production']) || Array.isArray(parsed.production)) {
    return createTabSelection(requiredScopeIds, {
      'non-production': new Set<string>(asArray(parsed['non-production'] as string[])),
      production: new Set<string>(asArray(parsed.production as string[])),
    });
  }

  const nonProductionRequest = parsed['non-production'] as SDXAccessRequest | undefined;
  const productionRequest = parsed.production as SDXAccessRequest | undefined;

  return createTabSelection(requiredScopeIds, {
    'non-production': new Set<string>(getSelectedScopeIdsFromResourceServers(nonProductionRequest?.resourceServers)),
    production: new Set<string>(getSelectedScopeIdsFromResourceServers(productionRequest?.resourceServers)),
  });
}

type ScopeChipButtonProps = Readonly<{
  id: string;
  scope: SDXServiceScope;
  disabled?: boolean;
  selected: boolean;
  onClick: () => void;
}>;

function ScopeChipButton({ id, scope, disabled = false, selected, onClick }: ScopeChipButtonProps) {
  return (
    <ScopeCheckboxWrapper className="checkbox">
      <label htmlFor={id} title={scope.description}>
        <span>
          <ScopeCheckbox id={id} type="checkbox" checked={selected} disabled={disabled} onChange={onClick} />
          <ScopeLabelText>{scope.label}</ScopeLabelText>
        </span>
      </label>
    </ScopeCheckboxWrapper>
  );
}

type SelectedScopesPanelProps = Readonly<{
  scopeReferences: Record<string, ScopeReference>;
  pendingScopeIds: Set<string>;
  selectedScopes: Set<string>;
  onRemoveScope: (scopeId: string) => void;
  onRemoveAllScopes: () => void;
}>;

function SelectedScopesPanel({
  scopeReferences,
  pendingScopeIds,
  selectedScopes,
  onRemoveScope,
  onRemoveAllScopes,
}: SelectedScopesPanelProps) {
  const selectedScopeEntries = Array.from(selectedScopes)
    .map((scopeId) => scopeReferences[scopeId])
    .filter((entry): entry is ScopeReference => !!entry)
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <SelectedScopesSection>
      <SelectedScopesHeader>
        <SelectedScopesTitle>Selected Scopes</SelectedScopesTitle>
        <SelectedScopesHeaderActions>
          <SelectedScopesCount>{selectedScopeEntries.length} selected</SelectedScopesCount>
          <ClearAllButton type="button" disabled={selectedScopeEntries.length === 0} onClick={onRemoveAllScopes}>
            Remove all scopes
          </ClearAllButton>
        </SelectedScopesHeaderActions>
      </SelectedScopesHeader>

      {selectedScopeEntries.length === 0 && <EmptyScopesText>No scopes selected yet.</EmptyScopesText>}

      {selectedScopeEntries.length > 0 && (
        <SelectedScopesList>
          {selectedScopeEntries.map((scopeEntry) => (
            <SelectedScopeTag key={scopeEntry.id}>
              <SelectedScopeLabel>{scopeEntry.label}</SelectedScopeLabel>
              <RemoveScopeButton
                type="button"
                aria-label={`Remove ${scopeEntry.label}`}
                disabled={pendingScopeIds.has(scopeEntry.id)}
                onClick={() => onRemoveScope(scopeEntry.id)}
              >
                x
              </RemoveScopeButton>
            </SelectedScopeTag>
          ))}
        </SelectedScopesList>
      )}
    </SelectedScopesSection>
  );
}

type VersionScopesRowProps = Readonly<{
  resourceServer: SDXResourceServer;
  service: SDXService;
  pendingScopeIds: Set<string>;
  selectedScopes: Set<string>;
  onToggleScope: (scopeId: string) => void;
  onToggleVersion: (scopeIds: string[]) => void;
}>;

function VersionScopesRow({
  resourceServer,
  service,
  pendingScopeIds,
  selectedScopes,
  onToggleScope,
  onToggleVersion,
}: VersionScopesRowProps) {
  const versionScopeIds = getServiceScopeIds(resourceServer, service);
  const toggleableVersionScopeIds = versionScopeIds.filter((scopeId) => !pendingScopeIds.has(scopeId));
  const allSelected = toggleableVersionScopeIds.every((scopeId: string) => selectedScopes.has(scopeId));

  return (
    <VersionRow>
      <VersionMeta>
        <VersionLabel>{service.version}</VersionLabel>
        <LinkButton
          type="button"
          disabled={toggleableVersionScopeIds.length === 0}
          onClick={() => onToggleVersion(versionScopeIds)}
        >
          {allSelected ? 'Clear all scopes' : 'Select all scopes'}
        </LinkButton>
      </VersionMeta>

      <ScopeGrid>
        {getServiceScopes(service).map((scope) => {
          const scopeLabel = getScopeLabel(scope);
          const scopeId = getScopeId(
            getResourceServerKey(resourceServer),
            getServiceKey(service),
            service.version,
            scopeLabel,
          );
          const isSelected = selectedScopes.has(scopeId);
          const isPending = pendingScopeIds.has(scopeId);

          return (
            <ScopeChipButton
              key={scopeId}
              id={`scope-${resourceServer.environment}-${scopeId}`}
              scope={typeof scope === 'string' ? { label: scope, description: scope } : scope}
              disabled={isPending}
              selected={isSelected}
              onClick={() => onToggleScope(scopeId)}
            />
          );
        })}
      </ScopeGrid>
    </VersionRow>
  );
}

type ApiCardSectionProps = Readonly<{
  resourceServer: SDXResourceServer;
  group: ServiceGroup;
  pendingScopeIds: Set<string>;
  selectedScopes: Set<string>;
  onToggleScope: (scopeId: string) => void;
  onToggleVersion: (scopeIds: string[]) => void;
}>;

function ApiCardSection({
  resourceServer,
  group,
  pendingScopeIds,
  selectedScopes,
  onToggleScope,
  onToggleVersion,
}: ApiCardSectionProps) {
  const apiScopeIds = getServiceGroupScopeIds(resourceServer, group);
  const selectedInApi = apiScopeIds.filter((scopeId) => selectedScopes.has(scopeId)).length;

  return (
    <SDXServiceCard>
      <SDXServiceHeader>
        <SDXServiceName>{group.title}</SDXServiceName>
        <ApiSummary>
          {selectedInApi} of {apiScopeIds.length} scopes
        </ApiSummary>
      </SDXServiceHeader>

      <VersionsGrid>
        {group.services.map((service) => (
          <VersionScopesRow
            key={service.version}
            resourceServer={resourceServer}
            service={service}
            pendingScopeIds={pendingScopeIds}
            selectedScopes={selectedScopes}
            onToggleScope={onToggleScope}
            onToggleVersion={onToggleVersion}
          />
        ))}
      </VersionsGrid>
    </SDXServiceCard>
  );
}

type OrganizationBlockProps = Readonly<{
  resourceServer: SDXResourceServer;
  pendingScopeIds: Set<string>;
  selectedScopes: Set<string>;
  onToggleScope: (scopeId: string) => void;
  onToggleVersion: (scopeIds: string[]) => void;
}>;

function OrganizationBlock({
  resourceServer,
  pendingScopeIds,
  selectedScopes,
  onToggleScope,
  onToggleVersion,
}: OrganizationBlockProps) {
  const organizationScopeIds = getResourceServerScopeIds(resourceServer);
  const selectedInOrganization = organizationScopeIds.filter((scopeId) => selectedScopes.has(scopeId)).length;

  return (
    <OrganizationSection>
      <OrganizationHeader>
        <OrganizationTitle>{resourceServer.organization || resourceServer.name || resourceServer.id}</OrganizationTitle>
        <OrganizationSummary>{selectedInOrganization} selected</OrganizationSummary>
      </OrganizationHeader>

      <SDXServiceGrid>
        {getServiceGroups(resourceServer).map((group) => (
          <ApiCardSection
            key={group.key}
            resourceServer={resourceServer}
            group={group}
            pendingScopeIds={pendingScopeIds}
            selectedScopes={selectedScopes}
            onToggleScope={onToggleScope}
            onToggleVersion={onToggleVersion}
          />
        ))}
      </SDXServiceGrid>
    </OrganizationSection>
  );
}

type OrganizationApiScopeSelectorProps = Readonly<{
  data: SDXResourceServer[];
  pendingScopeIds: Set<string>;
  selectedScopes: Set<string>;
  onToggleScope: (scopeId: string) => void;
  onToggleVersion: (scopeIds: string[]) => void;
}>;

function OrganizationApiScopeSelector({
  data,
  pendingScopeIds,
  selectedScopes,
  onToggleScope,
  onToggleVersion,
}: OrganizationApiScopeSelectorProps) {
  return (
    <>
      {asArray(data).map((resourceServer) => (
        <OrganizationBlock
          key={getResourceServerKey(resourceServer)}
          resourceServer={resourceServer}
          pendingScopeIds={pendingScopeIds}
          selectedScopes={selectedScopes}
          onToggleScope={onToggleScope}
          onToggleVersion={onToggleVersion}
        />
      ))}
    </>
  );
}

const tabItems = (
  sdxServices: SDXResourceServer[],
  scopeReferences: Record<string, ScopeReference>,
  pendingScopeIds: SelectedScopesByTab,
  selectedScopesByTab: SelectedScopesByTab,
  onToggleScope: (tabKey: EnvironmentKey, scopeId: string) => void,
  onToggleVersion: (tabKey: EnvironmentKey, scopeIds: string[]) => void,
  onClearTabScopes: (tabKey: EnvironmentKey) => void,
) => [
  {
    key: 'non-production',
    label: `Non-Production (${selectedScopesByTab['non-production']?.size ?? 0})`,
    children: (
      <TabWrapper>
        <SelectedScopesPanel
          scopeReferences={scopeReferences}
          pendingScopeIds={pendingScopeIds['non-production']}
          selectedScopes={selectedScopesByTab['non-production'] ?? new Set<string>()}
          onRemoveScope={(scopeId) => onToggleScope('non-production', scopeId)}
          onRemoveAllScopes={() => onClearTabScopes('non-production')}
        />
        <OrganizationApiScopeSelector
          data={getResourceServersForEnvironment(sdxServices, 'non-production')}
          pendingScopeIds={pendingScopeIds['non-production']}
          selectedScopes={selectedScopesByTab['non-production']}
          onToggleScope={(scopeId) => onToggleScope('non-production', scopeId)}
          onToggleVersion={(scopeIds) => onToggleVersion('non-production', scopeIds)}
        />
      </TabWrapper>
    ),
  },
  {
    key: 'production',
    label: `Production (${selectedScopesByTab.production?.size ?? 0})`,
    children: (
      <TabWrapper>
        <SelectedScopesPanel
          scopeReferences={scopeReferences}
          pendingScopeIds={pendingScopeIds.production}
          selectedScopes={selectedScopesByTab.production ?? new Set<string>()}
          onRemoveScope={(scopeId) => onToggleScope('production', scopeId)}
          onRemoveAllScopes={() => onClearTabScopes('production')}
        />
        <OrganizationApiScopeSelector
          data={getResourceServersForEnvironment(sdxServices, 'production')}
          pendingScopeIds={pendingScopeIds.production}
          selectedScopes={selectedScopesByTab.production}
          onToggleScope={(scopeId) => onToggleScope('production', scopeId)}
          onToggleVersion={(scopeIds) => onToggleVersion('production', scopeIds)}
        />
      </TabWrapper>
    ),
  },
];

export default function FieldSdxServices(props: Readonly<FieldTemplateProps>) {
  const { formContext, onChange } = props;
  const { sdxResourceServers, sdxServicesApprovedForClient, sdxServicesPendingForClient, formData, setFormData } =
    formContext || {};
  const normalizedSdxServices = Array.isArray(sdxResourceServers) ? sdxResourceServers : [];
  const normalizedApprovedClientSdxServices =
    sdxServicesApprovedForClient && typeof sdxServicesApprovedForClient === 'object'
      ? (sdxServicesApprovedForClient as SDXAllowedAccessForClient)
      : null;
  const normalizedPendingClientSdxServices =
    sdxServicesPendingForClient && typeof sdxServicesPendingForClient === 'object'
      ? (sdxServicesPendingForClient as SDXAllowedAccessForClient)
      : null;
  const scopeReferences = useMemo(() => getScopeReferences(normalizedSdxServices), [normalizedSdxServices]);
  const { approvedScopeIds, pendingScopeIds } = useMemo(
    () =>
      getClientScopeState(
        normalizedApprovedClientSdxServices,
        normalizedPendingClientSdxServices,
        normalizedSdxServices,
      ),
    [normalizedApprovedClientSdxServices, normalizedPendingClientSdxServices, normalizedSdxServices],
  );
  const defaultSelectedScopeIds = useMemo<SelectedScopesByTab>(
    () => ({
      'non-production': new Set<string>([
        ...Array.from(approvedScopeIds['non-production']),
        ...Array.from(pendingScopeIds['non-production']),
      ]),
      production: new Set<string>([
        ...Array.from(approvedScopeIds.production),
        ...Array.from(pendingScopeIds.production),
      ]),
    }),
    [approvedScopeIds, pendingScopeIds],
  );
  const requiredSelectedScopeIds = useMemo<SelectedScopesByTab>(
    () => ({
      'non-production': new Set<string>(pendingScopeIds['non-production']),
      production: new Set<string>(pendingScopeIds.production),
    }),
    [pendingScopeIds],
  );
  const persistedSelectedScopesByTab = useMemo(
    () => restoreSelectedScopesByTab(formData?.sdxServices, requiredSelectedScopeIds, defaultSelectedScopeIds),
    [formData?.sdxServices, requiredSelectedScopeIds, defaultSelectedScopeIds],
  );
  const [activeTab, setActiveTab] = useState<EnvironmentKey>('non-production');

  const [selectedScopesByTab, setSelectedScopesByTab] = useState<SelectedScopesByTab>(() => ({
    'non-production': new Set(persistedSelectedScopesByTab['non-production']),
    production: new Set(persistedSelectedScopesByTab.production),
  }));

  useEffect(() => {
    setSelectedScopesByTab((previous) => ({
      'non-production': new Set<string>([
        ...Array.from(previous['non-production'] ?? new Set<string>()),
        ...Array.from(persistedSelectedScopesByTab['non-production']),
        ...Array.from(requiredSelectedScopeIds['non-production']),
      ]),
      production: new Set<string>([
        ...Array.from(previous.production ?? new Set<string>()),
        ...Array.from(persistedSelectedScopesByTab.production),
        ...Array.from(requiredSelectedScopeIds.production),
      ]),
    }));
  }, [persistedSelectedScopesByTab, requiredSelectedScopeIds]);

  const onToggleScope = (tabKey: EnvironmentKey, scopeId: string) => {
    setSelectedScopesByTab((previous) => {
      if (pendingScopeIds[tabKey].has(scopeId)) return previous;
      const currentSet = previous[tabKey] ?? new Set<string>();
      const nextSet = new Set(currentSet);

      if (nextSet.has(scopeId)) nextSet.delete(scopeId);
      else nextSet.add(scopeId);

      return {
        ...previous,
        [tabKey]: nextSet,
      };
    });
  };

  const onToggleVersion = (tabKey: EnvironmentKey, scopeIds: string[]) => {
    setSelectedScopesByTab((previous) => {
      const currentSet = previous[tabKey] ?? new Set<string>();
      const nextSet = new Set(currentSet);
      const toggleableScopeIds = scopeIds.filter((scopeId) => !pendingScopeIds[tabKey].has(scopeId));
      const shouldSelectAll = toggleableScopeIds.some((scopeId) => !nextSet.has(scopeId));

      toggleableScopeIds.forEach((scopeId) => {
        if (shouldSelectAll) nextSet.add(scopeId);
        else nextSet.delete(scopeId);
      });

      return {
        ...previous,
        [tabKey]: nextSet,
      };
    });
  };

  const onClearTabScopes = (tabKey: EnvironmentKey) => {
    setSelectedScopesByTab((previous) => ({
      ...previous,
      [tabKey]: new Set<string>(pendingScopeIds[tabKey]),
    }));
  };

  useEffect(() => {
    const selectedResourceServers = buildSdxRequestPayloadFromSelectedScopes(
      selectedScopesByTab,
      normalizedSdxServices,
    );

    const sdxServicesPayload: SdxServicesPayload = {
      resourceServers: selectedResourceServers,
    };
    if (typeof setFormData === 'function') {
      setFormData((previousFormData: any) => ({
        ...previousFormData,
        sdxServices: sdxServicesPayload,
      }));
    }

    if (typeof onChange === 'function') {
      onChange(sdxServicesPayload);
    }
  }, [selectedScopesByTab, normalizedSdxServices, formData?.id, setFormData, onChange]);

  const top = (
    <Tabs
      activeKey={activeTab}
      onChange={(key) => setActiveTab(key as EnvironmentKey)}
      items={tabItems(
        normalizedSdxServices,
        scopeReferences,
        pendingScopeIds,
        selectedScopesByTab,
        onToggleScope,
        onToggleVersion,
        onClearTabScopes,
      )}
      tabBarGutter={30}
      style={{ maxWidth: '850px' }}
    />
  );

  return <FieldTemplate {...props} top={top} />;
}
