export function getTemplate() {
  const title = 'Invalid IDIR account';
  const content = (
    <text transform="translate(228 245)" fill="#777" fontSize="18" fontFamily="OpenSans, Open Sans">
      <tspan x="0" y="0">
        Please contact your IDIR account creator or
      </tspan>
      <tspan x="0" y="26">
        the Service Desk to have an email added to this IDIR.
      </tspan>
      <tspan x="0" y="55">
        Service Desk, Phone: 250-387-7000, Email: 77000@gov.bc.ca
      </tspan>
    </text>
  );

  return [title, content];
}
