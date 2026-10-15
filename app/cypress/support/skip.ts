// Tests that act on an integration depend on an earlier test creating it. If that failed, there is no id to work with;
// skip instead of failing with an unrelated error, so the report points at the real failure.
export const skipUnlessCreated = (ctx: Mocha.Context, request: { id?: string }) => {
  if (!request.id) {
    cy.log('Skipping: the integration was not created by the earlier test');
    ctx.skip();
  }
};
