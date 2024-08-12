import React from 'react';
import styled from 'styled-components';
import { FieldTemplateProps } from 'react-jsonschema-form';
import CenteredModal from 'components/CenteredModal';
import FieldTemplate from './FieldTemplate';

const ErrorText = styled.p`
  color: #d94532;
  font-weight: bold;
`;

export default function FieldRequesterInfo(props: FieldTemplateProps) {
  const { formContext } = props;
  const { formData } = formContext;
  const showAccountableError = formData.projectLead === false && formData.usesTeam === false;
  const [openrequestorInfoModal, setOpenrequestorInfoModal] = React.useState(false);

  const handleModalClose = () => {
    setOpenrequestorInfoModal(false);
  };

  const bottom = (
    <>
      <CenteredModal
        id={'info-modal'}
        openModal={openrequestorInfoModal}
        handleClose={handleModalClose}
        content={
          <>
            <p>If you are not accountable for this project, please refer this request to someone who is.</p>
            <p> Only the person who is responsible for this project can submit the intergration request.</p>
          </>
        }
        icon={false}
        onConfirm={handleModalClose}
        confirmText="Close"
        showCancel={false}
        title="Project Accountability"
        buttonStyle="primary"
        buttonAlign="center"
        closable
      />
      {showAccountableError && (
        <ErrorText>
          If you are not accountable for this request, please refer this request to someone who is. Only the responsible
          person can submit the integration request.
        </ErrorText>
      )}
    </>
  );

  return <FieldTemplate {...props} bottom={bottom} />;
}
