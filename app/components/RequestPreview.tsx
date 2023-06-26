import { Integration } from 'interfaces/Request';
import styled from 'styled-components';
import { authTypeDisplay } from 'metadata/display';
import { Team } from 'interfaces/team';
import { silverRealmIdpsMap } from '@app/helpers/meta';

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

interface FormattedListProps {
  list?: any[];
  title: string;
  inline?: boolean;
}

const FormattedList = ({ list, title, inline = false }: FormattedListProps) => {
  return (
    <>
      <tr>
        <td>{title}</td>
        {(list?.length === 1 || inline) && (
          <SemiBold>
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
}

function RequestPreview({ children, request, teams = [] }: Props) {
  if (!request) return null;
  const idpDisplay = request.devIdps;
  const isOIDC = request.protocol !== 'saml';

  let teamName = '';
  if (request.usesTeam) {
    teamName =
      teams.find((team) => String(team.id) === String(request.teamId))?.name || (request.team && request.team.name);
  }

  return (
    <>
      <Table>
        <tbody>
          {teamName ? (
            <tr>
              <td>Associated Team:</td>
              <td>
                <SemiBold>{teamName}</SemiBold>
              </td>
            </tr>
          ) : (
            <tr>
              <td>Are you accountable for this project?</td>
              <td>
                <SemiBold>{formatBoolean(request.projectLead)}</SemiBold>
              </td>
            </tr>
          )}
          <tr>
            <td>Client Protocol:</td>
            <td>
              <SemiBold>{isOIDC ? 'OpenID Connect' : 'SAML'}</SemiBold>
            </td>
          </tr>
          {isOIDC && (
            <tr>
              <td>Client Type:</td>
              <td>
                <SemiBold>{request.publicAccess ? 'Public' : 'Confidential'}</SemiBold>
              </td>
            </tr>
          )}
          <tr>
            <td>Usecase:</td>
            <td>
              <SemiBold>{authTypeDisplay[request.authType || 'browser-login']}</SemiBold>
            </td>
          </tr>
          <tr>
            <td>Project Name:</td>
            <td>
              <SemiBold>{request.projectName}</SemiBold>
            </td>
          </tr>
          {request.additionalRoleAttribute && (
            <tr>
              <td>Additional Role Attribute:</td>
              <td>
                <SemiBold>{request.additionalRoleAttribute}</SemiBold>
              </td>
            </tr>
          )}
          <FormattedList list={idpDisplay} title="Identity Providers Required:" inline />
          {request.environments?.includes('dev') && (
            <FormattedList list={request.devValidRedirectUris} title="Dev Redirect URIs:" />
          )}
          {request.environments?.includes('test') && (
            <FormattedList list={request.testValidRedirectUris} title="Test Redirect URIs:" />
          )}
          {request.environments?.includes('prod') && (
            <FormattedList list={request.prodValidRedirectUris} title="Prod Redirect URIs:" />
          )}
          {children}
        </tbody>
      </Table>
    </>
  );
}

export default RequestPreview;
