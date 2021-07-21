import { useRouter } from 'next/router';
import FormTemplate from 'form-components/FormTemplate';
import ResponsiveContainer, { MediaRule, requestPageRules } from 'components/ResponsiveContainer';

interface Props {
  currentUser: {
    email?: string;
  };
}

function Request({ currentUser }: Props) {
  const router = useRouter();

  return (
    <ResponsiveContainer rules={requestPageRules}>
      <FormTemplate currentUser={currentUser || {}} />
    </ResponsiveContainer>
  );
}

export default Request;
