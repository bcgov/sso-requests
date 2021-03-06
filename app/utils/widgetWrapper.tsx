// @ts-nocheck
import React from 'react';

function getValue(inputType) {
  switch (inputType) {
    case 'checkbox':
      return 'checked';
    case 'file':
      return 'files';
    default:
      return 'value';
  }
}

const WidgetWrapper = (Component, inputType: string = '') => {
  const valueKey = getValue(inputType);
  return (props) => {
    const { value, onChange, label, schema, options, required, disabled, onBlur, id = '', readonly } = props;
    const { pattern, minLength, maxLength, placeholder, fullWidth, rows } = schema;
    const { enumOptions = [] } = options;
    const formProps = {
      onChange: (e) => {
        let newValue = e.target[valueKey];
        if (newValue === '') newValue = undefined;
        if (newValue === 'true') newValue = true;
        if (newValue === 'false') newValue = false;
        onChange(newValue);
      },
      label,
      name,
      maxLength,
      id,
      required,
      disabled,
      minLength,
      type: inputType,
      pattern,
      onBlur,
      fullWidth,
      rows,
      readOnly: readonly,
      value: value || '',
      placeholder,
      checked: typeof value === 'undefined' ? false : value,
    };
    if (inputType === 'file') {
      delete formProps.value;
    }

    if (inputType === 'checkbox') {
      formProps.value = true;
    }

    if (inputType === 'radio') {
      return (
        <div>
          <label>{label}</label>
          {enumOptions.map((option) => (
            <Component
              key={option.value}
              {...formProps}
              label={option.label}
              value={option.value}
              checked={option.value === value}
              style={{ padding: '2px 0' }}
              size="small"
              readOnly={readonly}
              onBlur={onBlur}
            />
          ))}
        </div>
      );
    }
    return (
      <Component {...formProps} onBlur={onBlur && ((event) => onBlur(id, event.target.value))}>
        {enumOptions &&
          enumOptions.map(({ value: enumValue, label: enumLabel }) => {
            return (
              <option key={enumValue} value={enumValue}>
                {enumLabel}
              </option>
            );
          })}
      </Component>
    );
  };
};

export default WidgetWrapper;
