import React, { useState } from 'react';
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
import NumberedContents from 'components/NumberedContents';

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
  const hasBceidProd = hasBceid && formData.prod;

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
    <div>
      <NumberedContents title="Please review your information to make sure it is correct." number={1}>
        <RequestPreview request={formData} hasBceid={hasBceid || false} isAdmin={isAdmin} />
      </NumberedContents>

      <NumberedContents
        title={`Your ${hasBceid ? 'Dev and/or Test' : ''} environment(s) will be provided by the SSO Pathfinder team.`}
        number={2}
      >
        <p>Once you submit the request, access will be provided in 20 minutes or fewer.</p>
      </NumberedContents>
      {isAdmin && (
        <Form schema={commentSchema} uiSchema={uiSchema} liveValidate onChange={handleChange} formData={formData}>
          <></>
        </Form>
      )}
      {hasBceidProd ? (
        <NumberedContents number={3} title="Your Prod environment will be provided by the BCeID Team" showLine={false}>
          <BceidEmailTemplate bceidEmailDetails={bceidEmailDetails} setBceidEmailDetails={setBceidEmailDetails} />
          <FormButtons
            text={{ continue: submitText, back: backText }}
            show={true}
            handleSubmit={openModal}
            handleBackClick={handleBackClick}
          />
        </NumberedContents>
      ) : (
        <FormButtons
          text={{ continue: submitText, back: backText }}
          show={true}
          handleSubmit={openModal}
          handleBackClick={handleBackClick}
        />
      )}
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
    </div>
  );
}

export default withBottomAlert(FormReview);
