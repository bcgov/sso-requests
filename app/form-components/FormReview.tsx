import React, { useState } from 'react';
import { ClientRequest } from 'interfaces/Request';
import FormButtons from 'form-components/FormButtons';
import { realmToIDP } from 'utils/helpers';
import { updateRequest } from 'services/request';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { validateForm } from 'utils/helpers';
import Alert from '@button-inc/bcgov-theme/Alert';
import { FormErrors } from 'interfaces/form';
import { FORM_TOP_SPACING } from 'styles/theme';

const Table = styled.table`
  & tr {
    display: flex;
    & > td {
      border: none;
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

const formatBoolean = (value?: boolean) => {
  if (value === undefined) return '';
  return value ? 'Yes' : 'No';
};

interface Props {
  formData: ClientRequest;
  setErrors: Function;
  setSubmitted: Function;
  submitted: boolean;
  errors: null | FormErrors;
}

export default function FormReview({ formData, setErrors, setSubmitted, errors, submitted = false }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const hasErrors = errors && !(Object.keys(errors).length === 0);

  const handleSubmit = async () => {
    try {
      setSubmitted(true);
      const valid = validateForm(formData);
      if (valid !== true) {
        return setErrors(valid);
      }
      setLoading(true);
      await updateRequest({ ...formData, status: 'submitted' }, undefined, true);
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
              <strong>{formatBoolean(formData?.projectLead)}</strong>
            </td>
          </tr>
          <tr>
            <td>Project Name:</td>
            <td>
              <strong>{formData?.projectName}</strong>
            </td>
          </tr>
          <tr>
            <td>Have you requested an SSO project before?</td>
            <td>
              <strong>{formatBoolean(formData?.newToSso)}</strong>
            </td>
          </tr>
          <tr>
            <td>Preferred email address:</td>
            <td>
              <strong>{formData?.preferredEmail}</strong>
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
              <strong>{realmToIDP(formData?.realm)}</strong>
            </td>
          </tr>
          <tr>
            <td>Dev redirect URIs:</td>
            <td>
              <strong>{JSON.stringify(formData?.devRedirectUrls)}</strong>
            </td>
          </tr>
          <tr>
            <td>Test redirect URIs:</td>
            <td>
              <strong>{JSON.stringify(formData?.testRedirectUrls)}</strong>
            </td>
          </tr>
          <tr>
            <td>Prod redirect URIs:</td>
            <td>
              <strong>{JSON.stringify(formData?.prodRedirectUrls)}</strong>
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
        <SpacedAlert variant="danger">
          There were errors with your submission. Please see the navigation tabs above for the form pages with errors.
        </SpacedAlert>
      )}
    </>
  );
}
