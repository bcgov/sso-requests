import { Integration, PrimaryEndUser } from 'interfaces/Request';
import styled from 'styled-components';
import { authTypeDisplay } from 'metadata/display';
import { Team } from 'interfaces/team';
import { idpMap } from 'helpers/meta';
import { usesBcServicesCard } from '@app/helpers/integration';

const Table = styled.table`
  font-size: unset;
  & tr {
    display: flex;
    margin-bottom: 5px;
    & > td {
      border: none;
      padding: 0 5px 0 0;
    }
  }
`;

const SemiBold = styled.span`
  font-weight: 600;
`;

const StyledUl = styled.ul`
  list-style: none;
  margin: 0;
  & li {
    margin: 0;
  }
`;

const formatBoolean = (value?: boolean) => {
  if (value === undefined) return '';
  return value ? 'Yes' : 'No';
};

const formatPrimaryUsers = (primaryUsers?: PrimaryEndUser[], otherDetails?: string): string[] | undefined => {
  return primaryUsers?.map((user) => {
    switch (user) {
      case 'livingInBC':
        return 'People living in BC';
      case 'businessInBC':
        return 'People doing business/travel in BC';
      case 'bcGovEmployees':
        return 'BC Gov Employees';
      case 'other':
        return `Other: ${otherDetails ?? ''}`;
      default:
        return '';
    }
  });
};

interface FormattedListProps {
  list?: any[];
  title: string;
  inline?: boolean;
  testid: string;
}

const FormattedList = ({ list, title, inline = false, testid }: FormattedListProps) => {
  return (
    <>
      <tr>
        <td>{title}</td>
        {(list?.length === 1 || inline) && (
          <SemiBold data-testid={testid}>
            {list?.map((item, i) => (
              <span key={item}>
                {item}
                {i !== list.length - 1 && ', '}{' '}
              </span>
            ))}
          </SemiBold>
        )}
      </tr>
      {!inline && (list?.length || 0) > 1 && (
        <tr>
          <td>
            <SemiBold>
              <StyledUl>
                {list?.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </StyledUl>
            </SemiBold>
          </td>
        </tr>
      )}
    </>
  );
};

interface Props {
  request: Integration;
  teams?: Team[];
  children?: React.ReactNode;
  privacyZone?: string;
}

function RequestPreview({ children, request, teams = [], privacyZone }: Readonly<Props>) {
  if (!request) return null;
  const idpDisplay = request.devIdps ?? [];
  const isOIDC = request.protocol !== 'saml';
  const fullIdpDisplay = idpDisplay.map((name: any) => idpMap[name]);
  const hasBCSC = usesBcServicesCard(request);

  let teamName = '';
  if (request.usesTeam) {
    teamName =
      teams.find((team) => String(team.id) === String(request.teamId))?.name || (request.team && request.team.name);
  }
  const primaryEndUsersFormatted = formatPrimaryUsers(request.primaryEndUsers, request.primaryEndUsersOther);

  return (
    <>
      <Table>
        <tbody>
          {teamName ? (
            <tr>
              <td>Associated Team:</td>
              <td>
                <SemiBold data-testid="associated-team">{teamName}</SemiBold>
              </td>
            </tr>
          ) : (
            <tr>
              <td>Are you accountable for this project?</td>
              <td>
                <SemiBold data-testid="you-accountable">{formatBoolean(request.projectLead)}</SemiBold>
              </td>
            </tr>
          )}
          <tr>
            <td>Client Protocol:</td>
            <td>
              <SemiBold data-testid="client-protocol">{isOIDC ? 'OpenID Connect' : 'SAML'}</SemiBold>
            </td>
          </tr>
          {isOIDC && (
            <tr>
              <td>Client Type:</td>
              <td>
                <SemiBold data-testid="client-type-team">{request.publicAccess ? 'Public' : 'Confidential'}</SemiBold>
              </td>
            </tr>
          )}
          <tr>
            <td>Usecase:</td>
            <td>
              <SemiBold data-testid="use-case">{authTypeDisplay[request.authType || 'browser-login']}</SemiBold>
            </td>
          </tr>
          <tr>
            <td>Project Name:</td>
            <td>
              <SemiBold data-testid="project-name">{request.projectName}</SemiBold>
            </td>
          </tr>
          {primaryEndUsersFormatted && (
            <tr>
              <td>Primary End Users:</td>
              <td>
                <SemiBold data-testid="project-name">{primaryEndUsersFormatted.join(', ')}</SemiBold>
              </td>
            </tr>
          )}
          {request.additionalRoleAttribute && (
            <tr>
              <td>Additional Role Attribute:</td>
              <td>
                <SemiBold data-testid="add-role-attrib">{request.additionalRoleAttribute}</SemiBold>
              </td>
            </tr>
          )}
          <FormattedList list={fullIdpDisplay} title="Identity Providers Required:" inline testid="idp-required" />
          {hasBCSC && (
            <tr>
              <td>Privacy Zone:</td>
              <td>
                <SemiBold>{privacyZone || 'Unavailable'}</SemiBold>
              </td>
            </tr>
          )}
          {request.environments?.includes('dev') && (
            <FormattedList list={request.devValidRedirectUris} title="Dev Redirect URIs:" testid="dev-uri" />
          )}
          {request.environments?.includes('test') && (
            <FormattedList list={request.testValidRedirectUris} title="Test Redirect URIs:" testid="test-uri" />
          )}
          {request.environments?.includes('prod') && (
            <FormattedList list={request.prodValidRedirectUris} title="Prod Redirect URIs:" testid="prod-uri" />
          )}
          {children}
        </tbody>
      </Table>
    </>
  );
}

export default RequestPreview;
