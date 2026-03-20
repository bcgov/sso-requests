class HomePage {
  path: string = '/';
  title: string = 'Common Hosted Single Sign-on';

  clickLoginButton() {
    cy.get('button').contains('Log in').trigger('click');
  }
}

export default HomePage;
