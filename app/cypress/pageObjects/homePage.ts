class HomePage {
  path: string = '/';

  clickLoginButton() {
    cy.get('button').contains('Log in').trigger('click');
  }
}

export default HomePage;
