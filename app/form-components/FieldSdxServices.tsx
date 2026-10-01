import { Tabs } from '@bcgov-sso/common-react-components';
import FieldTemplate from './FieldTemplate';
import { FieldTemplateProps } from '@rjsf/utils/lib/types';
import styled from 'styled-components';
import { useEffect, useMemo, useState } from 'react';
import { FORM_TOP_SPACING } from 'styles/theme';
import {
  SDXAllowedAccessForClient,
  SDXAccessRequest,
  SDXResourceServer,
  SDXService,
  SDXServiceScope,
} from '@app/shared/interfaces';
import SDXServicesSelector, { ScopeReference } from '@app/components/SDXServicesSelector';
import { SDX_ENVIRONMENTS } from '@app/utils/constants';

const TabWrapper = styled.div<{ short?: boolean }>`
  padding-top: ${FORM_TOP_SPACING};
  ${(props) => (props.short ? 'max-width: 800px;' : '')}
`;

export type EnvironmentKey = 'non-production' | 'production';
export type SelectedScopesByTab = Record<EnvironmentKey, Set<string>>;
export type SelectedServicesByTab = Record<EnvironmentKey, Set<string>>;

type ClientScopeState = {
  approvedScopeIds: SelectedScopesByTab;
  pendingScopeIds: SelectedScopesByTab;
};

type SdxServicesPayload = {
  resourceServers: SDXResourceServer[];
};

/** Safely converts nullable values to arrays to avoid repeated null checks. */
function asArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

const ENVIRONMENT_VALUES =
  process.env.NEXT_PUBLIC_APP_ENV === 'production' ? SDX_ENVIRONMENTS['production'] : SDX_ENVIRONMENTS['sandbox'];

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
const SCOPE_ID_SEPARATOR = '###';

/** Creates a stable synthetic id for an individual scope. */
export function getScopeId(resourceServerKey: string, serviceKey: string, versionKey: string, scopeKey: string) {
  return [resourceServerKey, serviceKey, versionKey, scopeKey].join(SCOPE_ID_SEPARATOR);
}

/** Creates a stable id for selecting a service that declares no scopes. */
export function getServiceId(resourceServerKey: string, serviceKey: string, versionKey: string) {
  return [resourceServerKey, serviceKey, versionKey].join(SCOPE_ID_SEPARATOR);
}

/** Strips the resource server/service/version prefix back to the raw scope label. */
function getScopeLabelFromScopeId(scopeId: string): string {
  const segments = scopeId.split(SCOPE_ID_SEPARATOR);
  return segments[segments.length - 1];
}

/** Builds a normalized matcher key used for approved/pending matching. */
function getScopeMatcherKey(resourceServerKey: string, apiKey: string, versionKey: string, scopeKey: string) {
  return [resourceServerKey, apiKey, versionKey, scopeKey].join(SCOPE_ID_SEPARATOR).toLowerCase();
}

