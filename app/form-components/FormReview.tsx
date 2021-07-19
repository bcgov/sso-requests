import React, { useState } from 'react';
import { ClientRequest } from 'interfaces/Request';
import FormButtons from 'form-components/FormButtons';
import { realmToIDP } from 'utils/helpers';
import { updateRequest } from 'services/request';
import { useRouter } from 'next/router';

const formFields = [
  { index: 'projectLead', title: 'Are you the product owner or project admin/team lead?' },
  { index: 'preferredEmail', title: 'Business Email Address' },
  { index: 'projectName', title: 'Project Name' },
  { index: 'newToSso', title: 'Are you new to Single Sign-On (Keycloak)?' },
  { index: 'realm', title: 'Identity Providers' },
  { index: 'devRedirectUrls', title: 'Dev Redirect URLs' },
  { index: 'testRedirectUrls', title: 'Test Redirect URLs' },
  { index: 'prodRedirectUrls', title: 'Prod Redirect URLs' },
];

interface Props {
  formData: ClientRequest;
  setFormStage: Function;
}

const getFormFieldDisplayName = (formField: any, formData: any) => {
  let formInput = formData[formField.index];
  if (Array.isArray(formInput)) {
    formInput = JSON.stringify(formInput);
  }
  if (typeof formInput === 'boolean') {
    formInput = String(formInput);
  }
  if (formField.index === 'realm') {
    formInput = realmToIDP(formInput);
  }
  return formInput;
};

export default function FormReview({ formData, setFormStage }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await updateRequest({ ...formData, status: 'submitted' }, undefined, true);
      setLoading(false);
      router.push('/my-requests');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <table>
        {formFields.map((formField) => {
          const displayName = getFormFieldDisplayName(formField, formData);
          return (
            <tr key={formField.title}>
              <td>{formField.title}</td>
              <td>{displayName}</td>
            </tr>
          );
        })}
      </table>
      <FormButtons
        text={{ continue: 'Submit', back: 'Cancel' }}
        show={true}
        loading={loading}
        handleSubmit={handleSubmit}
        handleBackClick={() => setFormStage(3)}
      />
    </>
  );
}
