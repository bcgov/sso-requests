import React, { useEffect, useState } from 'react';
import { Request } from 'interfaces/Request';
import FormButtons from 'form-components/FormButtons';
import { padStart } from 'lodash';
import { updateRequest } from 'services/request';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { validateForm, parseError, usesBceid } from 'utils/helpers';
import { FORM_BUTTON_MIN_WIDTH } from 'styles/theme';
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
import BceidEmailTemplate from 'form-components/BceidEmailTemplate';
import { bceidBody } from 'utils/constants';

const CIRCLE_DIAMETER = '40px';
const CIRCLE_MARGIN = '10px';

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

const Circle = styled.div`
  height: ${CIRCLE_DIAMETER};
  width: ${CIRCLE_DIAMETER};
  text-align: center;
  line-height: ${CIRCLE_DIAMETER};
  border-radius: ${CIRCLE_DIAMETER};
  background-color: black;
  color: white;
  font-weight: bold;
  margin: ${CIRCLE_MARGIN};
  margin-left: 0;
`;

const Line = styled.div`
  border-left: 1px solid #bcbcbc;
  height: calc(100% - 60px);
  margin-left: calc(${CIRCLE_DIAMETER} / 2);
`;

const Container = styled.div<{ showStepper: boolean }>`
  ${(props) =>
    props.showStepper
      ? `
  display: grid;
  grid-template-columns: 50px 1fr;`
      : ''}
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

function FormReview({ formData, setFormData, setErrors, alert, isAdmin }: Props) {
  const [loading, setLoading] = useState(false);
  const [bceidEmailDetails, setBceidEmailDetails] = useState({});
  const router = useRouter();
  const hasBceid = usesBceid(formData.realm);
  const showStepper = hasBceid && !isAdmin;

  // useEffect(() => {
  //   const { additionalEmails, preferredEmail } = formData;
  //   let emails = [preferredEmail];
  //   if (Array.isArray(additionalEmails)) emails = emails.concat(additionalEmails);
  //   const bceidCc = emails.join(', ');
  //   setBceidEmailDetails({
  //     bceidTo: 'bcgov.sso@gov.bc.ca, IDIM.Consulting@gov.bc.ca',
  //     bceidCc,
  //     bceidBody,
  //   });
  // }, [formData]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      // const data = hasBceid ? { ...formData, bceidEmailDetails } : formData;
      const [, err] = await updateRequest(formData, true);
      setLoading(false);

      if (err) {
        alert.show({
          variant: 'danger',
          fadeOut: 10000,
          closable: true,
          content: parseError(err).message,
        });
      } else {
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
      }
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
    const url = isAdmin ? '/admin-dashboard' : '/my-requests';
    router.push(url);
  };

  const backText = isAdmin ? 'Cancel' : 'Save and Close';
  const submitText = isAdmin ? 'Update' : 'Submit';

  return (
    <Container showStepper={showStepper}>
      {showStepper && (
        <div>
          <Circle>1</Circle>
          <Line />
        </div>
      )}
      <div>
        <RequestPreview request={formData} hasBceid={hasBceid || false} isAdmin={isAdmin} />
      </div>
      {isAdmin && (
        <Form schema={commentSchema} uiSchema={uiSchema} liveValidate onChange={handleChange} formData={formData}>
          <></>
        </Form>
      )}
      {showStepper && (
        <>
          <div>
            <Circle>2</Circle>
          </div>
          <div>
            <BceidEmailTemplate bceidEmailDetails={bceidEmailDetails} setBceidEmailDetails={setBceidEmailDetails} />
          </div>
        </>
      )}
      <div />
      <FormButtons
        text={{ continue: submitText, back: backText }}
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
    </Container>
  );
}

export default withBottomAlert(FormReview);
