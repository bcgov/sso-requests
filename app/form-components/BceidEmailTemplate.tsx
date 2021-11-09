import React from 'react';
import { BceidEmailDetails } from 'interfaces/form';

interface Props {
  setBceidEmailDetails: Function;
  bceidEmailDetails: BceidEmailDetails;
}

export default function BceidEmailTemplate({ bceidEmailDetails, setBceidEmailDetails }: Props) {
  // const uiSchema = getUiSchema(true);

  // const handleChange = (e: any) => {
  //   setBceidEmailDetails(e.formData);
  // };

  return (
    <>
      <p>Once you submit the request, both you and the BCeID team will receive an email with your request details.</p>
      <p>
        On a best-effort basis, the BCeID team will endeavour to reach out to you within{' '}
        <strong>2-3 business days</strong> to schedule an on-boarding meeting. 
      </p>
      {/* <Form schema={bceidEmailSchema} uiSchema={uiSchema} formData={bceidEmailDetails} onChange={handleChange}>
        <></>
      </Form> */}
    </>
  );
}
