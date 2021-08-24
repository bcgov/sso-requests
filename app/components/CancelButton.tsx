import styled from 'styled-components';
import Button from '@button-inc/bcgov-theme/Button';

const CancelButton = styled(Button)`
  min-width: 150px;
  background-color: #b2b2b2;
  color: white;
  box-shadow: none !important;

  &:hover {
    box-shadow: 0px 0px 0px 2px #006fc4 inset !important;
    background-color: #b2b2b2;
  }
`;

export default CancelButton;
