import React from 'react';
import ResponsiveContainer, { defaultRules } from 'components/ResponsiveContainer';
import TermsAndConditions from 'page-partials/terms-conditions/Content';

export default function TermsConditionsPage() {
  return (
    <ResponsiveContainer rules={defaultRules}>
      <h1>Terms and Conditions</h1>
      <TermsAndConditions />
    </ResponsiveContainer>
  );
}
