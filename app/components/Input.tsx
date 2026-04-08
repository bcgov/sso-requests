type Props = {
  id?: string;
  name?: string;
  label?: string;
  value?: string;
  type?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  size?: 'small' | 'large';
  'data-testid'?: string;
  maxLength?: number;
  minLength?: number;
  readOnly?: boolean;
  fullWidth?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
};

export default function Input({
  id,
  name,
  label,
  value,
  onChange,
  size,
  'data-testid': dataTestId,
  maxLength,
  readOnly,
  fullWidth,
  onBlur,
  disabled,
  onFocus,
  minLength,
  type = 'text',
}: Readonly<Props>) {
  return (
    <>
      {label && <label style={{ fontWeight: 'bold', width: '100%' }}>{label}</label>}
      <input
        id={id}
        name={name}
        type={type}
        maxLength={maxLength}
        minLength={minLength}
        value={value}
        onChange={onChange}
        aria-label={label}
        readOnly={readOnly}
        style={{
          width: '100%',
          padding: '0.5em 0.6em',
          border: '2px solid #606060',
          borderRadius: '0.25em',
          fontSize: size === 'small' ? '0.8em' : '1em',
        }}
        data-testid={dataTestId}
        onBlur={onBlur}
        disabled={disabled}
        onFocus={onFocus}
      />
    </>
  );
}
