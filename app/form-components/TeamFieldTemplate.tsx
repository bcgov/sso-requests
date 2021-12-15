import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import { FORM_TOP_SPACING } from 'styles/theme';
import Modal from 'components/CenteredModal';
import TeamForm from 'form-components/TeamForm';

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

export default function TeamFieldTemplate(props: any) {
  const { classNames, help, description, errors, children } = props;
  const modalId = 'create-team';
  const handleClick = () => {
    window.location.hash = modalId;
  };

  return (
    <>
      <div className={classNames}>
        {description}
        {children}
        {errors}
        {help}
      </div>
      <Container onClick={handleClick}>
        <FontAwesomeIcon style={{ color: '#006fc4' }} icon={faPlusCircle} onClick={props.onAddClick} title="Add Item" />
        <Label>Create a new team (optional)</Label>
        <Description>
          Add other members to help manage the integration, and re-use your teams across multiple integrations
        </Description>
      </Container>
      <Modal
        title="Create a new team"
        icon={null}
        onConfirm={() => {}}
        id={modalId}
        content={<TeamForm />}
        showCancel={false}
        showConfirm={false}
        closable
      />
    </>
  );
}
