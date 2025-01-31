import React, { useState, ChangeEvent } from 'react';
import styled from 'styled-components';
import noop from 'lodash.noop';
import Input from '@button-inc/bcgov-theme/Input';
import { WidgetProps } from '@rjsf/utils/lib/types';

const LeftInput = styled.span`
  & input {
    height: 1.94rem;
    max-width: 3.125rem;
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: row;
  column-gap: 0.5em;
`;

const MIN_1 = 60;

/**
 * Custom input to take in a number in minutes and save as a value in seconds.
 */
const MinutesToSeconds = ({ id, value = 0, label, readonly, onChange }: WidgetProps) => {
  if (readonly) onChange = noop;
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
    <Container>
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
    </Container>
  );
};

export default MinutesToSeconds;
