import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { noop } from 'lodash';
import Input from '@app/components/Input';
import { WidgetProps } from '@rjsf/utils/lib/types';
import Dropdown from '@app/components/Dropdown';

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
  width: 150px;
`;

const MIN_1 = 60;
const HOUR_1 = MIN_1 * 60;
const DAY_1 = HOUR_1 * 24;

const timeUnitOptions = [
  { label: 'Minutes', value: 'Minutes' },
  { label: 'Hours', value: 'Hours' },
  { label: 'Days', value: 'Days' },
];

const ClientTokenWidget = ({ id, value = 0, label, readonly, uiSchema, onChange }: WidgetProps) => {
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

  const handleTypeChange = (selectedOption: { label: string; value: string }) => {
    const value = selectedOption.value;
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

  if (readonly) {
    let displayedValue = value;

    // 0 value indicates unset, so inherits the realm setting.
    if (displayedValue === 0) {
      displayedValue = uiSchema?.['ui:inheritedRealmSetting'] || 'Inherited from realm setting';
    } else {
      displayedValue = `${time} ${unit}`;
    }

    return (
      <Container>
        <span id={id}>{displayedValue}</span>
      </Container>
    );
  }

  return (
    <Container>
      <LeftInput>
        <Input
          id={id}
          name={label}
          value={time.toString()}
          onChange={handleNumberChange}
          disabled={readonly}
          size="small"
        />
      </LeftInput>
      <RightDropdown>
        <Dropdown
          size="small"
          onChange={(option: any) => handleTypeChange(option)}
          value={timeUnitOptions.find((option) => option.value === unit)}
          isDisabled={readonly}
          options={timeUnitOptions}
        />
      </RightDropdown>
    </Container>
  );
};

export default ClientTokenWidget;
