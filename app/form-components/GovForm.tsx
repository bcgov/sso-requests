import Form from '@rjsf/core';
import omit from 'lodash.omit';
import { FormProps } from 'react-jsonschema-form';
import Input from '@button-inc/bcgov-theme/Input';
import Textarea from '@button-inc/bcgov-theme/Textarea';
import Dropdown from '@button-inc/bcgov-theme/Dropdown';
import wrapper from 'utils/widgetWrapper';
import React from 'react';
import { transformErrors } from 'utils/helpers';

const PureInput = (props: any) => <Input {...omit(props, 'label')} />;
const PureTextarea = (props: any) => <Textarea {...omit(props, 'label')} />;

const customWidgets = {
  TextWidget: wrapper(PureInput, 'input'),
  EmailWidget: wrapper(PureInput, 'email'),
  TextareaWidget: wrapper(PureTextarea, 'textarea'),
  SelectWidget: wrapper(Dropdown, 'select'),
};

export default function GovForm(props: FormProps<any> & { children: React.ReactNode }) {
  return (
    <Form
      {...(props as any)}
      widgets={customWidgets}
      noHtml5Validate
      ErrorList={() => null}
      transformErrors={transformErrors}
    />
  );
}
