import { SDXServiceScope, SDXResourceServer } from '@app/shared/interfaces';
import styled from 'styled-components';

const SdxTable = styled.table`
  width: 100%;
  margin: 8px 0 4px;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid;
  overflow: hidden;
  font-size: 14px;

  th {
    padding: 8px 10px;
    border-bottom: 1px solid;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0;
    text-align: left;
    text-transform: uppercase;
  }

  td {
    padding: 9px 10px;
    border-bottom: 1px solid;
    vertical-align: middle;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }
`;

const ScopeList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const Scope = styled.span`
  padding: 2px 6px;
  border-radius: 4px;
  background: #e8f4ec;
  color: #21643a;
  font-size: 12px;
  line-height: 1.3;
`;

const getScopeLabel = (scope: SDXServiceScope | string) => (typeof scope === 'string' ? scope : scope.label);

const isProductionSdxEnvironment = (environment: string) => ['apstest', 'bc'].includes(environment.toLowerCase());

interface SdxServicesTableProps {
  environment: 'non-production' | 'production';
  resourceServers: SDXResourceServer[];
}

const SdxAccessPreview = ({ environment, resourceServers }: SdxServicesTableProps) => {
  const isProduction = environment === 'production';
  const selectedServices = resourceServers.flatMap((resourceServer) =>
    resourceServer.services
      .filter((service) => service.scopes.length > 0)
      .map((service) => ({ resourceServer, service })),
  );

  const environmentSelectedServices = selectedServices.filter(
    ({ resourceServer }) => isProductionSdxEnvironment(resourceServer.environment) === isProduction,
  );

  if (environmentSelectedServices.length === 0) return null;

  return (
    <tr>
      <td colSpan={2}>
        <p>{isProduction ? 'Production' : 'Non-production'} SDX Access:</p>
        <SdxTable data-testid={`sdx-services-${environment}`}>
          <thead>
            <tr>
              <th>Organization</th>
              <th>Service</th>
              <th>Version</th>
              <th>Scopes</th>
            </tr>
          </thead>
          <tbody>
            {environmentSelectedServices.map(({ resourceServer, service }) => (
              <tr key={`${resourceServer.id}-${service.name}-${service.version}`}>
                <td>{resourceServer.organization || resourceServer.name}</td>
                <td>{service.title || service.name}</td>
                <td>{service.version}</td>
                <td>
                  <ScopeList>
                    {service.scopes.map((scope, scopeIndex) => (
                      <Scope key={`${getScopeLabel(scope)}-${scopeIndex}`}>{getScopeLabel(scope)}</Scope>
                    ))}
                  </ScopeList>
                </td>
              </tr>
            ))}
          </tbody>
        </SdxTable>
      </td>
    </tr>
  );
};

export default SdxAccessPreview;
