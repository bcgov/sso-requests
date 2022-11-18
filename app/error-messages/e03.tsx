export function getTemplate() {
  const title = 'Your IDIR account does not have an associated email address.';
  const content = (
    <text transform="translate(228 245)" fill="#777" fontSize="18" fontFamily="OpenSans, Open Sans">
      <tspan x="0" y="0">
        Please contact your IDIR account creator or
      </tspan>
      <tspan x="0" y="26">
        the Service Desk to have an email added to this IDIR.
      </tspan>
      <tspan x="130" y="55">
        Service Desk
      </tspan>
      <tspan x="130" y="81">
        Phone: 250-387-7000
      </tspan>
      <tspan x="130" y="107">
        Email:&nbsp;
        <a href="mailto:77000@gov.bc.ca" title="77000@gov.bc.ca" target="_blank" rel="noreferrer">
          77000@gov.bc.ca
        </a>
      </tspan>
    </text>
  );

  return [title, content];
}
