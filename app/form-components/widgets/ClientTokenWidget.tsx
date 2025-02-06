import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import noop from 'lodash.noop';
import Input from '@button-inc/bcgov-theme/Input';
import Dropdown from '@button-inc/bcgov-theme/Dropdown';
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

const RightDropdown = styled.span`
  display: inline-block;

  & select {
    width: 100px;
  }

  & select:disabled {
    margin: 0;
  }
`;

const MIN_1 = 60;
const HOUR_1 = MIN_1 * 60;
const DAY_1 = HOUR_1 * 24;

const ClientTokenWidget = ({ id, value = 0, label, readonly, onChange }: WidgetProps) => {
  if (readonly) onChange = noop;

  const [time, setTime] = useState(0);
  const [unit, setUnit] = useState('Minutes');

  const convertSeconds = (seconds: number) => {
    if (seconds === 0) {
      setTime(0);
      setUnit('Minutes');
      return;
    }

    let time = seconds;
    let unit = 'Seconds';

    if (time % 60 === 0) {
      unit = 'Minutes';
      time = time / 60;
    }

    if (time % 60 === 0) {
      unit = 'Hours';
      time = time / 60;
    }

    if (time % 24 === 0) {
      unit = 'Days';
      time = time / 24;
    }

    setTime(time);
    setUnit(unit);
  };

  useEffect(() => {
    convertSeconds(value);
  }, [value]);

  const handleNumberChange = (event: any) => {
    const value = event.target.value;
    let number = parseInt(value);
    if (isNaN(number)) number = 0;
    let seconds = number;

    if (unit === 'Minutes') {
      seconds *= MIN_1;
    } else if (unit === 'Hours') {
      seconds *= HOUR_1;
    } else {
      seconds *= DAY_1;
    }

    if (seconds > 31536000) seconds = 31536000;
    onChange(seconds);
    setTime(number);
  };

  const handleTypeChange = (event: any) => {
    const value = event.target.value;
    let seconds = 0;
    if (value === 'Minutes') {
      seconds = time * MIN_1;
    } else if (value === 'Hours') {
      seconds = time * HOUR_1;
    } else {
      seconds = time * DAY_1;
    }

    if (seconds > 31536000) seconds = 31536000;
    onChange(seconds);
    setUnit(value);
  };

  return (
    <Container>
      <LeftInput>
        <Input
          type="text"
          size="small"
          id={id}
          name={label}
          value={time.toString()}
          onChange={handleNumberChange}
          disabled={readonly}
        />
      </LeftInput>
      <RightDropdown>
        <Dropdown size="small" onChange={handleTypeChange} value={unit} disabled={readonly}>
          <option>Minutes</option>
          <option>Hours</option>
          <option>Days</option>
        </Dropdown>
      </RightDropdown>
    </Container>
  );
};

export default ClientTokenWidget;
