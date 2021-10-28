import React from 'react';
import Form from 'form-components/GovForm';
import bceidEmailSchema from 'schemas/bceid-email';
import getUiSchema from 'schemas/ui';
import { BceidEmailDetails } from 'interfaces/form';

interface Props {
  setBceidEmailDetails: Function;
  bceidEmailDetails: BceidEmailDetails;
}

export default function BceidEmailTemplate({ bceidEmailDetails, setBceidEmailDetails }: Props) {
  const uiSchema = getUiSchema(true);

  const handleChange = (e: any) => {
    setBceidEmailDetails(e.formData);
  };

  return (
    <>
      <h2>Provided by BCeID team: access to prod </h2>
      <p>
        The email below will be provided to the BCeID team. They will reach out to you to complete the request for prod.
      </p>
      <Form schema={bceidEmailSchema} uiSchema={uiSchema} formData={bceidEmailDetails} onChange={handleChange}>
        <></>
      </Form>
    </>
  );
}
