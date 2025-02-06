import React from 'react';
import InfoOverlay from 'components/InfoOverlay';
import { WidgetProps } from '@rjsf/utils/lib/types';

// see https://github.com/rjsf-team/react-jsonschema-form/blob/master/packages/core/src/components/widgets/RadioWidget.js
function TooltipRadioWidget(props: WidgetProps) {
  const {
    options,
    value,
    required,
    disabled,
    readonly,
    autofocus = false,
    onBlur,
    onFocus,
    onChange,
    id,
    schema,
  } = props;
  const name = Math.random().toString();
  const { enumOptions, enumDisabled, inline } = options;
  const { tooltips } = schema as any & { tooltips: any[] };

  const eOptions = Array.isArray(enumOptions) ? enumOptions : [];
  const eDisabled = Array.isArray(enumDisabled) ? enumDisabled : [];

  return (
    <div className="field-radio-group" id={id}>
      {eOptions.map((option, i) => {
        const checked = option.value === value;
        const itemDisabled = eDisabled.indexOf(option.value) !== -1;
        const disabledCls = disabled || itemDisabled || readonly ? 'disabled' : '';
        const radio = (
          <span>
            <input
              type="radio"
              checked={checked}
              name={name}
              required={required}
              value={option.value}
              disabled={disabled || itemDisabled || readonly}
              autoFocus={autofocus && i === 0}
              onChange={(_) => onChange(option.value)}
              onBlur={onBlur && ((event) => onBlur(id, event.target.value))}
              onFocus={onFocus && ((event) => onFocus(id, event.target.value))}
            />
            <span>{option.label}</span>
            &nbsp;
            {tooltips[i] && <InfoOverlay {...tooltips[i]} />}
          </span>
        );

        return inline ? (
          <label key={i} className={`radio-inline ${disabledCls}`}>
            {radio}
          </label>
        ) : (
          <div key={i} className={`radio ${disabledCls}`}>
            <label>{radio}</label>
          </div>
        );
      })}
    </div>
  );
}

export default TooltipRadioWidget;
