import FormTemplate from 'components/FormTemplate';
import Container from 'components/Container';

interface Props {
  currentUser: {
    email?: string;
  };
}

function Request({ currentUser }: Props) {
  return (
    <Container>
      <FormTemplate currentUser={currentUser || {}} />
    </Container>
  );
}

export default Request;
