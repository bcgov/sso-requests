import { WidgetProps } from 'react-jsonschema-form';
import { JSONSchema6 } from 'json-schema';
import Select, { MultiValue, ActionMeta } from 'react-select';
import { useState } from 'react';
import styled from 'styled-components';
import Link from '@button-inc/bcgov-theme/Link';

const BcscAttributeInfo = styled.p`
  margin-top: 0.5rem;
`;

function BcscAttributesWidget(props: WidgetProps) {
  const { id, disabled, options, value, autofocus = false, readonly, onChange, schema, rawErrors } = props;
  const { enumOptions, enumDisabled, enumHidden, inline = false } = options;
  const { tooltips } = schema as JSONSchema6 & { tooltips: any[] };
  const eOptions = Array.isArray(enumOptions) ? enumOptions : [];
  const [attributes, setAttributes] = useState<string[]>(value);

  const handleAttributeChange = async (
    newValue: MultiValue<{ value: string; label: string }>,
    actionMeta: ActionMeta<{
      value: string;
      label: string;
    }>,
  ) => {
    let newAttributes: string[] = [];
    if (actionMeta.action === 'clear') {
      newAttributes = [];
    } else if (actionMeta.action === 'remove-value') {
      newAttributes = attributes.filter((attr) => attr !== actionMeta.removedValue?.value);
    } else if (actionMeta.action === 'pop-value') {
      newAttributes = [...attributes.slice(0, -1)];
    } else {
      newAttributes = [...attributes, actionMeta.option?.value as string];
    }
    setAttributes(newAttributes);
    onChange(newAttributes);
  };

  return (
    <div>
      <div>
        <Select
          isMulti={true}
          options={eOptions}
          value={eOptions.filter((option) => value.includes(option.value))}
          onChange={handleAttributeChange}
          placeholder=""
          noOptionsMessage={() => 'No attributes found...'}
          isClearable={true}
          isDisabled={disabled}
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
        <BcscAttributeInfo>
          <Link href={'https://id.gov.bc.ca/oauth2/claim-types'} external>
            Click here
          </Link>
          {` `}to learn more about available attributes.
        </BcscAttributeInfo>
      </div>
    </div>
  );
}

export default BcscAttributesWidget;
