import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faMinusCircle } from '@fortawesome/free-solid-svg-icons';
import styled from 'styled-components';
import React from 'react';
import { MAX_STRING_FIELD_WIDTH } from 'styles/theme';
import InfoOverlay from 'components/InfoOverlay';

const FieldContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: ${MAX_STRING_FIELD_WIDTH};
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
  top: 10px;
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
  const { description, tooltipTitle, tooltipContent, deletableIndex = 1, hide = 250, addItemText } = props.schema;

  return (
    <div>
      {title && (
        <Title>
          {title}{' '}
          {tooltipContent && <InfoOverlay tooltipTitle={tooltipTitle} tooltipContent={tooltipContent} hide={hide} />}
        </Title>
      )}
      {description && <Description>{description}</Description>}
      {props.items.map((element: any) => {
        return (
          <React.Fragment key={element.index}>
            {element.hasRemove && (
              <FieldContainer>
                {element.children}
                {element.index >= deletableIndex && (
                  <RemoveContainer onClick={element.onDropIndexClick(element.index)}>
                    <FontAwesomeIcon style={{ color: 'red' }} icon={faMinusCircle} title="Remove Item" />
                  </RemoveContainer>
                )}
              </FieldContainer>
            )}
          </React.Fragment>
        );
      })}
      {props.canAdd && (
        <AddContainer onClick={props.onAddClick}>
          <FontAwesomeIcon
            style={{ color: '#006fc4' }}
            icon={faPlusCircle}
            onClick={props.onAddClick}
            title="Add Item"
          />
          <StyledP>{addItemText}</StyledP>
        </AddContainer>
      )}
    </div>
  );
}
