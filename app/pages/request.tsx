import { useRouter } from 'next/router';
import FormTemplate from 'components/FormTemplate';
import Container from 'components/Container';

interface Props {
  currentUser: {
    email?: string;
  };
}

function Request({ currentUser }: Props) {
  const router = useRouter();

  if (!currentUser) {
    router.push('/');
    return null;
  }

  return (
    <Container>
      <FormTemplate currentUser={currentUser || {}} />
    </Container>
  );
}

export default Request;
