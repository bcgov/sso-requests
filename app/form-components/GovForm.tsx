import Form from '@rjsf/core';
import Input from '@button-inc/bcgov-theme/Input';
import Textarea from '@button-inc/bcgov-theme/Textarea';
import wrapper from 'utils/widgetWrapper';
import React from 'react';
import { transformErrors } from 'utils/helpers';

const customWidgets = {
  TextWidget: wrapper(Input, 'input'),
  EmailWidget: wrapper(Input, 'email'),
  TextareaWidget: wrapper(Textarea, 'textarea'),
};
// const customWidgets = { RadioWidget: wrapper(RadioButton, 'radio'), TextWidget: wrapper(Input, 'input') };

export default function MyForm(props: any) {
  return (
    <Form {...props} widgets={customWidgets} noHtml5Validate ErrorList={() => null} transformErrors={transformErrors} />
  );
}
