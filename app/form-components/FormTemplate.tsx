import React, { useState, useEffect } from 'react';
import FormHeader from 'form-components/FormHeader';
import FormStage from 'form-components/FormStage';
import Form from 'form-components/GovForm';
import requesterInfoSchema from 'schemas/requester-info';
import termsAndConditionsSchema from 'schemas/terms-and-conditions';
import providersSchema from 'schemas/providers';
import uiSchema from 'schemas/ui';
import FormButtons from 'form-components/FormButtons';
import { Data } from 'interfaces/form';
import Modal from '@button-inc/bcgov-theme/Modal';
import { createRequest, updateRequest } from 'services/request';
import ArrayFieldTemplate from 'form-components/ArrayFieldTemplate';
import FormReview from 'form-components/FormReview';

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
}

export default function FormTemplate({ currentUser = {} }: Props) {
  const [formData, setFormData] = useState({} as Data);
  const [formStage, setFormStage] = useState(1);
  const [loading, setLoading] = useState(false);

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

  const handleBackClick = () => {
    if (formStage > 1) setFormStage(formStage - 1);
  };

  const handleSubmit = async (e: any) => {
    try {
      setLoading(true);
      if (formStage === 1) {
        const { id } = await createRequest(e.formData);
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

  return (
    <>
      <FormHeader formStage={formStage} id={formData.id} />
      <FormStage currentStage={formStage} />
      {[1, 2, 3].includes(formStage) ? (
        <Form
          schema={getSchema(formStage)}
          uiSchema={uiSchema}
          onSubmit={handleSubmit}
          onChange={handleChange}
          formData={formData}
          ArrayFieldTemplate={ArrayFieldTemplate}
          ErrorList={() => null}
        >
          <FormButtons
            text={{ continue: formStage === 1 ? 'Create File' : 'Next', back: 'Cancel' }}
            show={formStage !== 1 || formData.projectLead}
            loading={loading}
            handleBackClick={handleBackClick}
          />
        </Form>
      ) : (
        <FormReview formData={formData} setFormStage={setFormStage} />
      )}
      {formStage === 1 && (
        <Modal id="modal">
          <Modal.Header>
            Information <Modal.Close>Close</Modal.Close>
          </Modal.Header>
          <Modal.Content>
            We cannot process realm requests except for individuals with the product owner, project admin or team lead
            role. Please get in touch with individuals with these roles in your organization to make this request for
            you.
          </Modal.Content>
        </Modal>
      )}
    </>
  );
}
