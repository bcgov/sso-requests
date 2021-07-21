import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faMinusCircle } from '@fortawesome/free-solid-svg-icons';
import styled from 'styled-components';

const FieldContainer = styled.div`
  display: flex;
`;

const Description = styled.p`
  margin: 0;
`;

const AddContainer = styled.div`
  display: flex;
  align-items: start;
  &:hover {
    cursor: pointer;
  }
  margin-top: 10px;
`;

const RemoveContainer = styled(AddContainer)`
  padding: 10px 0 0 10px;
`;

const StyledP = styled.p`
  margin: 0;
  margin-top: 5px;
  font-size: 16px;
  font-weight: lighter;
  padding-left: 10px;
  color: #bbbbbb;
`;

export default function ArrayFieldTemplate(props: any) {
  const { TitleField, title } = props;
  const { description } = props.schema;
  return (
    <div>
      <TitleField title={title}>{title}</TitleField>
      {description && <Description>{description}</Description>}
      {props.items.map((element: any) => {
        return (
          <>
            {element.hasRemove && (
              <FieldContainer>
                {element.children}
                {element.index > 0 && (
                  <RemoveContainer onClick={element.onDropIndexClick(element.index)}>
                    <FontAwesomeIcon style={{ color: 'red' }} icon={faMinusCircle} size="2x" />
                    <StyledP>Remove URI</StyledP>
                  </RemoveContainer>
                )}
              </FieldContainer>
            )}
          </>
        );
      })}
      {props.canAdd && (
        <AddContainer onClick={props.onAddClick}>
          <FontAwesomeIcon style={{ color: '#006fc4' }} icon={faPlusCircle} onClick={props.onAddClick} size="2x" />
          <StyledP>Add another URI</StyledP>
        </AddContainer>
      )}
    </div>
  );
}
