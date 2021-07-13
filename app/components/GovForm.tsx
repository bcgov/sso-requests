import Form from '@rjsf/core';
import RadioButton from '@button-inc/bcgov-theme/RadioButton';
import Input from '@button-inc/bcgov-theme/Input';
import wrapper from 'utils/widgetWrapper';
import CustomFieldTemplate from './CustomFieldTemplate';

const customWidgets = { RadioWidget: wrapper(RadioButton, 'radio'), TextWidget: wrapper(Input, 'input') };

export default function MyForm(props: any) {
  return <Form {...props} widgets={customWidgets} FieldTemplate={CustomFieldTemplate} />;
}
