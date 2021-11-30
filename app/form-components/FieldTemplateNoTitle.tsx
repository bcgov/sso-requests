export default function FieldTemplateNoTitle(props: any) {
  const { classNames, help, description, errors, children } = props;

  return (
    <div className={classNames}>
      {description}
      {children}
      {errors}
      {help}
    </div>
  );
}
