import Select, { Props } from 'react-select';

export default function Dropdown(props: Props & { size?: string }) {
  return (
    <Select
      {...props}
      styles={{
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        menu: (base) => ({ ...base, zIndex: 9999 }),
        control: (base, state) => ({
          ...base,
          border: '2px solid #606060',
          '&:hover': {},
          boxShadow: 'none',
          outline: state.isFocused ? '4px solid #3B99FC' : 'none',
          minHeight: props.size ? '1.94rem' : undefined,
          height: props.size ? '1.94rem' : undefined,
        }),
        singleValue: (base) => ({ ...base, ...(props.size ? { marginBottom: '1.94rem' } : {}) }),
        indicatorsContainer: (base) => ({ ...base, ...(props.size ? { height: '1.94rem' } : {}) }),
      }}
    />
  );
}
