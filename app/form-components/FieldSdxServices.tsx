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
  SDXResourceServer,
  SDXService,
  SDXServiceScope,
  SDXServiceVersion,
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

const OrganizationSubTitle = styled.span`
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${SECONDARY_FONT_COLOR};
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

const VersionStatus = styled.span<{ deprecated?: boolean }>`
  font-size: 0.625rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.125rem 0.375rem;
  background: ${(props) => (props.deprecated ? '#f2f2f2' : TABLE_ACTIVE_BLUE)};
  color: ${(props) => (props.deprecated ? SECONDARY_FONT_COLOR : SECONDARY_BLUE)};
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

const ScopeLabelText = styled.span<{ selected: boolean }>`
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

type ClientScopeState = {
  approvedScopeIds: Set<string>;
  pendingScopeIds: Set<string>;
};

type SelectedScopesByTab = Record<string, Set<string>>;

type ScopeMetadata = {
  resourceServerId: string;
  organization: string;
  serviceName: string;
  version: string;
  scopeLabel: string;
};

type PayloadService = {
  name: string;
  version: string;
  scopes: string[];
  environment: string;
};

type PayloadOrganization = {
  resourceServerId: string;
  organization: string;
  services: PayloadService[];
};

type SerializedSelectedScopesByTab = Record<string, string[]>;

function getScopeId(resourceServerKey: string, serviceKey: string, versionKey: string, scopeKey: string) {
  return `${resourceServerKey}.${serviceKey}.${versionKey}.${scopeKey}`;
}

function getScopeMatcherKey(apiKey: string, versionKey: string, scopeKey: string) {
  return `${apiKey}::${versionKey}::${scopeKey}`.toLowerCase();
}

function asArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function getServiceKey(service: SDXService): string {
  return service.id || service.name || 'unknown-service';
}

function getResourceServerKey(resourceServer: SDXResourceServer): string {
  return resourceServer.id || resourceServer.name || resourceServer.organization || 'unknown-resource-server';
}

function getScopeLabel(scope: SDXServiceScope | string): string {
  return typeof scope === 'string' ? scope : scope.label;
}

function getVersionScopes(version: SDXServiceVersion): Array<SDXServiceScope | string> {
  return asArray<SDXServiceScope | string>(version?.scopes as Array<SDXServiceScope | string> | undefined | null);
}

function getVersionScopeIds(resourceServer: SDXResourceServer, service: SDXService, version: SDXServiceVersion) {
  const resourceServerKey = getResourceServerKey(resourceServer);
  const serviceKey = getServiceKey(service);
  return getVersionScopes(version).map((scope) =>
    getScopeId(resourceServerKey, serviceKey, version.label, getScopeLabel(scope)),
  );
}

function getServiceScopeIds(resourceServer: SDXResourceServer, service: SDXService) {
  return asArray(service?.versions).flatMap((version) => getVersionScopeIds(resourceServer, service, version));
}

function getResourceServerScopeIds(resourceServer: SDXResourceServer) {
  return asArray(resourceServer?.services).flatMap((service) => getServiceScopeIds(resourceServer, service));
}

function getScopeReferences(data: SDXResourceServer[] = []) {
  if (!Array.isArray(data)) return {};
  const references: Record<string, ScopeReference> = {};

  data.forEach((resourceServer) => {
    const resourceServerKey = getResourceServerKey(resourceServer);
    asArray(resourceServer?.services).forEach((service) => {
      const serviceKey = getServiceKey(service);
      asArray(service?.versions).forEach((version) => {
        getVersionScopes(version).forEach((scope) => {
          const scopeLabel = getScopeLabel(scope);
          const scopeId = getScopeId(resourceServerKey, serviceKey, version.label, scopeLabel);
          references[scopeId] = {
            id: scopeId,
            label: scopeLabel,
          };
        });
      });
    });
  });

  return references;
}

function getClientScopeState(
  approved: SDXAllowedAccessForClient | null,
  pending: SDXAllowedAccessForClient | null,
  sdxServices: SDXResourceServer[] = [],
): ClientScopeState {
  const approvedScopeIds = new Set<string>();
  const pendingScopeIds = new Set<string>();

  if (!Array.isArray(sdxServices)) return { approvedScopeIds, pendingScopeIds };

  const collectKeys = (allowed: SDXAllowedAccessForClient | null) => {
    const matcherKeys = new Set<string>();
    const scopeLabels = new Set<string>();

    asArray(allowed?.resourceServers).forEach((resourceServer) => {
      asArray(resourceServer?.services).forEach((service) => {
        const serviceCandidates = [service.id, service.name].filter((value): value is string => !!value);
        asArray(service?.versions).forEach((version) => {
          getVersionScopes(version).forEach((scope) => {
            const scopeLabel = getScopeLabel(scope);
            scopeLabels.add(scopeLabel.toLowerCase());
            serviceCandidates.forEach((serviceKey) => {
              matcherKeys.add(getScopeMatcherKey(serviceKey, version.label, scopeLabel));
            });
          });
        });
      });
    });

    return { matcherKeys, scopeLabels };
  };

  const approvedKeys = collectKeys(approved);
  const pendingKeys = collectKeys(pending);

  asArray(sdxServices).forEach((resourceServer) => {
    asArray(resourceServer?.services).forEach((service) => {
      const serviceCandidates = [service.id, service.name].filter((value): value is string => !!value);
      asArray(service?.versions).forEach((version) => {
        getVersionScopes(version).forEach((scope) => {
          const scopeLabel = getScopeLabel(scope);
          const resourceServerKey = getResourceServerKey(resourceServer);
          const serviceKey = getServiceKey(service);
          const scopeId = getScopeId(resourceServerKey, serviceKey, version.label, scopeLabel);

          const hasPendingMatcher = serviceCandidates.some((candidate) =>
            pendingKeys.matcherKeys.has(getScopeMatcherKey(candidate, version.label, scopeLabel)),
          );
          const hasApprovedMatcher = serviceCandidates.some((candidate) =>
            approvedKeys.matcherKeys.has(getScopeMatcherKey(candidate, version.label, scopeLabel)),
          );

          if (hasPendingMatcher || pendingKeys.scopeLabels.has(scopeLabel.toLowerCase())) pendingScopeIds.add(scopeId);
          if (hasApprovedMatcher || approvedKeys.scopeLabels.has(scopeLabel.toLowerCase()))
            approvedScopeIds.add(scopeId);
        });
      });
    });
  });

  return { approvedScopeIds, pendingScopeIds };
}

function buildScopeMetadataMap(sdxServices: SDXResourceServer[]): Record<string, ScopeMetadata> {
  const metadataByScopeId: Record<string, ScopeMetadata> = {};

  asArray(sdxServices).forEach((resourceServer) => {
    const resourceServerKey = getResourceServerKey(resourceServer);
    asArray(resourceServer?.services).forEach((service) => {
      const serviceKey = getServiceKey(service);
      asArray(service?.versions).forEach((version) => {
        getVersionScopes(version).forEach((scope) => {
          const scopeLabel = getScopeLabel(scope);
          const scopeId = getScopeId(resourceServerKey, serviceKey, version.label, scopeLabel);
          metadataByScopeId[scopeId] = {
            resourceServerId: resourceServer.id,
            organization: resourceServer.organization || resourceServer.name || resourceServer.id,
            serviceName: service.name || service.id,
            version: version.label,
            scopeLabel,
          };
        });
      });
    });
  });

  return metadataByScopeId;
}

function buildSdxRequestPayloadFromSelectedScopes(
  selectedScopesByTab: SelectedScopesByTab,
  scopeMetadataById: Record<string, ScopeMetadata>,
): PayloadOrganization | PayloadOrganization[] | null {
  const organizationsMap = new Map<string, { organization: string; servicesMap: Map<string, PayloadService> }>();

  Object.entries(selectedScopesByTab).forEach(([environment, selectedScopeSet]) => {
    asArray(Array.from(selectedScopeSet ?? new Set<string>())).forEach((scopeId) => {
      const metadata = scopeMetadataById[scopeId];
      if (!metadata) return;

      if (!organizationsMap.has(metadata.resourceServerId)) {
        organizationsMap.set(metadata.resourceServerId, {
          organization: metadata.organization,
          servicesMap: new Map<string, PayloadService>(),
        });
      }

      const { servicesMap } = organizationsMap.get(metadata.resourceServerId)!;
      const serviceKey = `${metadata.serviceName}::${metadata.version}::${environment}`;

      if (!servicesMap.has(serviceKey)) {
        servicesMap.set(serviceKey, {
          name: metadata.serviceName,
          version: metadata.version,
          scopes: [],
          environment,
        });
      }

      const serviceEntry = servicesMap.get(serviceKey)!;
      if (!serviceEntry.scopes.includes(metadata.scopeLabel)) {
        serviceEntry.scopes.push(metadata.scopeLabel);
      }
    });
  });

  const organizationsPayload: PayloadOrganization[] = Array.from(organizationsMap.entries()).map(
    ([resourceServerId, value]) => ({
      resourceServerId,
      organization: value.organization,
      services: Array.from(value.servicesMap.values()),
    }),
  );

  if (organizationsPayload.length === 0) return null;
  if (organizationsPayload.length === 1) return organizationsPayload[0];
  return organizationsPayload;
}

function serializeSelectedScopesByTab(selectedScopesByTab: SelectedScopesByTab): SerializedSelectedScopesByTab {
  const serialized: SerializedSelectedScopesByTab = {};

  Object.entries(selectedScopesByTab).forEach(([tabKey, scopeIds]) => {
    serialized[tabKey] = Array.from(scopeIds ?? new Set<string>());
  });

  return serialized;
}

function restoreSelectedScopesByTab(
  serialized: unknown,
  requiredScopeIds: Set<string>,
  defaultScopeIds: Set<string>,
): SelectedScopesByTab {
  const fallback: SelectedScopesByTab = {
    'non-production': new Set<string>(defaultScopeIds),
    production: new Set<string>(defaultScopeIds),
  };

  if (!serialized || typeof serialized !== 'object') return fallback;

  const parsed = serialized as Record<string, unknown>;

  return {
    'non-production': new Set<string>([
      ...Array.from(requiredScopeIds),
      ...asArray(parsed['non-production'] as string[]),
    ]),
    production: new Set<string>([...Array.from(requiredScopeIds), ...asArray(parsed.production as string[])]),
  };
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
          <ScopeLabelText selected={selected}>{scope.label}</ScopeLabelText>
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
  version: SDXServiceVersion;
  pendingScopeIds: Set<string>;
  selectedScopes: Set<string>;
  onToggleScope: (scopeId: string) => void;
  onToggleVersion: (scopeIds: string[]) => void;
}>;

function VersionScopesRow({
  resourceServer,
  service,
  version,
  pendingScopeIds,
  selectedScopes,
  onToggleScope,
  onToggleVersion,
}: VersionScopesRowProps) {
  const versionScopeIds = getVersionScopeIds(resourceServer, service, version);
  const toggleableVersionScopeIds = versionScopeIds.filter((scopeId) => !pendingScopeIds.has(scopeId));
  const allSelected = toggleableVersionScopeIds.every((scopeId: string) => selectedScopes.has(scopeId));

  return (
    <VersionRow key={version.label}>
      <VersionMeta>
        <VersionLabel>{version.label}</VersionLabel>
        <VersionStatus deprecated={version.status === 'Deprecated'}>{version.status}</VersionStatus>
        <LinkButton
          type="button"
          disabled={toggleableVersionScopeIds.length === 0}
          onClick={() => onToggleVersion(versionScopeIds)}
        >
          {allSelected ? 'Clear all scopes' : 'Select all scopes'}
        </LinkButton>
      </VersionMeta>

      <ScopeGrid>
        {getVersionScopes(version).map((scope) => {
          const scopeLabel = getScopeLabel(scope);
          const scopeId = getScopeId(
            getResourceServerKey(resourceServer),
            getServiceKey(service),
            version.label,
            scopeLabel,
          );
          const isSelected = selectedScopes.has(scopeId);
          const isPending = pendingScopeIds.has(scopeId);

          return (
            <ScopeChipButton
              key={scopeId}
              id={`scope-${scopeId}`}
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
  service: SDXService;
  pendingScopeIds: Set<string>;
  selectedScopes: Set<string>;
  onToggleScope: (scopeId: string) => void;
  onToggleVersion: (scopeIds: string[]) => void;
}>;

function ApiCardSection({
  resourceServer,
  service,
  pendingScopeIds,
  selectedScopes,
  onToggleScope,
  onToggleVersion,
}: ApiCardSectionProps) {
  const apiScopeIds = getServiceScopeIds(resourceServer, service);
  const selectedInApi = apiScopeIds.filter((scopeId) => selectedScopes.has(scopeId)).length;

  return (
    <SDXServiceCard key={service.id}>
      <SDXServiceHeader>
        <SDXServiceName>{service.name || service.id}</SDXServiceName>
        <ApiSummary>
          {selectedInApi} of {apiScopeIds.length} scopes
        </ApiSummary>
      </SDXServiceHeader>

      <VersionsGrid>
        {asArray(service?.versions).map((version) => (
          <VersionScopesRow
            key={version.label}
            resourceServer={resourceServer}
            service={service}
            version={version}
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
    <OrganizationSection key={getResourceServerKey(resourceServer)}>
      <OrganizationHeader>
        <OrganizationTitle>{resourceServer.organization || resourceServer.name || resourceServer.id}</OrganizationTitle>
        <OrganizationSummary>{selectedInOrganization} selected</OrganizationSummary>
      </OrganizationHeader>

      <SDXServiceGrid>
        {asArray(resourceServer?.services).map((service) => (
          <ApiCardSection
            key={service.id}
            resourceServer={resourceServer}
            service={service}
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
  pendingScopeIds: Set<string>,
  selectedScopesByTab: Record<string, Set<string>>,
  onToggleScope: (tabKey: string, scopeId: string) => void,
  onToggleVersion: (tabKey: string, scopeIds: string[]) => void,
  onClearTabScopes: (tabKey: string) => void,
) => [
  {
    key: 'non-production',
    label: `Non-Production (${selectedScopesByTab['non-production']?.size ?? 0})`,
    children: (
      <TabWrapper>
        <SelectedScopesPanel
          scopeReferences={scopeReferences}
          pendingScopeIds={pendingScopeIds}
          selectedScopes={selectedScopesByTab['non-production'] ?? new Set<string>()}
          onRemoveScope={(scopeId) => onToggleScope('non-production', scopeId)}
          onRemoveAllScopes={() => onClearTabScopes('non-production')}
        />
        <OrganizationApiScopeSelector
          data={sdxServices}
          pendingScopeIds={pendingScopeIds}
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
          pendingScopeIds={pendingScopeIds}
          selectedScopes={selectedScopesByTab.production ?? new Set<string>()}
          onRemoveScope={(scopeId) => onToggleScope('production', scopeId)}
          onRemoveAllScopes={() => onClearTabScopes('production')}
        />
        <OrganizationApiScopeSelector
          data={sdxServices}
          pendingScopeIds={pendingScopeIds}
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
  const scopeMetadataById = useMemo(() => buildScopeMetadataMap(normalizedSdxServices), [normalizedSdxServices]);
  const { approvedScopeIds, pendingScopeIds } = useMemo(
    () =>
      getClientScopeState(
        normalizedApprovedClientSdxServices,
        normalizedPendingClientSdxServices,
        normalizedSdxServices,
      ),
    [normalizedApprovedClientSdxServices, normalizedPendingClientSdxServices, normalizedSdxServices],
  );
  const defaultSelectedScopeIds = useMemo(
    () => new Set<string>([...Array.from(approvedScopeIds), ...Array.from(pendingScopeIds)]),
    [approvedScopeIds, pendingScopeIds],
  );
  const requiredSelectedScopeIds = useMemo(() => new Set<string>(pendingScopeIds), [pendingScopeIds]);
  const persistedSelectedScopesByTab = useMemo(
    () =>
      restoreSelectedScopesByTab(
        formData?.sdxServices?.selectedScopesByTab,
        requiredSelectedScopeIds,
        defaultSelectedScopeIds,
      ),
    [formData?.sdxServices?.selectedScopesByTab, requiredSelectedScopeIds, defaultSelectedScopeIds],
  );
  const [activeTab, setActiveTab] = useState('non-production');

  const [selectedScopesByTab, setSelectedScopesByTab] = useState<Record<string, Set<string>>>(() => ({
    'non-production': new Set(persistedSelectedScopesByTab['non-production']),
    production: new Set(persistedSelectedScopesByTab.production),
  }));

  useEffect(() => {
    setSelectedScopesByTab((previous) => ({
      'non-production': new Set<string>([
        ...Array.from(previous['non-production'] ?? new Set<string>()),
        ...Array.from(persistedSelectedScopesByTab['non-production']),
        ...Array.from(requiredSelectedScopeIds),
      ]),
      production: new Set<string>([
        ...Array.from(previous.production ?? new Set<string>()),
        ...Array.from(persistedSelectedScopesByTab.production),
        ...Array.from(requiredSelectedScopeIds),
      ]),
    }));
  }, [persistedSelectedScopesByTab, requiredSelectedScopeIds]);

  const onToggleScope = (tabKey: string, scopeId: string) => {
    setSelectedScopesByTab((previous) => {
      if (pendingScopeIds.has(scopeId)) return previous;
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

  const onToggleVersion = (tabKey: string, scopeIds: string[]) => {
    setSelectedScopesByTab((previous) => {
      const currentSet = previous[tabKey] ?? new Set<string>();
      const nextSet = new Set(currentSet);
      const toggleableScopeIds = scopeIds.filter((scopeId) => !pendingScopeIds.has(scopeId));
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

  const onClearTabScopes = (tabKey: string) => {
    setSelectedScopesByTab((previous) => ({
      ...previous,
      [tabKey]: new Set<string>(pendingScopeIds),
    }));
  };

  useEffect(() => {
    const testPayload = buildSdxRequestPayloadFromSelectedScopes(selectedScopesByTab, scopeMetadataById);
    const serializedSelection = serializeSelectedScopesByTab(selectedScopesByTab);

    if (typeof setFormData === 'function') {
      setFormData((previousFormData: any) => ({
        ...previousFormData,
        sdxServices: {
          ...previousFormData?.sdxServices,
          services: testPayload,
          selectedScopesByTab: serializedSelection,
        },
      }));
    }

    if (typeof onChange === 'function') {
      onChange({
        services: testPayload,
        selectedScopesByTab: serializedSelection,
      });
    }
  }, [selectedScopesByTab, scopeMetadataById, setFormData, onChange]);

  const top = (
    <Tabs
      activeKey={activeTab}
      onChange={(key) => setActiveTab(key)}
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
      style={{ marginTop: '1.5rem', maxWidth: '850px' }}
    />
  );

  return <FieldTemplate {...props} top={top} />;
}
