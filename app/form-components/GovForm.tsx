import Form from '@rjsf/core';
import Input from '@button-inc/bcgov-theme/Input';
import Textarea from '@button-inc/bcgov-theme/Textarea';
import Dropdown from '@button-inc/bcgov-theme/Dropdown';
import wrapper from 'utils/widgetWrapper';
import React from 'react';
import { transformErrors } from 'utils/helpers';

const customWidgets = {
  TextWidget: wrapper(Input, 'input'),
  EmailWidget: wrapper(Input, 'email'),
  TextareaWidget: wrapper(Textarea, 'textarea'),
  SelectWidget: wrapper(Dropdown, 'select'),
};

export default function MyForm(props: any) {
  return (
    <Form {...props} widgets={customWidgets} noHtml5Validate ErrorList={() => null} transformErrors={transformErrors} />
  );
}
