import Dropdown from '@app/components/Dropdown';

export const DropdownWidget = (props: Props) => {
  const { id, value, required, disabled, readonly, options, onChange } = props;

  const { enumOptions = [] } = options;

  const selectedOption = enumOptions.find((opt: any) => opt.value === value);

  return (
    <Dropdown
      inputId={id}
      value={selectedOption}
      onChange={(option: any) => onChange(option ? option?.value : undefined)}
      options={enumOptions}
      isDisabled={disabled || readonly}
      isClearable={!required}
      styles={{
        control: (base, state) => ({
          ...base,
          border: '2px solid #606060',
          '&:hover': {},
          boxShadow: 'none',
          outline: state.isFocused ? '4px solid #3B99FC' : 'none',
          outlineOffset: '1px !important',
        }),
      }}
      required={required}
    />
  );
};

interface Props {
  id?: string;
  value?: any;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  options: {
    enumOptions?: { value: any; label: string }[];
  };
  onChange: (value: any) => void;
}
