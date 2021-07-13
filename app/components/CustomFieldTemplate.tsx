export default function CustomFieldTemplate(props: any) {
  const { id, classNames, label, help, required, description, errors, children } = props;
  return (
    <div className={classNames}>
      {description}
      {children}
      {errors}
      {help}
    </div>
  );
}
