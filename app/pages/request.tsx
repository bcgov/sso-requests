import { useRouter } from 'next/router';
import FormTemplate from 'components/FormTemplate';
import Container from 'components/Container';
import ResponsiveContainer, { MediaRule } from 'components/ResponsiveContainer';

const mediaRules: MediaRule[] = [
  {
    maxWidth: 767,
  },
  {
    maxWidth: 991,
    width: 723,
  },
  {
    maxWidth: 1199,
    width: 933,
  },
  {
    width: 1127,
  },
];

interface Props {
  currentUser: {
    email?: string;
  };
}

function Request({ currentUser }: Props) {
  const router = useRouter();

  return (
    <ResponsiveContainer rules={mediaRules}>
      <Container>
        <FormTemplate currentUser={currentUser || {}} />
      </Container>
    </ResponsiveContainer>
  );
}

export default Request;
