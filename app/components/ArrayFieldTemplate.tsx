import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import styled from 'styled-components';

const FieldContainer = styled.div`
  display: grid;
  grid-template-columns: 4fr 1fr;
`;

const AddContainer = styled.div`
  display: flex;
  align-items: start;
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
      {props.items.map((element: any, i: number) => {
        if (i === props.items.length - 1) {
          return (
            <FieldContainer>
              {element.children}
              {props.canAdd && (
                <AddContainer>
                  <FontAwesomeIcon
                    style={{ color: '#006fc4' }}
                    icon={faPlusCircle}
                    onClick={props.onAddClick}
                    size="2x"
                  />
                  <StyledP>Add another URL</StyledP>
                </AddContainer>
              )}
            </FieldContainer>
          );
        }
        return <FieldContainer>{element.children}</FieldContainer>;
      })}
    </div>
  );
}
