import styled from 'styled-components';
import errorImage from 'svg/error';

const Container = styled.div`
  text-align: center;
`;

export default function ApplicationError() {
  return <Container>{errorImage}</Container>;
}
