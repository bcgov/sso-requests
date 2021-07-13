import React, { useState } from 'react';
import HeaderLight from 'components/HeaderLight';
import FormStage from 'components/FormStage';
import Form from 'components/GovForm';
import schema from 'schemas/requester-info';
import uiSchema from 'schemas/ui';
import CreateRequestButtons from 'components/CreateRequestButtons';
import FormButtons from 'components/FormButtons';
import { Data } from 'interfaces/form';

export default function FormTemplate() {
  const [formData, setFormData] = useState({} as Data);
  const [formStage, setFormStage] = useState(1);

  return (
    <>
      <HeaderLight>Enter requester information</HeaderLight>
      <FormStage currentStage={formStage} />
      <Form
        schema={schema}
        uiSchema={uiSchema}
        onSubmit={(e: any) => console.log(e.formData)}
        onChange={(e: any) => setFormData(e.formData)}
        // onSubmit={(e) => submitRequest(e.formData as Data)}
        formData={formData}
      >
        <>{formStage === 1 ? <CreateRequestButtons show={formData.projectLead} /> : <FormButtons />}</>
      </Form>
    </>
  );
}
