import { Request } from 'interfaces/Request';
import { realmToIDP } from 'utils/helpers';
import styled from 'styled-components';
import { FORM_TOP_SPACING } from 'styles/theme';

const Table = styled.table`
  margin-top: ${FORM_TOP_SPACING};
  font-size: unset;
  & tr {
    display: flex;
    margin-top: 5px;
    margin-bottom: 5px;
    & > td {
      border: none;
      padding: 0 5px 0 0;
    }
  }
`;

const Divider = styled.hr`
  margin: 20px 0;
  max-width: 500px;
  background-color: #e3e3e3;
  height: 2px !important;
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

const Header = styled.h2`
  margin-top: 10px;
`;

const formatBoolean = (value?: boolean) => {
  if (value === undefined) return '';
  return value ? 'Yes' : 'No';
};

interface FormattedListProps {
  list: any[];
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
      {!inline && list?.length > 1 && (
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
  isAdmin?: boolean;
}

const hasUris = (uris: string[] | undefined) => {
  if (!uris) return false;
  // URI arrays are initialized with an empty string to prompt an empty input in the rjsf array
  if (uris.length === 1 && uris[0] === '') return false;
  return true;
};

function RequestPreview({ request, hasBceid, isAdmin = false }: Props) {
  if (!request) return null;

  return (
    <>
      {hasBceid && !isAdmin && (
        <Header>Your Dev and/or Test environments are provided by the SSO Pathfinder team </Header>
      )}
      <Table>
        <tbody>
          <tr>
            <td>Are you the product owner or project admin/team lead?</td>
            <td>
              <SemiBold>{formatBoolean(request?.projectLead)}</SemiBold>
            </td>
          </tr>
          <tr>
            <td>Have you requested an SSO access before?</td>
            <td>
              <SemiBold>{formatBoolean(request?.newToSso)}</SemiBold>
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
          <tr>
            <td>Default email address:</td>
            <td>
              <SemiBold>{request?.preferredEmail}</SemiBold>
            </td>
          </tr>
          <FormattedList list={request?.additionalEmails} title="Additional Emails:" />
          <FormattedList list={realmToIDP(request?.realm)} title="Identity Providers Required:" inline />
          {hasUris(request?.devValidRedirectUris) && (
            <FormattedList list={request?.devValidRedirectUris} title="Dev Redirect URIs:" />
          )}
          {hasUris(request?.testValidRedirectUris) && (
            <FormattedList list={request?.testValidRedirectUris} title="Test Redirect URIs:" />
          )}
          {hasUris(request?.prodValidRedirectUris) && (
            <FormattedList list={request?.prodValidRedirectUris} title="Prod Redirect URIs:" />
          )}
        </tbody>
      </Table>
    </>
  );
}

export default RequestPreview;
