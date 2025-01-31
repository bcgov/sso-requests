import React from 'react';
import Content from 'page-partials/terms-conditions/Content';
import FieldTemplate from './FieldTemplate';
import { FieldTemplateProps } from '@rjsf/utils/lib/types';

export default function FieldTermsAndConditions(props: FieldTemplateProps) {
  return <FieldTemplate {...props} top={<Content />} />;
}
