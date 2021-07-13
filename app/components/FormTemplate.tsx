import React, { useState } from 'react';
import HeaderLight from 'components/HeaderLight';
import FormStage from 'components/FormStage';
import Form from 'components/GovForm';
import schema from 'schemas/requester-info';
import uiSchema from 'schemas/ui';
import CreateRequestButtons from 'components/CreateRequestButtons';
import FormButtons from 'components/FormButtons';
import { Data } from 'interfaces/form';
import Modal from '@button-inc/bcgov-theme/Modal';
import { submitRequest } from 'services/request';

export default function FormTemplate() {
  const [formData, setFormData] = useState({} as Data);
  const [formStage, setFormStage] = useState(1);

  const handleChange = (e: any) => {
    setFormData(e.formData);
    if (e.formData.projectLead === false) {
      window.location.hash = 'modal';
    }
  };

  const handleSubmit = async (e: any) => {
    try {
      await submitRequest(e.formData);
      setFormStage(formStage + 1);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <HeaderLight>Enter requester information</HeaderLight>
      <FormStage currentStage={formStage} />
      <Form schema={schema} uiSchema={uiSchema} onSubmit={handleSubmit} onChange={handleChange} formData={formData}>
        <>{formStage === 1 ? <CreateRequestButtons show={formData.projectLead} /> : <FormButtons />}</>
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
