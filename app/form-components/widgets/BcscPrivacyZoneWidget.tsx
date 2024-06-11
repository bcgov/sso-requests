import { WidgetProps } from 'react-jsonschema-form';
import { JSONSchema6 } from 'json-schema';
import Select, { MultiValue, ActionMeta, SingleValue } from 'react-select';
import { useState } from 'react';
import styled from 'styled-components';
import Link from '@button-inc/bcgov-theme/Link';

const BcscAttributeInfo = styled.p`
  margin-top: 0.5rem;
`;

function BcscPrivacyZoneWidget(props: WidgetProps) {
  const { id, disabled, options, value, onChange, schema } = props;
  const { enumOptions } = options;
  const { tooltips } = schema as JSONSchema6 & { tooltips: any[] };
  const eOptions = Array.isArray(enumOptions) ? enumOptions : [];
  const [privacyZone, setPrivacyZone] = useState<string>(value);

  const handlePrivacyZoneChange = async (newValue: SingleValue<{ value: string; label: string }>) => {
    setPrivacyZone(newValue?.value as string);
    onChange(newValue?.value as string);
  };

  return (
    <div>
      <Select
        options={eOptions}
        value={eOptions.find((option) => option.value === privacyZone)}
        onChange={handlePrivacyZoneChange}
        placeholder=""
        noOptionsMessage={() => 'No privacy zones found...'}
        isDisabled={disabled}
        isClearable={true}
        styles={{
          control: (base, state) => ({
            ...base,
            border: '2px solid #606060',
            '&:hover': {},
            boxShadow: 'none',
            outline: state.isFocused ? '4px solid #3B99FC' : 'none',
            outlineOffset: '1px',
          }),
        }}
      />
    </div>
  );
}

export default BcscPrivacyZoneWidget;
