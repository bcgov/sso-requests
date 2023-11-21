import React from 'react';
import { JSONSchema6 } from 'json-schema';
import { WidgetProps } from 'react-jsonschema-form';
import clsx from 'clsx';
import InfoOverlay from 'components/InfoOverlay';
import styled from 'styled-components';
import { SECONDARY_BLUE } from 'styles/theme';

const AlphaTag = styled.span`
  background: ${SECONDARY_BLUE};
  border-radius: 0.2em;
  padding: 0.1em 0.3em;
  text-transform: capitalize;
  color: white;
`;

// https://github.com/rjsf-team/react-jsonschema-form/blob/master/packages/core/src/components/widgets/CheckboxesWidget.js
function selectValue(value: string, selected: string[], all: string[]) {
  const at = all.indexOf(value);
  const updated = selected.slice(0, at).concat(value, selected.slice(at));
  // As inserting values at predefined index positions doesn't work with empty
  // arrays, we need to reorder the updated selection to match the initial order
  return updated.sort((a, b) => all.indexOf(a) - all.indexOf(b));
}

function deselectValue(value: string, selected: string[]) {
  return selected.filter((v) => v !== value);
}

function TooltipCheckboxesWidget(props: WidgetProps) {
  const { id, disabled, options, value, autofocus = false, readonly, onChange, schema } = props;
  const { enumOptions, enumDisabled, enumHidden, inline = false } = options;
  const { tooltips } = schema as JSONSchema6 & { tooltips: any[] };

  const eOptions = Array.isArray(enumOptions) ? enumOptions : [];
  const eDisabled = Array.isArray(enumDisabled) ? enumDisabled : [];
  const eHidden = Array.isArray(enumHidden) ? enumHidden : [];

  return (
    <div className="checkboxes" id={id}>
      {eOptions.map((option, index) => {
        const checked = value.indexOf(option.value) !== -1;
        const itemDisabled = eDisabled.indexOf(option.value) !== -1;
        const isDisabled = disabled || itemDisabled || readonly;
        const isHidden = eHidden.indexOf(option.value) !== -1;
        const checkbox = (
          <span>
            <input
              type="checkbox"
              id={`${id}_${index}`}
              checked={checked}
              disabled={disabled || itemDisabled || readonly}
              autoFocus={autofocus && index === 0}
              onChange={(event) => {
                const all = eOptions.map(({ value }) => value);
                if (event.target.checked) {
                  onChange(selectValue(option.value, value, all));
                } else {
                  onChange(deselectValue(option.value, value));
                }
              }}
            />
            <span>{option.label}</span>
            &nbsp;
            {tooltips[index]?.alpha && <AlphaTag>alpha</AlphaTag>}
            {tooltips[index] && <InfoOverlay {...tooltips[index]} />}
          </span>
        );

        const classes = clsx({
          'checkbox-inline': inline,
          checkbox: !inline,
          disabled: isDisabled,
          'd-none': isHidden,
        });

        if (inline) {
          return (
            <label key={index} className={classes}>
              {checkbox}
            </label>
          );
        } else {
          return (
            <div key={index} className={classes}>
              <label>{checkbox}</label>
            </div>
          );
        }
      })}
    </div>
  );
}

export default TooltipCheckboxesWidget;
