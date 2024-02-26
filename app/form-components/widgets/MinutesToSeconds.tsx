import React, { useState, ChangeEvent } from 'react';
import { JSONSchema6 } from 'json-schema';
import { WidgetProps } from 'react-jsonschema-form';
import styled from 'styled-components';
import noop from 'lodash.noop';
import Input from '@button-inc/bcgov-theme/Input';
import InfoOverlay from 'components/InfoOverlay';

const Label = styled.span`
  display: inline-block;
  width: 200px;

  & label {
    font-weight: 700;
    font-size: 0.8rem;
  }
`;

const LeftInput = styled.span`
  display: inline-block;
  margin-right: 0.3rem;
  margin-bottom: 0.5rem;

  & input {
    height: 1.94rem;
    max-width: 3.125rem;
  }
`;

const MIN_1 = 60;

/**
 * Custom input to take in a number in minutes and save as a value in seconds.
 */
const MinutesToSeconds = ({ id, value = 0, label, readonly, onChange, schema }: WidgetProps) => {
  if (readonly) onChange = noop;
  const { tooltipContent = '' } = schema as JSONSchema6 & { tooltipContent?: string };
  const [time, setTime] = useState<string | number>(value / MIN_1);

  const handleNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    let parsedValue: string | number = event.target.value;
    if (parsedValue === '') {
      return setTime('');
    }
    const integer = parseInt(event.target.value);
    if (isNaN(integer) || integer < 0) return;
    parsedValue = integer;
    setTime(parsedValue);
    onChange(parsedValue * MIN_1);
  };

  const handleFocus = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === '0') {
      setTime('');
    }
  };

  const handleBlur = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === '') {
      setTime(0);
      onChange(0);
    }
  };

  return (
    <div>
      <Label>
        <label htmlFor={id}>{label}</label>&nbsp;
        <InfoOverlay content={tooltipContent} />
      </Label>

      <LeftInput>
        <Input
          type="text"
          size="small"
          maxLength={4}
          id={id}
          name={label}
          value={time.toString()}
          onChange={handleNumberChange}
          onFocus={handleFocus}
          disabled={readonly}
          onBlur={handleBlur}
        />
      </LeftInput>
      <span>Minutes</span>
    </div>
  );
};

export default MinutesToSeconds;
