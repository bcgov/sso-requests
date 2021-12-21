import React from 'react';
import ResponsiveContainer, { defaultRules } from 'components/ResponsiveContainer';
import { useRouter } from 'next/router';

export default function FAQ() {
  const router = useRouter();
  const message = router.query.message as string;

  return (
    <>
      <ResponsiveContainer rules={defaultRules}>
        <h1>{message}</h1>
      </ResponsiveContainer>
    </>
  );
}
