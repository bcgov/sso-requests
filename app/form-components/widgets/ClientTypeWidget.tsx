import React, { useState } from 'react';
import { WidgetProps } from 'react-jsonschema-form';
import styled from 'styled-components';
import { isNil } from 'lodash';
import SolutionNavigator from 'page-partials/new-request/SolutionNavigator';
import Link from '@button-inc/bcgov-theme/Link';

const InputGroup = styled.div`
  margin-top: 5px;
  margin-bottom: 5px;

  & > input {
    margin-right: 5px;
  }
`;

interface Schema {
  enum: boolean[];
  enumNames: string[];
}

const ClientTypeWidget = ({ id, value, onChange, onBlur, schema }: WidgetProps) => {
  const { enum: enumValues, enumNames } = schema as Schema;
  const [openModal, setOpenModal] = useState(false);

  const handleChange = (result: string) => {
    setOpenModal(false);
    if (result !== 'cancel') {
      onChange(result === 'public');
    }
  };

  if (isNil(value)) {
    onChange(true);
    value = true;
  }

  return (
    <div>
      {enumNames.map((name, index) => (
        <InputGroup key={name}>
          <input
            type="radio"
            id={`${id}-${name}`}
            name={id}
            value={name}
            checked={enumValues[index] === value}
            onChange={() => onChange(enumValues[index])}
            onBlur={() => onBlur(id, value)}
          />
          <label htmlFor={`${id}-${name}`}>{name}</label>
        </InputGroup>
      ))}
      <div>
        <Link onClick={() => setOpenModal(true)} style={{ cursor: 'pointer' }}>
          Click here
        </Link>
        {` `}to get help deciding which client type to use.
      </div>
      <SolutionNavigator id="client-helper" open={openModal} onChange={handleChange} />
    </div>
  );
};

export default ClientTypeWidget;
