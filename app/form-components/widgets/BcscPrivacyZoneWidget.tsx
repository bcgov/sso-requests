import Select, { SingleValue } from 'react-select';
import { useState } from 'react';
import styled from 'styled-components';
import Link from '@button-inc/bcgov-theme/Link';
import { WidgetProps } from '@rjsf/utils/lib/types';

const BcscPrivacyZoneInfo = styled.p`
  margin-top: 0.5rem;
`;

function BcscPrivacyZoneWidget(props: WidgetProps) {
  const { disabled, options, value, onChange } = props;
  const { enumOptions } = options;
  const eOptions = Array.isArray(enumOptions) ? enumOptions : [];
  const [privacyZone, setPrivacyZone] = useState<string>(value);

  const handlePrivacyZoneChange = async (newValue: SingleValue<{ value: string; label: string }>) => {
    setPrivacyZone(newValue?.value as string);
    onChange(newValue?.value as string);
  };

  return (
    <>
      <div data-testid="bcsc-privacy-zone">
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
      <div>
        <BcscPrivacyZoneInfo>
          <Link href={'https://bcgov.github.io/sso-docs/advanced/bc-services-card'} external>
            Click here
          </Link>
          {` `}to learn more about privacy zones.
        </BcscPrivacyZoneInfo>
      </div>
    </>
  );
}

export default BcscPrivacyZoneWidget;
