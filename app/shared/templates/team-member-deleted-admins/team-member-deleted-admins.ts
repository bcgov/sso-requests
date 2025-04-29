export const teamMemberDeletedAdmins = `
<p>A team member <strong>({{user.idirEmail}})</strong> has been removed from <strong>{{team.name}}</strong>.</p>
<p>
  To view your integrations please
  <a href="{{appUrl}}/my-dashboard/integrations" title="Log in" target="_blank" rel="noreferrer">Log in</a>.
</p>
{{> footer }}
`;
