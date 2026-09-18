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
  allowNoAccess?: boolean;
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
  allowNoAccess = false,
  disabled = false,
  id,
  ariaLabel,
}: Readonly<Props>) {
  const currentPreset = value ? presetFor(value) : null;
  const offersNoAccess = allowNoAccess || currentPreset === 'none';
  const available = ORG_FACING_PRESETS.filter(
    (name) => (name !== 'none' || offersNoAccess) && (!boundedBy || isSubset(PRESETS[name], boundedBy)),
  );

  const options: Option[] = [
    ...(allowInherit
      ? [{ value: INHERIT, label: `Same as all integrations (${describePermissions(inheritedFrom)})` } as Option]
      : []),
    ...(value && !currentPreset ? [{ value: CUSTOM, label: describePermissions(value) } as Option] : []),
    ...available.map((name) => ({ value: name, label: PRESET_LABELS[name] })),
  ];

  const selected = currentPreset ?? (value ? CUSTOM : allowInherit ? INHERIT : null);

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
