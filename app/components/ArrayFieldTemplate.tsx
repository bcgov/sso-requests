import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faMinusCircle } from '@fortawesome/free-solid-svg-icons';
import styled from 'styled-components';

const FieldContainer = styled.div`
  display: grid;
  grid-template-columns: 4fr 1fr;
`;

const AddContainer = styled.div`
  display: flex;
  align-items: start;
  &:hover {
    cursor: pointer;
  }
`;

const RemoveContainer = styled(AddContainer)`
  padding: 10px 0 0 10px;
`;

const StyledP = styled.p`
  margin: 0;
  font-size: 16px;
  font-weight: lighter;
  padding-left: 10px;
  color: #bbbbbb;
`;

export default function ArrayFieldTemplate(props: any) {
  const { TitleField, title } = props;
  return (
    <div>
      <TitleField title={title}>{title}</TitleField>
      {props.items.map((element: any) => {
        return (
          <>
            {element.hasRemove && (
              <FieldContainer>
                {element.children}
                {element.index > 0 && (
                  <RemoveContainer onClick={element.onDropIndexClick(element.index)}>
                    <FontAwesomeIcon style={{ color: 'red' }} icon={faMinusCircle} size="2x" />
                    <StyledP>Remove URL</StyledP>
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
          <StyledP>Add another URL</StyledP>
        </AddContainer>
      )}
    </div>
  );
}
