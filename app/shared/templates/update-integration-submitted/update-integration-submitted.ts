export const updateIntegrationSubmitted = `
<h3>Hello Pathfinder SSO friend,</h3>
<p>Your Pathfinder SSO change request for integration ID {{integration.id}} is successfully submitted.</p>

{{#if changes}}
  <h4>Changes made:</h4>
  <blockquote>{{changes}}</blockquote>
  <hr />
{{/if}}

<h4>Final details summary:</h4>
<blockquote>{{> integrationDetail }}</blockquote>
<hr />
{{> processingTime }} {{#if waitingBceidProdApproval}} {{> createBceidBottom }} {{/if}} {{#if
waitingGithubProdApproval}} {{> hr }} {{> createGithubBottom }} {{/if}}{{#if waitingBcServicesCardProdApproval}} {{> hr
}} {{> createBcServicesCardBottom }} {{/if}}{{#if waitingSocialProdApproval}} {{> hr }} {{> createSocialBottom }}
{{/if}} {{#if (isNonProdDigitalCredentialRequest integration)}} {{> digitalCredentialInfoContact }} {{/if}} {{> footer
}}
`;
