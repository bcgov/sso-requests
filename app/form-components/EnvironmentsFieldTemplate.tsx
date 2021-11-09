import React from 'react';
import styled from 'styled-components';
import InfoOverlay from 'components/InfoOverlay';

const Title = styled.legend`
  font-weight: bold;
  font-size: 1rem;
  margin: 0;
`;

export default function EnvironmentsFieldTemplate(props: any) {
  const { id, classNames, label, help, required, errors, children, schema } = props;
  const { tooltipTitle, tooltipContent, hide = 250, description } = schema;
  return (
    <div className={classNames}>
      <Title>
        Environments{' '}
        {tooltipContent && <InfoOverlay tooltipTitle={tooltipTitle} tooltipContent={tooltipContent} hide={hide} />}
      </Title>
      <p>
        If requesting integration with a BCeID realm, your development and test environments can be created
        automatically. If requesting a production environment, we will be handing that off to the IDIM team for
        processing which will take longer.
      </p>
      {description}
      {children}
      {errors}
      {help}
    </div>
  );
}
