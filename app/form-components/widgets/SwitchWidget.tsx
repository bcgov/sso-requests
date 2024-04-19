import { WidgetProps } from 'react-jsonschema-form';
import Switch from 'react-switch';
import { JSONSchema6 } from 'json-schema';
import InfoOverlay from 'components/InfoOverlay';
import styled from 'styled-components';
import { useState } from 'react';

const Label = styled.span`
  display: inline-block;
  width: 200px;

  & label {
    font-weight: 700;
    font-size: 0.8rem;
  }
  margin-top: 0.3rem;
`;

function SwitchWidget(props: WidgetProps) {
  const { id, disabled, options, value, autofocus = false, readonly, onChange, schema, label } = props;
  const { tooltipContent = '' } = schema as JSONSchema6 & { tooltipContent?: string };
  const [checked, setChecked] = useState(value);
  return (
    <div style={{ display: 'flex' }}>
      <Label>
        <label htmlFor={id}>{label}</label>&nbsp;
        <InfoOverlay content={tooltipContent} />
      </Label>
      <span>
        <Switch
          checked={checked}
          onChange={() => {
            setChecked(!checked);
            onChange(!checked);
          }}
          onColor="#C3E3FC"
          onHandleColor="#2A6FBE"
          handleDiameter={30}
          uncheckedIcon={false}
          checkedIcon={false}
          boxShadow="0px 1px 5px rgba(0, 0, 0, 0.6)"
          activeBoxShadow="0px 0px 1px 10px rgba(0, 0, 0, 0.2)"
          height={15}
          width={48}
          className="react-switch"
          id="material-switch"
          disabled={disabled || readonly}
        />
      </span>
    </div>
  );
}

export default SwitchWidget;
