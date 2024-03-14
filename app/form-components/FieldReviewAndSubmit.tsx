import React from 'react';
import styled from 'styled-components';
import { FieldTemplateProps } from 'react-jsonschema-form';
import { NumberedContents } from '@bcgov-sso/common-react-components';
import RequestPreview from 'components/RequestPreview';
import { usesBceid } from '@app/helpers/integration';
import FieldTemplate from './FieldTemplate';

export default function FieldReviewAndSubmit(props: FieldTemplateProps) {
  const { formContext } = props;
  const { formData, teams } = formContext;

  const hasBceid = usesBceid(formData);
  const hasBceidProd = hasBceid && formData.environments?.includes('prod');

  const top = (
    <div>
      <NumberedContents title="Please review your information to make sure it is correct." number={1}>
        <RequestPreview request={formData} teams={teams} />
      </NumberedContents>

      <NumberedContents
        title={`Your ${hasBceid ? 'Dev and/or Test' : ''} environment(s) will be provided by the SSO Pathfinder team.`}
        number={2}
      >
        <p>Upon submission of your request, access will be granted promptly, typically within seconds.</p>
      </NumberedContents>
      {hasBceidProd && (
        <NumberedContents number={3} title="Your Prod environment will be provided by the BCeID Team" showLine={false}>
          <p>
            Once you submit the request, both you and the BCeID team will receive an email with your request details.
          </p>
          <p>
            On a best-effort basis, the BCeID team will endeavour to reach out to you within 2-3 business days to
            schedule an on-boarding meeting. 
          </p>
        </NumberedContents>
      )}
    </div>
  );

  return <FieldTemplate {...props} top={top} />;
}
