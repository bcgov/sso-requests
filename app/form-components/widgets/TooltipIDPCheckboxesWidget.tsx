import clsx from 'clsx';
import InfoOverlay from 'components/InfoOverlay';
import styled from 'styled-components';
import { SECONDARY_BLUE } from 'styles/theme';
import { RJSFSchema, WidgetProps } from '@rjsf/utils/lib/types';

const AlphaTag = styled.span`
  background: ${SECONDARY_BLUE};
  border-radius: 0.2em;
  padding: 0.1em 0.3em;
  text-transform: capitalize;
  color: white;
`;

const WarningText = styled.p`
  font-style: italic;
  margin-top: 0.2em;
`;

function selectValue(value: string, selected: string[], all: string[]) {
  const at = all.indexOf(value);
  const updated = selected.slice(0, at).concat(value, selected.slice(at));
  return updated.sort((a, b) => all.indexOf(a) - all.indexOf(b));
}

function deselectValue(value: string, selected: string[]) {
  return selected.filter((v) => v !== value);
}

/**
 * Customized checkboxes widget for IDP selection. For a generic checkboxes example see https://github.com/rjsf-team/react-jsonschema-form/blob/main/packages/core/src/components/widgets/CheckboxesWidget.tsx
 */
function TooltipIDPCheckboxesWidget(props: WidgetProps) {
  const { id, disabled, options, value, autofocus = false, readonly, onChange, schema } = props;
  const { enumOptions, idpsDisabled = [], enumHidden, inline = false } = options;
  const { tooltips, warningMessage } = schema as RJSFSchema & {
    tooltips: { content: string; hide?: number; alpha?: boolean }[];
    warningMessage: string;
  };

  const eOptions = Array.isArray(enumOptions) ? enumOptions : [];
  const eDisabled = Array.isArray(idpsDisabled) ? idpsDisabled.map((item) => item.idp) : [];
  const eHidden = Array.isArray(enumHidden) ? enumHidden : [];

  const getReasonForDisabled = (idp: string) => {
    const disabledItem = (idpsDisabled as Array<{ idp: string; reason: string }>).find((item) => item.idp === idp);
    return disabledItem ? disabledItem.reason : '';
  };

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
            &nbsp;
            {itemDisabled && getReasonForDisabled(option.value) !== '' && (
              <span style={{ color: 'red' }}>{getReasonForDisabled(option.value)}</span>
            )}
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
            <label key={option.value} className={classes}>
              {checkbox}
            </label>
          );
        } else {
          return (
            <div key={option.value} className={classes}>
              <label>{checkbox}</label>
            </div>
          );
        }
      })}
      {warningMessage && <WarningText>*Note: {warningMessage}</WarningText>}
    </div>
  );
}

export default TooltipIDPCheckboxesWidget;
