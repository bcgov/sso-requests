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

const formatBoolean = (value?: boolean) => {
  if (value === undefined) return '';
  return value ? 'Yes' : 'No';
};

const formatList = (list?: string[]) => {
  return (
    <StyledUl>
      {list?.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </StyledUl>
  );
};

interface Props {
  request: Request;
}

function RequestPreview({ request }: Props) {
  if (!request) return null;

  return (
    <>
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
            <td>Preferred email address:</td>
            <td>
              <SemiBold>{request?.preferredEmail}</SemiBold>
            </td>
          </tr>
        </tbody>
      </Table>
      <Divider />
      <Table>
        <tbody>
          <tr>
            <td>Identity providers required:</td>
            <td>
              <SemiBold>{formatList(realmToIDP(request?.realm))}</SemiBold>
            </td>
          </tr>
          <tr>
            <td>Dev redirect URIs:</td>
          </tr>
          <tr>
            <td>
              <SemiBold>{formatList(request?.devValidRedirectUris)}</SemiBold>
            </td>
          </tr>
          <tr>
            <td>Test redirect URIs:</td>
          </tr>
          <tr>
            <td>
              <SemiBold>{formatList(request?.testValidRedirectUris)}</SemiBold>
            </td>
          </tr>
          <tr>
            <td>Prod redirect URIs:</td>
          </tr>
          <tr>
            <td>
              <SemiBold>{formatList(request?.prodValidRedirectUris)}</SemiBold>
            </td>
          </tr>
        </tbody>
      </Table>
    </>
  );
}

export default RequestPreview;
