import React from 'react';
import { BceidEmailDetails } from 'interfaces/form';
import styled from 'styled-components';
interface Props {
  setBceidEmailDetails: Function;
  bceidEmailDetails: BceidEmailDetails;
}

const Title = styled.h2`
  margin-top: 10px;
`;

export default function BceidEmailTemplate({ bceidEmailDetails, setBceidEmailDetails }: Props) {
  // const uiSchema = getUiSchema(true);

  // const handleChange = (e: any) => {
  //   setBceidEmailDetails(e.formData);
  // };

  return (
    <>
      <Title>Your Prod environment will be provided by the BCeID Team </Title>
      <p>
        Once you submit the request, both you and the BCeID team will receive an email with your request details. The
        BCeID team will reach out to you within <strong>2 business days</strong> to schedule an on-boarding meeting. 
      </p>
      {/* <Form schema={bceidEmailSchema} uiSchema={uiSchema} formData={bceidEmailDetails} onChange={handleChange}>
        <></>
      </Form> */}
    </>
  );
}
