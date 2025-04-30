export const createTeamApiAccountSubmitted = `
<h1>Your Pathfinder SSO CSS API Account has been requested.</h1>
<p>
  <strong>Team Name: </strong>{{team.name}}<br />
  <strong>Submitted by: </strong>{{requester}}<br />
  {{#if integrations}}
    <strong>Integrations:</strong>
  {{/if}}
</p>
<ul>
  {{#each integrations}}
    <li>{{id}} - {{projectName}}</li>
  {{/each}}
</ul>
<p>
  Please Log in to your dashboard to access the CSS API Account. If you are not the requester, this email serves only to
  notify you of the request status.
</p>

{{> footer }}
`;
