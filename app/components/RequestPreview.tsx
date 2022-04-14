import { Request } from 'interfaces/Request';
import { realmToIDP } from 'utils/helpers';
import styled from 'styled-components';

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
  request: Request;
  hasBceid: boolean;
  children?: React.ReactNode;
}

const hasUris = (uris: string[] | undefined) => {
  if (!uris) return false;
  // URI arrays are initialized with an empty string to prompt an empty input in the rjsf array
  if (uris.length === 1 && uris[0] === '') return false;
  return true;
};

function RequestPreview({ children, request }: Props) {
  if (!request) return null;
  const serviceType = request.serviceType === 'gold' ? 'gold' : 'silver';
  const idpDisplay = serviceType === 'gold' ? request.devIdps : realmToIDP(request?.realm);
  return (
    <>
      <Table>
        <tbody>
          {request?.team && (
            <tr>
              <td>Associated Team:</td>
              <td>
                <SemiBold>{request.team.name}</SemiBold>
              </td>
            </tr>
          )}
          <tr>
            <td>Are you accountable for this project?</td>
            <td>
              <SemiBold>{formatBoolean(request?.projectLead)}</SemiBold>
            </td>
          </tr>
          <tr>
            <td>Client Type:</td>
            <td>
              <SemiBold>{request?.publicAccess ? 'Public' : 'Confidential'}</SemiBold>
            </td>
          </tr>
          <tr>
            <td>Project Name:</td>
            <td>
              <SemiBold>{request?.projectName}</SemiBold>
            </td>
          </tr>
          <FormattedList list={idpDisplay} title="Identity Providers Required:" inline />
          {hasUris(request?.devValidRedirectUris) && (
            <FormattedList list={request?.devValidRedirectUris} title="Dev Redirect URIs:" />
          )}
          {hasUris(request?.testValidRedirectUris) && (
            <FormattedList list={request?.testValidRedirectUris} title="Test Redirect URIs:" />
          )}
          {hasUris(request?.prodValidRedirectUris) && (
            <FormattedList list={request?.prodValidRedirectUris} title="Prod Redirect URIs:" />
          )}
          {children}
        </tbody>
      </Table>
    </>
  );
}

export default RequestPreview;
