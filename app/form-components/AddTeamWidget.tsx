import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import { FORM_TOP_SPACING } from 'styles/theme';
import { createTeamModalId } from 'utils/constants';
import ErrorText from 'components/ErrorText';

const Container = styled.div`
  display: grid;
  grid-template-columns: 20px 1fr;
  align-items: center;
  margin-top: ${FORM_TOP_SPACING};
  cursor: pointer;
`;

const Label = styled.label`
  font-weight: bold;
  cursor: pointer;
`;

const Description = styled.p`
  grid-column: 2;
  color: #7f7f7f;
`;

export default function AddTeamWidget(props: any) {
  const handleClick = () => {
    window.location.hash = createTeamModalId;
  };
  const { rawErrors } = props;
  const hasError = rawErrors && rawErrors.length > 0;

  return (
    <>
      <Container onClick={handleClick}>
        <FontAwesomeIcon style={{ color: '#006fc4' }} icon={faPlusCircle} onClick={props.onAddClick} title="Add Item" />
        <Label>Create a new team (optional)</Label>
        <Description>
          Add other members to help manage the integration, and re-use your teams across multiple integrations
        </Description>
      </Container>
      {hasError && <ErrorText>{rawErrors[0]}</ErrorText>}
    </>
  );
}
