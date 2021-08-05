import React, { useState, useEffect } from 'react';
import FormHeader from 'form-components/FormHeader';
import FormStage from 'form-components/FormStage';
import Form from 'form-components/GovForm';
import getUiSchema from 'schemas/ui';
import FormButtons from 'form-components/FormButtons';
import { Request } from 'interfaces/Request';
import Modal from '@button-inc/bcgov-theme/Modal';
import Button from '@button-inc/bcgov-theme/Button';
import { noop } from 'lodash';
import { createRequest, updateRequest } from 'services/request';
import ArrayFieldTemplate from 'form-components/ArrayFieldTemplate';
import FormReview from 'form-components/FormReview';
import TermsAndConditions from 'components/TermsAndConditions';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWindowClose } from '@fortawesome/free-solid-svg-icons';
import nonBceidSchemas from 'schemas/non-bceid-schemas';
import { transformErrors, validateForm } from 'utils/helpers';
import { withBottomAlert, BottomAlert } from 'layout/BottomAlert';

const CenteredModal = styled(Modal)`
  display: flex;
  align-items: center;

  & .pg-modal-main {
    margin: auto;
  }
`;

const ModalButton = styled(Button)`
  display: block;
  margin: 10px;
  margin-left: auto;
`;

interface Props {
  currentUser: {
    email?: string;
  };
  request?: any;
  alert: BottomAlert;
}

function FormTemplate({ currentUser = {}, request, alert }: Props) {
  const [formData, setFormData] = useState((request || {}) as Request);
  const [formStage, setFormStage] = useState(request ? 1 : 0);
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [visited, setVisited] = useState<any>({});
  const router = useRouter();

  const handleChange = (e: any) => {
    setFormData(e.formData);
    if (e.formData.projectLead === false) {
      window.location.hash = 'modal';
    }
  };

  useEffect(() => {
    if (!formData.preferredEmail) {
      setFormData({ ...formData, preferredEmail: currentUser.email || '' });
    }
  }, [currentUser]);

  const changeStep = (newStage: number) => {
    visited[formStage] = true;

    if (newStage === 3) {
      visited['0'] = true;
      visited['1'] = true;
      visited['2'] = true;
    }

    const errors = validateForm(formData, visited);
    setErrors(errors);
    setFormStage(newStage);
    setVisited(visited);
    alert.hide();
  };

  const handleBackClick = () => {
    router.push('/my-requests');
  };

  const creatingNewForm = () => router.route.endsWith('/request');

  const uiSchema = getUiSchema(!creatingNewForm());

  const handleFormSubmit = async () => {
    try {
      setLoading(true);

      if (creatingNewForm()) {
        const [data, err] = await createRequest(formData);
        const { id } = data || {};

        if (err || !id) {
          alert.show({
            variant: 'danger',
            fadeOut: 10000,
            closable: true,
            content: `Failed to create a new request`,
          });

          setLoading(false);
          return;
        }

        await router.push({ pathname: `/request/${id}` });
        setFormData({ ...formData, id });
      } else {
        await updateRequest(formData);
      }

      handleButtonSubmit();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleButtonSubmit = async () => {
    const newStage = formStage + 1;
    changeStep(newStage);
  };

  const handleBlur = async (id: string, value: any) => {
    if (creatingNewForm()) return;
    if (request) {
      setSaving(true);
      await updateRequest({ ...formData, id: request.id });
      setSaveMessage(`Last saved at ${new Date().toLocaleString()}`);
      setSaving(false);
    }
  };

  const handleModalClose = () => {
    router.push('my-requests');
  };

  return (
    <>
      <FormHeader formStage={formStage} id={formData.id} saveMessage={saveMessage} saving={saving} />
      <FormStage currentStage={formStage} setFormStage={changeStep} errors={errors} creatingNewForm={creatingNewForm} />
      {formStage === 2 && <TermsAndConditions />}
      {[0, 1, 2].includes(formStage) ? (
        <Form
          schema={nonBceidSchemas[formStage]}
          uiSchema={uiSchema}
          onChange={handleChange}
          onSubmit={handleFormSubmit}
          formData={formData}
          ArrayFieldTemplate={ArrayFieldTemplate}
          onBlur={handleBlur}
          liveValidate={visited[formStage]}
        >
          <FormButtons
            formSubmission={formStage === 0}
            text={{ continue: 'Next', back: 'Cancel' }}
            show={formStage !== 0 || formData.projectLead}
            loading={loading}
            handleSubmit={formStage === 0 ? noop : handleButtonSubmit}
            handleBackClick={handleBackClick}
          />
        </Form>
      ) : (
        <FormReview formData={formData} setErrors={setErrors} errors={errors} visited={visited} />
      )}
      {formStage === 0 && (
        <CenteredModal id="modal">
          <Modal.Header>
            Information{' '}
            <Modal.Close>
              <FontAwesomeIcon
                icon={faWindowClose}
                size="2x"
                role="button"
                aria-label="close"
                onClick={handleModalClose}
              />
            </Modal.Close>
          </Modal.Header>
          <Modal.Content>
            We can only process access requests submittted by{' '}
            <strong>product owners, project admin or team leads</strong>. If you are not acting in one of these roles,
            please get in touch with these individuals in your organization to make the request for you.
            <ModalButton onClick={handleModalClose}>Okay</ModalButton>
          </Modal.Content>
        </CenteredModal>
      )}
    </>
  );
}

export default withBottomAlert(FormTemplate);