/** Looser matcher key, ignoring version, still scoped to the same resource server and service. */
function getServiceScopeKey(resourceServerKey: string, apiKey: string, scopeKey: string) {
  return [resourceServerKey, apiKey, scopeKey].join(SCOPE_ID_SEPARATOR).toLowerCase();
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

/** Builds labels for selected services that do not declare OAuth scopes. */
function getServiceReferences(data: SDXResourceServer[] = []) {
  const references: Record<string, ScopeReference> = {};

  asArray(data).forEach((resourceServer) => {
    const resourceServerKey = getResourceServerKey(resourceServer);
    asArray(resourceServer?.services).forEach((service) => {
      if (getServiceScopes(service).length > 0) return;
      const serviceId = getServiceId(resourceServerKey, getServiceKey(service), service.version);
      references[serviceId] = {
        id: serviceId,
        label: `${service.title || service.name} ${service.version}`.trim(),
      };
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

  // Matcher keys are grouped by environment and resource server so allowed access never leaks
  // into a different organization, service or tab that happens to share a scope label.
  const collectKeysByEnvironment = (allowed: SDXAllowedAccessForClient | null) => {
    const matcherKeys: Record<EnvironmentKey, Set<string>> = {
      'non-production': new Set<string>(),
      production: new Set<string>(),
    };
    const serviceScopeKeys: Record<EnvironmentKey, Set<string>> = {
      'non-production': new Set<string>(),
      production: new Set<string>(),
    };

    asArray(allowed?.resourceServers).forEach((resourceServer) => {
      const environment = normalizeEnvironment(resourceServer?.environment);
      const resourceServerKey = getResourceServerKey(resourceServer);
      asArray(resourceServer?.services).forEach((service) => {
        const serviceKey = getServiceKey(service);
        getServiceScopes(service).forEach((scope) => {
          const scopeLabel = getScopeLabel(scope);
          if (service.version) {
            matcherKeys[environment].add(getScopeMatcherKey(resourceServerKey, serviceKey, service.version, scopeLabel));
          } else {
            // Accept pre-APS-4988 responses that did not include a service version.
            serviceScopeKeys[environment].add(getServiceScopeKey(resourceServerKey, serviceKey, scopeLabel));
          }
        });
      });
    });

    return { matcherKeys, serviceScopeKeys };
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
        const matcherKey = getScopeMatcherKey(resourceServerKey, serviceKey, service.version, scopeLabel);
        const serviceScopeKey = getServiceScopeKey(resourceServerKey, serviceKey, scopeLabel);

        if (
          pendingKeys.matcherKeys[environment].has(matcherKey) ||
          pendingKeys.serviceScopeKeys[environment].has(serviceScopeKey)
        )
          pendingScopeIds[environment].add(scopeId);
        if (
          approvedKeys.matcherKeys[environment].has(matcherKey) ||
          approvedKeys.serviceScopeKeys[environment].has(serviceScopeKey)
        )
          approvedScopeIds[environment].add(scopeId);
      });
    });
  });

  return { approvedScopeIds, pendingScopeIds };
}

/** Computes approved and pending selections for services that declare no scopes. */
export function getClientServiceState(
  approved: SDXAllowedAccessForClient | null,
  pending: SDXAllowedAccessForClient | null,
  sdxServices: SDXResourceServer[] = [],
) {
  const emptySelection = (): SelectedServicesByTab => ({
    'non-production': new Set<string>(),
    production: new Set<string>(),
  });
  const approvedServiceIds = emptySelection();
  const pendingServiceIds = emptySelection();

  const collectAllowedServiceKeys = (allowed: SDXAllowedAccessForClient | null) => {
    const exact: Record<EnvironmentKey, Set<string>> = {
      'non-production': new Set<string>(),
      production: new Set<string>(),
    };
    const versionAgnostic: Record<EnvironmentKey, Set<string>> = {
      'non-production': new Set<string>(),
      production: new Set<string>(),
    };
    asArray(allowed?.resourceServers).forEach((resourceServer) => {
      const environment = normalizeEnvironment(resourceServer.environment);
      const resourceServerKey = getResourceServerKey(resourceServer);
      asArray(resourceServer.services).forEach((service) => {
        if (getServiceScopes(service).length > 0) return;
        const serviceKey = getServiceKey(service);
        if (service.version) {
          exact[environment].add(getServiceId(resourceServerKey, serviceKey, service.version).toLowerCase());
        } else {
          // Accept pre-APS-4988 responses that did not include a service version.
          versionAgnostic[environment].add(
            [resourceServerKey, serviceKey].join(SCOPE_ID_SEPARATOR).toLowerCase(),
          );
        }
      });
    });
    return { exact, versionAgnostic };
  };

  const approvedKeys = collectAllowedServiceKeys(approved);
  const pendingKeys = collectAllowedServiceKeys(pending);

  asArray(sdxServices).forEach((resourceServer) => {
    const environment = normalizeEnvironment(resourceServer.environment);
    const resourceServerKey = getResourceServerKey(resourceServer);
    asArray(resourceServer.services).forEach((service) => {
      if (getServiceScopes(service).length > 0) return;
      const serviceKey = getServiceKey(service);
      const serviceId = getServiceId(resourceServerKey, serviceKey, service.version);
      const exactKey = serviceId.toLowerCase();
      const versionAgnosticKey = [resourceServerKey, serviceKey].join(SCOPE_ID_SEPARATOR).toLowerCase();

      if (
        approvedKeys.exact[environment].has(exactKey) ||
        approvedKeys.versionAgnostic[environment].has(versionAgnosticKey)
      ) {
        approvedServiceIds[environment].add(serviceId);
      }
      if (
        pendingKeys.exact[environment].has(exactKey) ||
        pendingKeys.versionAgnostic[environment].has(versionAgnosticKey)
      ) {
        pendingServiceIds[environment].add(serviceId);
      }
    });
  });

  return { approvedServiceIds, pendingServiceIds };
}

