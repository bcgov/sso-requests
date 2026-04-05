import Form, { FormProps } from '@rjsf/core';
import { omit } from 'lodash';
import Input from '@app/components/Input';
import wrapper from 'utils/widgetWrapper';
import React from 'react';
import { transformErrors } from 'utils/helpers';
import Textarea from '@app/components/Textarea';
import Dropdown from 'react-bootstrap/Dropdown';
import { DropdownWidget } from './widgets/DropdownWidget';

const PureInput = (props: any) => <Input {...omit(props, 'label')} />;
const PureTextarea = (props: any) => <Textarea {...omit(props, 'label')} />;

const customWidgets = {
  TextWidget: wrapper(PureInput, 'input'),
  EmailWidget: wrapper(PureInput, 'email'),
  TextareaWidget: wrapper(PureTextarea, 'textarea'),
  SelectWidget: DropdownWidget,
};

export default function GovForm(props: FormProps<any> & { children: React.ReactNode }) {
  return (
    <Form
      {...(props as any)}
      widgets={customWidgets}
      noHtml5Validate
      ErrorList={() => null}
      transformErrors={transformErrors}
      showErrorList={false}
    />
  );
}
