import styled from 'styled-components';
import ErrorImage from 'svg/error';
import { useRouter } from 'next/router';

const Container = styled.div`
  text-align: center;
`;

export default function ApplicationError() {
  const router = useRouter();
  const errorMessage = router?.query?.error as string;

  return (
    <Container>
      <ErrorImage message={errorMessage} />
    </Container>
  );
}
