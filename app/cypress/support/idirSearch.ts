// Team member email inputs search IDIR users through the app's /idir-users endpoint, which calls an external directory
// and occasionally errors. The dropdown then only offers "Failed to fetch users", so retype to search again.
// Only the HTTP status is logged, as CI logs are public.

const IDIR_SEARCH_ATTEMPTS = 3;
const IDIR_SEARCH_TIMEOUT = 60000;
const IDIR_RETRY_DELAY_MS = 2000;

export const selectIdirUser = (index: number, query: string, option: string | RegExp, attempt = 1) => {
  const alias = Cypress._.uniqueId('idirSearch');
  cy.intercept({ method: 'GET', pathname: '**/idir-users' }).as(alias);

  const input = `[data-testid="team-member-email-input-${index}"]`;
  cy.get(input, { timeout: 10000 }).focus().clear({ force: true });
  cy.get(input).type(query, { force: true, delay: 50 });

  cy.wait(`@${alias}`, { timeout: IDIR_SEARCH_TIMEOUT, log: false }).then(({ response }) => {
    const status = response?.statusCode;
    if (status !== undefined && status < 400) {
      cy.contains('[role="option"]', option, { timeout: 10000 }).click();
      return;
    }
    const outcome = `IDIR user search failed (status ${
      status ?? 'none'
    }) on attempt ${attempt}/${IDIR_SEARCH_ATTEMPTS}`;
    if (attempt >= IDIR_SEARCH_ATTEMPTS) throw new Error(outcome);
    cy.log(outcome);
    cy.wait(IDIR_RETRY_DELAY_MS * attempt, { log: false });
    selectIdirUser(index, query, option, attempt + 1);
  });
};
