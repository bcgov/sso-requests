export const teamInvitation = `
<p>Hello Pathfinder SSO friend,</p>
<p>
  You are invited to join <strong>{{team.name}} (#{{team.id}})</strong>. You have been invited as a
  <strong>Team {{capitalize role}}</strong> which gives you the
  <strong>privilege to {{getRolePrivelege role}}</strong> the integration.
</p>
<p>
  Please follow this <a href="{{apiUrl}}/teams/verify?token={{invitationLink}}">link</a> to view your invitation in the
  dashboard. The link will expire in <strong>2 business days.</strong> If the link has expired,
  <a href="https://stackoverflow.developer.gov.bc.ca/questions/1231">please see this helpful tip</a>.
</p>
<p>
  If you think you have received this invite by accident, or have any other questions, please contact the Pathfinder SSO
  team by
  <a href="https://chat.developer.gov.bc.ca/channel/sso" target="_blank" title="Rocket Chat" rel="noreferrer">
    rocketchat
  </a>
  or reply to this email.
</p>

<p>Thank you,<br />Pathfinder SSO Team</p>
`;
