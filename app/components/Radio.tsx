export default function Radio(props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <div>
      <input type="radio" {...props} />
      {props.label && <label style={{ marginLeft: '8px' }}>{props.label}</label>}
    </div>
  );
}
