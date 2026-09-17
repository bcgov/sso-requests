import React from 'react';
import Dropdown from 'components/Dropdown';
import {
  ORG_FACING_PRESETS,
  PRESETS,
  PRESET_DESCRIPTIONS,
  PRESET_LABELS,
  Permission,
  PresetName,
  describePermissions,
  isSubset,
  presetFor,
} from '@sso/authz';

export const INHERIT = '__inherit__';
const CUSTOM = '__custom__';

interface Option {
  value: PresetName | typeof INHERIT | typeof CUSTOM;
  label: string;
}

interface Props {
  value: Permission[] | null;
  onChange: (permissions: Permission[] | null) => void;
  boundedBy?: Permission[];
  /** Offers "same as the whole team", which is how an override is removed. */
  allowInherit?: boolean;
  inheritedFrom?: Permission[];
  disabled?: boolean;
  id: string;
  ariaLabel: string;
}

function PresetPicker({
  value,
  onChange,
  boundedBy,
  allowInherit = false,
  inheritedFrom = [],
  disabled = false,
  id,
  ariaLabel,
}: Readonly<Props>) {
  const available = ORG_FACING_PRESETS.filter((name) => !boundedBy || isSubset(PRESETS[name], boundedBy));
  const currentPreset = value ? presetFor(value) : null;

  const options: Option[] = [
    ...(allowInherit
      ? [{ value: INHERIT, label: `Same as all integrations (${describePermissions(inheritedFrom)})` } as Option]
      : []),
    ...(value && !currentPreset ? [{ value: CUSTOM, label: describePermissions(value) } as Option] : []),
    ...available.map((name) => ({ value: name, label: PRESET_LABELS[name] })),
  ];

  const selected = currentPreset ?? (value ? CUSTOM : allowInherit ? INHERIT : 'none');

  return (
    <Dropdown
      inputId={id}
      aria-label={ariaLabel}
      options={options}
      value={options.find((option) => option.value === selected) ?? null}
      isDisabled={disabled}
      isSearchable={false}
      onChange={(option: any) => {
        if (option.value === CUSTOM) return;
        onChange(option.value === INHERIT ? null : [...PRESETS[option.value as PresetName]]);
      }}
      formatOptionLabel={(option: any) => (
        <span
          title={
            option.value === INHERIT || option.value === CUSTOM
              ? undefined
              : PRESET_DESCRIPTIONS[option.value as PresetName]
          }
        >
          {option.label}
        </span>
      )}
    />
  );
}

export default PresetPicker;
