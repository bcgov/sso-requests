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
  margin-top: 10px;
`;

const RemoveContainer = styled(AddContainer)`
  padding: 15px 0 0 10px;
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
      {props.items.map((element: any) => {
        return (
          <div key={element.index}>
            {element.hasRemove && (
              <FieldContainer>
                {element.children}
                {element.index > 0 && (
                  <RemoveContainer onClick={element.onDropIndexClick(element.index)}>
                    <FontAwesomeIcon style={{ color: 'red' }} icon={faMinusCircle} />
                  </RemoveContainer>
                )}
              </FieldContainer>
            )}
          </div>
        );
      })}
      {props.canAdd && (
        <AddContainer onClick={props.onAddClick}>
          <FontAwesomeIcon style={{ color: '#006fc4' }} icon={faPlusCircle} onClick={props.onAddClick} />
          <StyledP>Add another URI</StyledP>
        </AddContainer>
      )}
    </div>
  );
}
