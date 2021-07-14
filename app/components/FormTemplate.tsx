import React, { useState, useEffect } from 'react';
import FormHeader from 'components/FormHeader';
import FormStage from 'components/FormStage';
import Form from 'components/GovForm';
import requesterInfoSchema from 'schemas/requester-info';
import providersSchema from 'schemas/providers';
import uiSchema from 'schemas/ui';
import FormButtons from 'components/FormButtons';
import { Data } from 'interfaces/form';
import Modal from '@button-inc/bcgov-theme/Modal';
import { createRequest } from 'services/request';
import ArrayFieldTemplate from 'components/ArrayFieldTemplate';

const getSchema = (formStage: number) => {
  switch (formStage) {
    case 1:
      return requesterInfoSchema;
    case 2:
      return providersSchema;
  }
};

interface Props {
  currentUser: {
    email?: string;
  };
}

export default function FormTemplate({ currentUser = {} }: Props) {
  const [formData, setFormData] = useState({} as Data);
  const [formStage, setFormStage] = useState(2);
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
  }, [currentUser, formData]);

  const handleSubmit = async (e: any) => {
    try {
      setLoading(true);
      const { id } = await createRequest(e.formData);
      setFormStage(formStage + 1);
      setFormData({ ...formData, id });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <>
      <FormHeader formStage={formStage} id={formData.id} />
      <FormStage currentStage={formStage} />
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
        />
      </Form>
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