/**
 * Returns only the selected portions of resource servers for a target
 * environment, preserving the same shape expected by the backend.
 */
function getSelectedResourceServers(
  selectedScopeIds: Set<string>,
  selectedServiceIds: Set<string>,
  sdxServices: SDXResourceServer[],
  environment: EnvironmentKey,
): SDXResourceServer[] {
  const selectedResourceServers: SDXResourceServer[] = [];

  getResourceServersForEnvironment(sdxServices, environment).forEach((resourceServer) => {
    const resourceServerKey = getResourceServerKey(resourceServer);

    const selectedServices = asArray(resourceServer.services)
      .map((service) => {
        const serviceKey = getServiceKey(service);

        const serviceScopes = getServiceScopes(service);
        const selectedScopes = serviceScopes
          .map((scope) => getScopeId(resourceServerKey, serviceKey, service.version, getScopeLabel(scope)))
          .filter((scopeId) => selectedScopeIds.has(scopeId))
          .map(getScopeLabelFromScopeId);
        const scopeFreeServiceSelected =
          serviceScopes.length === 0 &&
          selectedServiceIds.has(getServiceId(resourceServerKey, serviceKey, service.version));

        if (selectedScopes.length === 0 && !scopeFreeServiceSelected) return null;

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
  selectedServicesByTab: SelectedServicesByTab = {
    'non-production': new Set<string>(),
    production: new Set<string>(),
  },
): SDXAccessRequest['resourceServers'] {
  const nonProductionResourceServers = getSelectedResourceServers(
    selectedScopesByTab['non-production'] ?? new Set<string>(),
    selectedServicesByTab['non-production'] ?? new Set<string>(),
    sdxServices,
    'non-production',
  );
  const productionResourceServers = getSelectedResourceServers(
    selectedScopesByTab.production ?? new Set<string>(),
    selectedServicesByTab.production ?? new Set<string>(),
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

/** Flattens selected services that declare no scopes to stable ids. */
function getSelectedServiceIdsFromResourceServers(resourceServers: SDXResourceServer[] | undefined): string[] {
  const serviceIds: string[] = [];

  asArray(resourceServers).forEach((resourceServer) => {
    const resourceServerKey = getResourceServerKey(resourceServer);
    asArray(resourceServer.services).forEach((service) => {
      if (getServiceScopes(service).length === 0) {
        serviceIds.push(getServiceId(resourceServerKey, getServiceKey(service), service.version));
      }
    });
  });

  return serviceIds;
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

export function restoreSelectedServicesByTab(
  serialized: unknown,
  requiredServiceIds: SelectedServicesByTab,
  defaultServiceIds: SelectedServicesByTab,
): SelectedServicesByTab {
  const fallback = createTabSelection(requiredServiceIds, defaultServiceIds);
  if (!serialized || typeof serialized !== 'object') return fallback;

  const parsed = serialized as Record<string, unknown>;
  const selectedByTab: SelectedServicesByTab = {
    'non-production': new Set<string>(),
    production: new Set<string>(),
  };

  const collect = (resourceServers: SDXResourceServer[]) => {
    asArray(resourceServers).forEach((resourceServer) => {
      const environment = normalizeEnvironment(resourceServer.environment);
      getSelectedServiceIdsFromResourceServers([resourceServer]).forEach((serviceId) =>
        selectedByTab[environment].add(serviceId),
      );
    });
  };

  if (Array.isArray(parsed.resourceServers)) {
    collect(parsed.resourceServers as SDXResourceServer[]);
  } else if (Array.isArray(serialized)) {
    collect(serialized as SDXResourceServer[]);
  } else if (Array.isArray(parsed['non-production']) || Array.isArray(parsed.production)) {
    // The legacy id-only shape represented scopes only, so it cannot contain a scope-free service selection.
    return fallback;
  } else {
    const nonProductionRequest = parsed['non-production'] as SDXAccessRequest | undefined;
    const productionRequest = parsed.production as SDXAccessRequest | undefined;
    collect(nonProductionRequest?.resourceServers || []);
    collect(productionRequest?.resourceServers || []);
  }

  return createTabSelection(requiredServiceIds, selectedByTab);
}

const tabItems = (
  sdxServices: SDXResourceServer[],
  scopeReferences: Record<string, ScopeReference>,
  serviceReferences: Record<string, ScopeReference>,
  pendingScopeIds: SelectedScopesByTab,
  pendingServiceIds: SelectedServicesByTab,
  selectedScopesByTab: SelectedScopesByTab,
  selectedServicesByTab: SelectedServicesByTab,
  onToggleScope: (tabKey: EnvironmentKey, scopeId: string) => void,
  onToggleService: (tabKey: EnvironmentKey, serviceId: string) => void,
  onToggleVersion: (tabKey: EnvironmentKey, scopeIds: string[]) => void,
  onClearTabSelections: (tabKey: EnvironmentKey) => void,
) => [
  {
    key: 'non-production',
    label: `Non-Production (${(selectedScopesByTab['non-production']?.size ?? 0) + (selectedServicesByTab['non-production']?.size ?? 0)})`,
    children: (
      <TabWrapper>
        <SDXServicesSelector
          scopeReferences={scopeReferences}
          serviceReferences={serviceReferences}
          pendingScopeIds={pendingScopeIds['non-production']}
          pendingServiceIds={pendingServiceIds['non-production']}
          selectedScopes={selectedScopesByTab['non-production'] ?? new Set<string>()}
          selectedServices={selectedServicesByTab['non-production'] ?? new Set<string>()}
          data={getResourceServersForEnvironment(sdxServices, 'non-production')}
          onToggleScope={(scopeId) => onToggleScope('non-production', scopeId)}
          onToggleService={(serviceId) => onToggleService('non-production', serviceId)}
          onToggleVersion={(scopeIds) => onToggleVersion('non-production', scopeIds)}
          onRemoveAllSelections={() => onClearTabSelections('non-production')}
        />
      </TabWrapper>
    ),
  },
  {
    key: 'production',
    label: `Production (${(selectedScopesByTab.production?.size ?? 0) + (selectedServicesByTab.production?.size ?? 0)})`,
    children: (
      <TabWrapper>
        <SDXServicesSelector
          scopeReferences={scopeReferences}
          serviceReferences={serviceReferences}
          pendingScopeIds={pendingScopeIds.production}
          pendingServiceIds={pendingServiceIds.production}
          selectedScopes={selectedScopesByTab.production ?? new Set<string>()}
          selectedServices={selectedServicesByTab.production ?? new Set<string>()}
          data={getResourceServersForEnvironment(sdxServices, 'production')}
          onToggleScope={(scopeId) => onToggleScope('production', scopeId)}
          onToggleService={(serviceId) => onToggleService('production', serviceId)}
          onToggleVersion={(scopeIds) => onToggleVersion('production', scopeIds)}
          onRemoveAllSelections={() => onClearTabSelections('production')}
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
  const serviceReferences = useMemo(() => getServiceReferences(normalizedSdxServices), [normalizedSdxServices]);
  const { approvedScopeIds, pendingScopeIds } = useMemo(
    () =>
      getClientScopeState(
        normalizedApprovedClientSdxServices,
        normalizedPendingClientSdxServices,
        normalizedSdxServices,
      ),
    [normalizedApprovedClientSdxServices, normalizedPendingClientSdxServices, normalizedSdxServices],
  );
  const { approvedServiceIds, pendingServiceIds } = useMemo(
    () =>
      getClientServiceState(
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
  const defaultSelectedServiceIds = useMemo<SelectedServicesByTab>(
    () => ({
      'non-production': new Set<string>([
        ...Array.from(approvedServiceIds['non-production']),
        ...Array.from(pendingServiceIds['non-production']),
      ]),
      production: new Set<string>([
        ...Array.from(approvedServiceIds.production),
        ...Array.from(pendingServiceIds.production),
      ]),
    }),
    [approvedServiceIds, pendingServiceIds],
  );
  const requiredSelectedServiceIds = useMemo<SelectedServicesByTab>(
    () => ({
      'non-production': new Set<string>(pendingServiceIds['non-production']),
      production: new Set<string>(pendingServiceIds.production),
    }),
    [pendingServiceIds],
  );
  const persistedSelectedServicesByTab = useMemo(
    () =>
      restoreSelectedServicesByTab(
        formData?.sdxServices,
        requiredSelectedServiceIds,
        defaultSelectedServiceIds,
      ),
    [formData?.sdxServices, requiredSelectedServiceIds, defaultSelectedServiceIds],
  );
  const [activeTab, setActiveTab] = useState<EnvironmentKey>('non-production');

  const [selectedScopesByTab, setSelectedScopesByTab] = useState<SelectedScopesByTab>(() => ({
    'non-production': new Set(persistedSelectedScopesByTab['non-production']),
    production: new Set(persistedSelectedScopesByTab.production),
  }));
  const [selectedServicesByTab, setSelectedServicesByTab] = useState<SelectedServicesByTab>(() => ({
    'non-production': new Set(persistedSelectedServicesByTab['non-production']),
    production: new Set(persistedSelectedServicesByTab.production),
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

  useEffect(() => {
    setSelectedServicesByTab((previous) => ({
      'non-production': new Set<string>([
        ...Array.from(previous['non-production'] ?? new Set<string>()),
        ...Array.from(persistedSelectedServicesByTab['non-production']),
        ...Array.from(requiredSelectedServiceIds['non-production']),
      ]),
      production: new Set<string>([
        ...Array.from(previous.production ?? new Set<string>()),
        ...Array.from(persistedSelectedServicesByTab.production),
        ...Array.from(requiredSelectedServiceIds.production),
      ]),
    }));
  }, [persistedSelectedServicesByTab, requiredSelectedServiceIds]);

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

  const onToggleService = (tabKey: EnvironmentKey, serviceId: string) => {
    setSelectedServicesByTab((previous) => {
      if (pendingServiceIds[tabKey].has(serviceId)) return previous;
      const nextSet = new Set(previous[tabKey] ?? new Set<string>());
      if (nextSet.has(serviceId)) nextSet.delete(serviceId);
      else nextSet.add(serviceId);
      return { ...previous, [tabKey]: nextSet };
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

  const onClearTabSelections = (tabKey: EnvironmentKey) => {
    setSelectedScopesByTab((previous) => ({
      ...previous,
      [tabKey]: new Set<string>(pendingScopeIds[tabKey]),
    }));
    setSelectedServicesByTab((previous) => ({
      ...previous,
      [tabKey]: new Set<string>(pendingServiceIds[tabKey]),
    }));
  };

  useEffect(() => {
    const selectedResourceServers = buildSdxRequestPayloadFromSelectedScopes(
      selectedScopesByTab,
      normalizedSdxServices,
      selectedServicesByTab,
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
  }, [selectedScopesByTab, selectedServicesByTab, normalizedSdxServices, formData?.id, setFormData, onChange]);

  const top = (
    <Tabs
      activeKey={activeTab}
      onChange={(key) => setActiveTab(key as EnvironmentKey)}
      items={tabItems(
        normalizedSdxServices,
        scopeReferences,
        serviceReferences,
        pendingScopeIds,
        pendingServiceIds,
        selectedScopesByTab,
        selectedServicesByTab,
        onToggleScope,
        onToggleService,
        onToggleVersion,
        onClearTabSelections,
      )}
      tabBarGutter={30}
      style={{ maxWidth: '850px' }}
    />
  );

  return <FieldTemplate {...props} top={top} />;
}
