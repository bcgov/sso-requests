export function getMaintenanceTemplate() {
  const title = "SSO is currently in recovery mode";
  const content = (
    <text transform="translate(228 245)" fill="#777" fontSize="18" fontFamily="OpenSans, Open Sans">
      <tspan x="0" y="0">
        The CSS app is unavailable at this time.
      </tspan>
      <tspan x="0" y="26">
        Please try again later once the SSO application has recovered.
      </tspan>
    </text>
  );

  return [title, content];
}
