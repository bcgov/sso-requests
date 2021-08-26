import React, { useState } from 'react';
import { Request } from 'interfaces/Request';
import FormButtons from 'form-components/FormButtons';
import { realmToIDP } from 'utils/helpers';
import { padStart } from 'lodash';
import { updateRequest } from 'services/request';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { validateForm } from 'utils/helpers';
import { FORM_TOP_SPACING } from 'styles/theme';
import { withBottomAlert, BottomAlert } from 'layout/BottomAlert';

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
        <li>{item}</li>
      ))}
    </StyledUl>
  );
};

interface Props {
  formData: Request;
  setErrors: Function;
  errors: any;
  visited: any;
  alert: BottomAlert;
}

function FormReview({ formData, setErrors, errors, visited, alert }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    try {
      const errors = validateForm(formData, visited);
      if (Object.keys(errors).length > 0) {
        alert.show({
          variant: 'danger',
          fadeOut: 10000,
          closable: true,
          content:
            'There were errors with your submission. Please see the navigation tabs above for the form pages with errors.',
        });

        return setErrors(errors);
      }
      setLoading(true);
      await updateRequest(formData, true);
      setLoading(false);

      alert.show({
        variant: 'success',
        fadeOut: 10000,
        closable: true,
        content: `Request ID:${padStart(String(formData.id), 8, '0')} is successfully submitted!`,
      });

      router.push({
        pathname: '/my-requests',
        query: { id: formData.id },
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleBackClick = () => {
    router.push('/my-requests');
  };

  return (
    <>
      <Table>
        <tbody>
          <tr>
            <td>Are you the product owner or project admin/team lead?</td>
            <td>
              <SemiBold>{formatBoolean(formData?.projectLead)}</SemiBold>
            </td>
          </tr>
          <tr>
            <td>Have you requested an SSO access before?</td>
            <td>
              <SemiBold>{formatBoolean(formData?.newToSso)}</SemiBold>
            </td>
          </tr>
          <tr>
            <td>Client Type:</td>
            <td>
              <SemiBold>{formData?.publicAccess ? 'Public' : 'Confidential'}</SemiBold>
            </td>
          </tr>
          <tr>
            <td>Project Name:</td>
            <td>
              <SemiBold>{formData?.projectName}</SemiBold>
            </td>
          </tr>
          <tr>
            <td>Preferred email address:</td>
            <td>
              <SemiBold>{formData?.preferredEmail}</SemiBold>
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
              <SemiBold>{formatList(realmToIDP(formData?.realm))}</SemiBold>
            </td>
          </tr>
          <tr>
            <td>Dev redirect URIs:</td>
          </tr>
          <tr>
            <td>
              <SemiBold>{formatList(formData?.devValidRedirectUris)}</SemiBold>
            </td>
          </tr>
          <tr>
            <td>Test redirect URIs:</td>
          </tr>
          <tr>
            <td>
              <SemiBold>{formatList(formData?.testValidRedirectUris)}</SemiBold>
            </td>
          </tr>
          <tr>
            <td>Prod redirect URIs:</td>
          </tr>
          <tr>
            <td>
              <SemiBold>{formatList(formData?.prodValidRedirectUris)}</SemiBold>
            </td>
          </tr>
        </tbody>
      </Table>
      <FormButtons
        text={{ continue: 'Submit', back: 'Cancel' }}
        show={true}
        loading={loading}
        handleSubmit={handleSubmit}
        handleBackClick={handleBackClick}
      />
    </>
  );
}

export default withBottomAlert(FormReview);
