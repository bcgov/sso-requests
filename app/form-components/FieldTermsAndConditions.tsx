import React from 'react';
import { FieldTemplateProps } from 'react-jsonschema-form';
import Content from 'page-partials/terms-conditions/Content';
import FieldTemplate from './FieldTemplate';

export default function FieldTermsAndConditions(props: FieldTemplateProps) {
  return <FieldTemplate {...props} top={<Content />} />;
}
