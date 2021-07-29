import React, { useState, useEffect } from 'react';
import FormHeader from 'form-components/FormHeader';
import FormStage from 'form-components/FormStage';
import Form from 'form-components/GovForm';
import requesterInfoSchema from 'schemas/requester-info';
import termsAndConditionsSchema from 'schemas/terms-and-conditions';
import providersSchema from 'schemas/providers';
import getUiSchema from 'schemas/ui';
import FormButtons from 'form-components/FormButtons';
import { ClientRequest } from 'interfaces/Request';
import Modal from '@button-inc/bcgov-theme/Modal';
import Button from '@button-inc/bcgov-theme/Button';
import { createRequest, updateRequest } from 'services/request';
import ArrayFieldTemplate from 'form-components/ArrayFieldTemplate';
import FormReview from 'form-components/FormReview';
import TermsAndConditions from 'components/TermsAndConditions';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWindowClose } from '@fortawesome/free-solid-svg-icons';
import { transformErrors, validateForm } from 'utils/helpers';
import { FormErrors } from 'interfaces/form';

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

const getSchema = (formStage: number) => {
  switch (formStage) {
    case 1:
      return requesterInfoSchema;
    case 2:
      return providersSchema;
    case 3:
      return termsAndConditionsSchema;
  }
};

interface Props {
  currentUser: {
    email?: string;
  };
  request?: any;
}

export default function FormTemplate({ currentUser = {}, request }: Props) {
  const [formData, setFormData] = useState((request || {}) as ClientRequest);
  const [formStage, setFormStage] = useState(request ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<null | FormErrors>(null);
  const [submitted, setSubmitted] = useState(false);
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

  useEffect(() => {
    if (!submitted) return;
    const valid = validateForm(formData);
    setErrors(valid === true ? null : valid);
  }, [submitted, formStage]);

  const handleBackClick = () => {
    router.push('/my-requests');
  };

  const creatingNewForm = () => router.route.endsWith('/request');

  const uiSchema = getUiSchema(!creatingNewForm());

  const handleSubmit = async (e: any) => {
    try {
      setLoading(true);

      if (creatingNewForm()) {
        const [data, err] = await createRequest(e.formData);
        const { id } = data || {};
        await router.push({ pathname: `/request/${id}` });
        setFormData({ ...formData, id });
      } else {
        await updateRequest(e.formData);
      }
      setFormStage(formStage + 1);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
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
      <FormStage
        currentStage={formStage}
        setFormStage={setFormStage}
        errors={errors}
        creatingNewForm={creatingNewForm}
      />
      {formStage === 3 && <TermsAndConditions />}
      {[1, 2, 3].includes(formStage) ? (
        <Form
          schema={getSchema(formStage)}
          uiSchema={uiSchema}
          onSubmit={handleSubmit}
          onChange={handleChange}
          formData={formData}
          ArrayFieldTemplate={ArrayFieldTemplate}
          onBlur={handleBlur}
          liveValidate={submitted}
        >
          <FormButtons
            text={{ continue: 'Next', back: 'Cancel' }}
            show={formStage !== 1 || formData.projectLead}
            loading={loading}
            handleBackClick={handleBackClick}
          />
        </Form>
      ) : (
        <FormReview
          formData={formData}
          setErrors={setErrors}
          setSubmitted={setSubmitted}
          submitted={submitted}
          errors={errors}
        />
      )}
      {formStage === 1 && (
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
