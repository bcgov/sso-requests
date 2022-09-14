import React from 'react';
import { ArrayFieldTemplateProps } from 'react-jsonschema-form';
import styled from 'styled-components';
import isFunction from 'lodash.isfunction';
import noop from 'lodash.noop';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faMinusCircle } from '@fortawesome/free-solid-svg-icons';
import { MAX_STRING_FIELD_WIDTH } from 'styles/theme';
import InfoOverlay from 'components/InfoOverlay';

const FieldContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: ${MAX_STRING_FIELD_WIDTH};

  & div,
  & input {
    width: 100%;
    max-width: ${MAX_STRING_FIELD_WIDTH};
  }
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
  width: 20px !important;
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

export default function ArrayFieldTemplate(props: ArrayFieldTemplateProps) {
  const { formContext, title, items, schema } = props;
  const { description, tooltip, deletableIndex = 1, addItemText } = schema as any;
  const delIndex = isFunction(deletableIndex) ? deletableIndex(items) : parseInt(deletableIndex);

  return (
    <div>
      {title && (
        <Title>
          {title} {tooltip && <InfoOverlay {...tooltip} onClick={() => tooltip?.onClick(formContext) || noop} />}
        </Title>
      )}
      {description && <Description dangerouslySetInnerHTML={{ __html: description }} />}
      {items.map((element: any) => {
        return (
          <React.Fragment key={element.index}>
            {element.hasRemove && (
              <FieldContainer>
                {element.children}
                {element.index >= delIndex && (
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
