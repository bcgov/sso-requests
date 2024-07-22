import NotFoundImage from '@app/svg/NotFoundImage';
import Link from 'next/link';
import styled from 'styled-components';

const Container = styled.div`
  text-align: center;
`;

export default function NotFound() {
  return (
    <div>
      <Container>
        <NotFoundImage />
      </Container>
      ;
    </div>
  );
}
