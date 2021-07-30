import React, { useState } from 'react';
import { Request } from 'interfaces/Request';
import FormButtons from 'form-components/FormButtons';
import { realmToIDP } from 'utils/helpers';
import { updateRequest } from 'services/request';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { validateForm } from 'utils/helpers';
import Alert from 'html-components/Alert';
import { FormErrors } from 'interfaces/form';
import { FORM_TOP_SPACING } from 'styles/theme';
import FadingAlert from 'html-components/FadingAlert';
import BottomAlertWrapper from 'components/BottomAlertWrapper';

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

const SpacedAlert = styled(Alert)`
  margin-top: ${FORM_TOP_SPACING};
`;

const SemiBold = styled.span`
  font-weight: 600;
`;

const formatBoolean = (value?: boolean) => {
  if (value === undefined) return '';
  return value ? 'Yes' : 'No';
};

const formatList = (list?: string[]) => {
  if (!list) return '';
  let formattedString = '';
  list.forEach((entry) => {
    if (!entry) return;
    formattedString += `${entry}, `;
  });
  return formattedString.slice(0, -2);
};

interface Props {
  formData: Request;
  setErrors: Function;
  setSubmitted: Function;
  submitted: boolean;
  errors: null | FormErrors;
}

export default function FormReview({ formData, setErrors, setSubmitted, errors, submitted = false }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  console.log(errors);
  const hasErrors = errors && !(Object.keys(errors).length === 0);

  const handleSubmit = async () => {
    try {
      setSubmitted(true);
      const valid = validateForm(formData);
      if (valid !== true) {
        return setErrors(valid);
      }
      setLoading(true);
      await updateRequest(formData, true);
      setLoading(false);
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
            <td>Have you requested an SSO project before?</td>
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
            <td>
              <SemiBold>{formatList(formData?.devValidRedirectUris)}</SemiBold>
            </td>
          </tr>
          <tr>
            <td>Test redirect URIs:</td>
            <td>
              <SemiBold>{formatList(formData?.testValidRedirectUris)}</SemiBold>
            </td>
          </tr>
          <tr>
            <td>Prod redirect URIs:</td>
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
      {submitted && hasErrors && (
        <BottomAlertWrapper key={new Date().getTime()}>
          <FadingAlert
            variant="danger"
            fadeOut={10000}
            closable
            content="There were errors with your submission. Please see the navigation tabs above for the form pages with errors."
          />
        </BottomAlertWrapper>
      )}
    </>
  );
}
