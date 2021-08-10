import React from 'react';
import ResponsiveContainer, { MediaRule, defaultRules } from 'components/ResponsiveContainer';
import TermsAndConditions from 'components/TermsAndConditions';
import { PageProps } from 'interfaces/props';

export default function TermsConditionsPage({ currentUser }: PageProps) {
  return (
    <ResponsiveContainer rules={defaultRules}>
      <TermsAndConditions />
    </ResponsiveContainer>
  );
}
