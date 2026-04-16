export default function Textarea({
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
  rows = 4,
  placeholder,
}: Readonly<Props>) {
  return (
    <>
      {label && <label style={{ fontWeight: 'bold', width: '100%' }}>{label}</label>}
      <textarea
        id={id}
        name={name}
        maxLength={maxLength}
        value={value}
        onChange={onChange}
        aria-label={label}
        readOnly={readOnly}
        style={{
          width: fullWidth ? '100%' : '50%',
          padding: '0.5em 0.6em',
          border: '2px solid #606060',
          borderRadius: '0.25em',
          fontSize: size === 'small' ? '0.8em' : '1em',
        }}
        data-testid={dataTestId}
        onBlur={onBlur}
        disabled={disabled}
        onFocus={onFocus}
        rows={rows}
        placeholder={placeholder}
      />
    </>
  );
}

type Props = {
  id?: string;
  name?: string;
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  size?: 'small' | 'large';
  'data-testid'?: string;
  maxLength?: number;
  readOnly?: boolean;
  fullWidth?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  placeholder?: string;
};
