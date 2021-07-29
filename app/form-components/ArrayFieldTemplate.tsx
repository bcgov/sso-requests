import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faMinusCircle } from '@fortawesome/free-solid-svg-icons';
import styled from 'styled-components';
import React from 'react';

const FieldContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 400px;
`;

const Description = styled.p`
  margin: 0;
`;

const AddContainer = styled.div`
  display: inline-block;
  &:hover {
    cursor: pointer;
  }
  margin-top: 0;
`;

const RemoveContainer = styled(AddContainer)`
  position: absolute;
  right: 10px;
  top: 30px;
`;

const StyledP = styled.p`
  display: inline-block;
  margin: 0;
  margin-top: 5px;
  font-size: 16px;
  font-weight: lighter;
  padding-left: 10px;
  color: #bbbbbb;
`;

const Title = styled.legend`
  font-weight: bold;
  font-size: 1rem;
  margin: 0;
`;

export default function ArrayFieldTemplate(props: any) {
  const { title } = props;
  const { description } = props.schema;

  return (
    <div>
      {title && <Title>{title}</Title>}
      {description && <Description>{description}</Description>}
      {props.items.map((element: any) => {
        return (
          <React.Fragment key={element.index}>
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
          </React.Fragment>
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
