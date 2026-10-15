// Team member email inputs search IDIR users through the app's /idir-users endpoint, which calls an external directory
// and occasionally errors. The dropdown then only offers "Failed to fetch users". Occasionally the typed text also
// doesn't trigger a search at all. Watch the dropdown rather than the network, and retype if the user doesn't appear.

const IDIR_SEARCH_ATTEMPTS = 3;
const IDIR_SEARCH_TIMEOUT = 30000;
const IDIR_POLL_MS = 500;
const SEARCH_FAILED_LABEL = 'Failed to fetch users';

type SearchResult = 'found' | 'failed' | 'pending';

const optionMatches = (text: string, option: string | RegExp) =>
  typeof option === 'string' ? text.includes(option) : option.test(text);

const readResult = (doc: Document, option: string | RegExp): SearchResult => {
  const texts = Cypress.$(doc)
    .find('[role="option"]')
    .toArray()
    .map((el) => el.textContent || '');
  if (texts.some((text) => optionMatches(text, option))) return 'found';
  if (texts.some((text) => text.includes(SEARCH_FAILED_LABEL))) return 'failed';
  return 'pending';
};

const waitForResult = (option: string | RegExp, deadline: number): Cypress.Chainable<SearchResult> =>
  cy.document({ log: false }).then((doc) => {
    const result = readResult(doc, option);
    if (result !== 'pending' || Date.now() > deadline) return cy.wrap(result, { log: false });
    cy.wait(IDIR_POLL_MS, { log: false });
    return waitForResult(option, deadline);
  });

export const selectIdirUser = (index: number, query: string, option: string | RegExp, attempt = 1) => {
  const input = `[data-testid="team-member-email-input-${index}"]`;
  cy.get(input, { timeout: 10000 }).focus().clear({ force: true });
  cy.get(input).type(query, { force: true, delay: 50 });

  cy.then(() => waitForResult(option, Date.now() + IDIR_SEARCH_TIMEOUT)).then((result) => {
    if (result === 'found') {
      cy.contains('[role="option"]', option).click();
      return;
    }
    const outcome = `IDIR user search ${
      result === 'failed' ? 'failed' : 'returned no match'
    } on attempt ${attempt}/${IDIR_SEARCH_ATTEMPTS}`;
    if (attempt >= IDIR_SEARCH_ATTEMPTS) throw new Error(outcome);
    cy.log(outcome);
    selectIdirUser(index, query, option, attempt + 1);
  });
};
