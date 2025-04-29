export const restoreIntegration = `
<h3>Hello Pathfinder SSO friend,</h3>
<p>Your Pathfinder SSO request ID {{integration.id}} has been restored from deletion.</p>
{{#if hasClientSecret}}
  <strong>Please note that the client secret has been reset so you will have to update your application config to use this
    integration.</strong>
{{/if}}
<p>Below is a summary of your integration request details:</p>
{{> integrationDetail }} {{> footer }}
`;
