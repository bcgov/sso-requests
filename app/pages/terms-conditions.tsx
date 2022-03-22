import React from 'react';
import ResponsiveContainer, { defaultRules } from 'components/ResponsiveContainer';
import TermsAndConditions from 'components/TermsAndConditions';

export default function TermsConditionsPage() {
  return (
    <ResponsiveContainer rules={defaultRules}>
      <TermsAndConditions />
    </ResponsiveContainer>
  );
}
