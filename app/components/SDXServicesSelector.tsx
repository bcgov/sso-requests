import styled from 'styled-components';
import {
  DEFAULT_FONT_FAMILY,
  LINK_COLOR,
  MAIN_NAV_APP_BAR_COLOR,
  SECONDARY_BLUE,
  SECONDARY_FONT_COLOR,
  TABLE_ACTIVE_BLUE,
} from 'styles/theme';
import { SDXResourceServer, SDXService, SDXServiceScope } from '@app/shared/interfaces';

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
    background: transparent;
  }

  &:disabled:hover {
    color: ${SECONDARY_FONT_COLOR};
    text-decoration: none;
    background: transparent;
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

export type ScopeReference = {
  id: string;
  label: string;
};

type SelectedEntry = {
  reference: ScopeReference;
  id: string;
  type: 'scope' | 'service';
};

type ServiceGroup = {
  key: string;
  title: string;
  services: SDXService[];
};

type Props = Readonly<{
  data: SDXResourceServer[];
  scopeReferences: Record<string, ScopeReference>;
  serviceReferences: Record<string, ScopeReference>;
  pendingScopeIds: Set<string>;
  pendingServiceIds: Set<string>;
  selectedScopes: Set<string>;
  selectedServices: Set<string>;
  onToggleScope: (scopeId: string) => void;
  onToggleService: (serviceId: string) => void;
  onToggleVersion: (scopeIds: string[]) => void;
  onRemoveAllSelections: () => void;
}>;

function asArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function getScopeLabel(scope: SDXServiceScope | string): string {
  return typeof scope === 'string' ? scope : scope.label;
}

function getServiceScopes(service: SDXService): Array<SDXServiceScope | string> {
  return asArray<SDXServiceScope | string>(service?.scopes as Array<SDXServiceScope | string> | undefined | null);
}

function getServiceKey(service: SDXService): string {
  return service.name || 'unknown-service';
}

function getResourceServerKey(resourceServer: SDXResourceServer): string {
  return resourceServer.id || resourceServer.name || resourceServer.organization || 'unknown-resource-server';
}

function getScopeId(resourceServerKey: string, serviceKey: string, versionKey: string, scopeKey: string) {
  return [resourceServerKey, serviceKey, versionKey, scopeKey].join('###');
}

function getServiceScopeIds(resourceServer: SDXResourceServer, service: SDXService) {
  const resourceServerKey = getResourceServerKey(resourceServer);
  const serviceKey = getServiceKey(service);
  return getServiceScopes(service).map((scope) =>
    getScopeId(resourceServerKey, serviceKey, service.version, getScopeLabel(scope)),
  );
}

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

function ScopeChipButton({
  id,
  scope,
  ariaLabel,
  disabled = false,
  selected,
  onClick,
}: Readonly<{
  id: string;
  ariaLabel?: string;
  scope: SDXServiceScope;
  disabled?: boolean;
  selected: boolean;
  onClick: () => void;
}>) {
  return (
    <ScopeCheckboxWrapper className="checkbox">
      <label htmlFor={id} title={scope.description}>
        <span>
          <ScopeCheckbox
            id={id}
            type="checkbox"
            aria-label={ariaLabel}
            checked={selected}
            disabled={disabled}
            onChange={onClick}
          />
          <ScopeLabelText>{scope.label}</ScopeLabelText>
        </span>
      </label>
    </ScopeCheckboxWrapper>
  );
}

export default function SDXServicesSelector({
  data,
  scopeReferences,
  serviceReferences,
  pendingScopeIds,
  pendingServiceIds,
  selectedScopes,
  selectedServices,
  onToggleScope,
  onToggleService,
  onToggleVersion,
  onRemoveAllSelections,
}: Props) {
  const selectedEntries = [
    ...Array.from(selectedScopes).map((id) => ({ reference: scopeReferences[id], id, type: 'scope' as const })),
    ...Array.from(selectedServices).map((id) => ({ reference: serviceReferences[id], id, type: 'service' as const })),
  ]
    .filter((entry): entry is SelectedEntry => !!entry.reference)
    .sort((a, b) => a.reference.label.localeCompare(b.reference.label));

  return (
    <>
      <SelectedScopesSection>
        <SelectedScopesHeader>
          <SelectedScopesTitle>Selected Access</SelectedScopesTitle>
          <SelectedScopesHeaderActions>
            <SelectedScopesCount>{selectedEntries.length} selected</SelectedScopesCount>
            <ClearAllButton type="button" disabled={selectedEntries.length === 0} onClick={onRemoveAllSelections}>
              Remove all
            </ClearAllButton>
          </SelectedScopesHeaderActions>
        </SelectedScopesHeader>

        {selectedEntries.length === 0 && <EmptyScopesText>No services or scopes selected yet.</EmptyScopesText>}

        {selectedEntries.length > 0 && (
          <SelectedScopesList>
            {selectedEntries.map(({ reference, id, type }) => (
              <SelectedScopeTag key={id}>
                <SelectedScopeLabel>{reference.label}</SelectedScopeLabel>
                <RemoveScopeButton
                  type="button"
                  aria-label={`Remove ${reference.label}`}
                  disabled={type === 'scope' ? pendingScopeIds.has(id) : pendingServiceIds.has(id)}
                  onClick={() => (type === 'scope' ? onToggleScope(id) : onToggleService(id))}
                >
                  x
                </RemoveScopeButton>
              </SelectedScopeTag>
            ))}
          </SelectedScopesList>
        )}
      </SelectedScopesSection>

      {asArray(data).map((resourceServer) => {
        const organizationScopeIds = asArray(resourceServer?.services).flatMap((service) =>
          getServiceScopeIds(resourceServer, service),
        );
        const organizationServiceIds = asArray(resourceServer?.services)
          .filter((service) => getServiceScopes(service).length === 0)
          .map((service) =>
            [getResourceServerKey(resourceServer), getServiceKey(service), service.version].join('###'),
          );
        const selectedInOrganization =
          organizationScopeIds.filter((scopeId) => selectedScopes.has(scopeId)).length +
          organizationServiceIds.filter((serviceId) => selectedServices.has(serviceId)).length;

        return (
          <OrganizationSection key={getResourceServerKey(resourceServer)}>
            <OrganizationHeader>
              <OrganizationTitle>
                {resourceServer.organization || resourceServer.name || resourceServer.id}
              </OrganizationTitle>
              <OrganizationSummary>{selectedInOrganization} selected</OrganizationSummary>
            </OrganizationHeader>

            <SDXServiceGrid>
              {getServiceGroups(resourceServer).map((group) => {
                const apiScopeIds = group.services.flatMap((service) => getServiceScopeIds(resourceServer, service));
                const apiServiceIds = group.services
                  .filter((service) => getServiceScopes(service).length === 0)
                  .map((service) =>
                    [getResourceServerKey(resourceServer), getServiceKey(service), service.version].join('###'),
                  );
                const selectedInApi = apiScopeIds.filter((scopeId) => selectedScopes.has(scopeId)).length;
                const selectedServicesInApi = apiServiceIds.filter((serviceId) => selectedServices.has(serviceId)).length;
                const apiSummary =
                  apiScopeIds.length === 0
                    ? `${selectedServicesInApi} of ${apiServiceIds.length} services`
                    : apiServiceIds.length > 0
                      ? `${selectedInApi} scopes, ${selectedServicesInApi} services`
                      : `${selectedInApi} of ${apiScopeIds.length} scopes`;

                return (
                  <SDXServiceCard key={group.key}>
                    <SDXServiceHeader>
                      <SDXServiceName>{group.title}</SDXServiceName>
                      <ApiSummary>{apiSummary}</ApiSummary>
                    </SDXServiceHeader>

                    <VersionsGrid>
                      {group.services.map((service) => {
                        const versionScopeIds = getServiceScopeIds(resourceServer, service);
                        const serviceId = [
                          getResourceServerKey(resourceServer),
                          getServiceKey(service),
                          service.version,
                        ].join('###');
                        const toggleableVersionScopeIds = versionScopeIds.filter(
                          (scopeId) => !pendingScopeIds.has(scopeId),
                        );
                        const allSelected = toggleableVersionScopeIds.every((scopeId) => selectedScopes.has(scopeId));

                        return (
                          <VersionRow key={service.version}>
                            <VersionMeta>
                              <VersionLabel>{service.version}</VersionLabel>
                              {versionScopeIds.length > 0 && (
                                <LinkButton
                                  type="button"
                                  disabled={toggleableVersionScopeIds.length === 0}
                                  onClick={() => onToggleVersion(versionScopeIds)}
                                >
                                  {allSelected ? 'Clear all scopes' : 'Select all scopes'}
                                </LinkButton>
                              )}
                            </VersionMeta>

                            <ScopeGrid>
                              {versionScopeIds.length === 0 && (
                                <ScopeChipButton
                                  id={`service-${resourceServer.environment}-${serviceId}`}
                                  ariaLabel={`Request access to ${service.title || service.name} ${service.version}`}
                                  scope={{
                                    label: 'Request access',
                                    description: 'This service does not require an OAuth scope.',
                                  }}
                                  disabled={pendingServiceIds.has(serviceId)}
                                  selected={selectedServices.has(serviceId)}
                                  onClick={() => onToggleService(serviceId)}
                                />
                              )}
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
                      })}
                    </VersionsGrid>
                  </SDXServiceCard>
                );
              })}
            </SDXServiceGrid>
          </OrganizationSection>
        );
      })}
    </>
  );
}
