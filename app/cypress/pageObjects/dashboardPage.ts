class DashboardPage {
  path: string = '/admin-dashboard';
  confirmDigitalCredentialButton: string = '[data-testid="confirm-delete-digital-credential-approve"]';
  confirmBceidButton: string = '[data-testid="confirm-delete-bceid-approve"]';
  confirmGithubButton: string = '[data-testid="confirm-delete-github-approve"]';
  confirmBCSCButton: string = '[data-testid="confirm-delete-bc-services-card-approve"]';
  confirmSocialButton: string = '[data-testid="confirm-delete-social-approve"]';

  selectRequest(name: string) {
    cy.contains('td', name, { timeout: 10000 }).parent().click();
  }
}

export default DashboardPage;
