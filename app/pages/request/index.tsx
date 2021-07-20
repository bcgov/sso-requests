import { useRouter } from 'next/router';
import FormTemplate from 'form-components/FormTemplate';
import Container from 'components/Container';
import ResponsiveContainer, { MediaRule, defaultRules } from 'components/ResponsiveContainer';

interface Props {
  currentUser: {
    email?: string;
  };
}

function Request({ currentUser }: Props) {
  const router = useRouter();

  return (
    <ResponsiveContainer rules={defaultRules}>
      <Container>
        <FormTemplate currentUser={currentUser || {}} />
      </Container>
    </ResponsiveContainer>
  );
}

export default Request;
