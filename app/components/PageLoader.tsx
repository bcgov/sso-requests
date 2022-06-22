import { Grid as SpinnerGrid } from 'react-loader-spinner';
import styled from 'styled-components';
import { FORM_TOP_SPACING } from 'styles/theme';

const LoaderContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  margin-top: ${FORM_TOP_SPACING};

  & p {
    margin-top: 10px;
  }
`;

function PageLoader() {
  return (
    <LoaderContainer>
      <SpinnerGrid color="#000" height={45} width={45} visible />
      <p>Loading information...</p>
    </LoaderContainer>
  );
}

export default PageLoader;
