import FormTemplate from 'form-components/FormTemplate';
import ResponsiveContainer, { defaultRules } from 'components/ResponsiveContainer';

const requestPageRules = defaultRules.map((rule) => (rule.width === 1127 ? { ...rule, marginTop: 20 } : rule));

interface Props {
  currentUser: {
    email?: string;
  };
}

function Request({ currentUser }: Props) {
  return (
    <ResponsiveContainer rules={requestPageRules}>
      <FormTemplate currentUser={currentUser || {}} />
    </ResponsiveContainer>
  );
}

export default Request;
