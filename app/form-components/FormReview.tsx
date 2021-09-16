import React, { useState } from 'react';
import { Request } from 'interfaces/Request';
import FormButtons from 'form-components/FormButtons';
import { padStart } from 'lodash';
import { updateRequest } from 'services/request';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { validateForm } from 'utils/helpers';
import { FORM_BUTTON_MIN_WIDTH, FORM_TOP_SPACING } from 'styles/theme';
import { withBottomAlert, BottomAlert } from 'layout/BottomAlert';
import CenteredModal from 'components/CenteredModal';
import Modal from '@button-inc/bcgov-theme/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import Button from '@button-inc/bcgov-theme/Button';
import Link from '@button-inc/bcgov-theme/Link';
import DefaultCancelButton from 'components/CancelButton';
import RequestPreview from 'components/RequestPreview';
import Loader from 'react-loader-spinner';
import { SaveMessage } from 'interfaces/form';
import Form from 'form-components/GovForm';
import commentSchema from 'schemas/admin-comment';
import uiSchema from 'schemas/commentUi';
import { adminNonBceidSchemas, nonBceidSchemas } from 'schemas/non-bceid-schemas';

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
`;

const ModalButton = styled(Button)`
  display: block;
  margin: 10px;
  min-width: ${FORM_BUTTON_MIN_WIDTH};
`;

const CancelButton = styled(DefaultCancelButton)`
  margin: 10px;
`;

interface Props {
  formData: Request;
  setErrors: Function;
  errors: any;
  visited: any;
  alert: BottomAlert;
  saving?: boolean;
  saveMessage?: SaveMessage;
  isAdmin?: boolean;
  setFormData: Function;
}

function FormReview({ formData, setFormData, setErrors, errors, visited, alert, isAdmin }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    try {
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
        pathname: isAdmin ? '/admin-dashboard' : '/my-requests',
        query: { id: formData.id },
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e: any) => {
    setFormData(e.formData);
  };

  const openModal = () => {
    const validationSchemas = isAdmin ? adminNonBceidSchemas : nonBceidSchemas;
    const formErrors = validateForm(formData, validationSchemas);
    if (Object.keys(formErrors).length > 0) {
      alert.show({
        variant: 'danger',
        fadeOut: 10000,
        closable: true,
        content:
          'There were errors with your submission. Please see the navigation tabs above for the form pages with errors.',
      });

      return setErrors(formErrors);
    } else {
      window.location.hash = 'confirmation-modal';
    }
  };
  const handleModalClose = () => (window.location.hash = '#');

  const handleBackClick = () => {
    router.push('/my-requests');
  };

  const backText = isAdmin ? 'Cancel' : 'Save and Close';

  return (
    <>
      <RequestPreview request={formData} />
      {isAdmin && (
        <Form schema={commentSchema} uiSchema={uiSchema} liveValidate onChange={handleChange} formData={formData}>
          <></>
        </Form>
      )}
      <FormButtons
        text={{ continue: 'Submit', back: 'Save and Close' }}
        show={true}
        handleSubmit={openModal}
        handleBackClick={handleBackClick}
      />
      <CenteredModal id="confirmation-modal">
        <Modal.Header>
          <FontAwesomeIcon icon={faInfoCircle} size="2x" title="Information" />
        </Modal.Header>
        <Modal.Content>
          <p>Are you sure you're ready to submit your request?</p>
          {!isAdmin && (
            <p>
              If you need to change anything after submitting your request, please contact our{' '}
              <Link external href="https://chat.developer.gov.bc.ca/channel/sso/">
                #SSO channel
              </Link>{' '}
              or email <Link href="mailto:bcgov.sso@gov.bc.ca">bcgov.sso@gov.bc.ca</Link>
            </p>
          )}
          <ButtonContainer>
            <CancelButton onClick={handleModalClose}>Cancel</CancelButton>
            <ModalButton onClick={handleSubmit}>
              {loading ? <Loader type="Grid" color="#FFF" height={20} width={20} /> : 'Submit'}
            </ModalButton>
          </ButtonContainer>
        </Modal.Content>
      </CenteredModal>
    </>
  );
}

export default withBottomAlert(FormReview);
