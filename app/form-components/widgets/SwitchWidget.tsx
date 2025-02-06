import Switch from 'react-switch';
import { useState } from 'react';
import { WidgetProps } from '@rjsf/utils/lib/types';

function SwitchWidget(props: WidgetProps) {
  const { id, disabled, value, readonly, onChange } = props;
  const [checked, setChecked] = useState(value === undefined ? props.schema.default : value);
  return (
    <div style={{ display: 'flex' }}>
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
        id={id}
        disabled={disabled || readonly}
      />
    </div>
  );
}

export default SwitchWidget;
