import styled from 'styled-components';

const Container = styled.div`
  text-align: center;
`;

export default function ApplicationError() {
  return (
    <Container>
      <img src="error-image.png" width={937} height={666} />
    </Container>
  );
}
