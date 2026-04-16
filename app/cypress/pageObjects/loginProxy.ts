class LoginProxy {
  path: string = '/';

  idirButton: string = '#social-idir';
  azidirButton: string = '#social-azureidir';
  headerWrapper: string = '#kc-header-wrapper';
  headerText: string = 'COMMON HOSTED SINGLE SIGN-ON';

  checkLoginProxyPage() {
    cy.get(this.headerWrapper).contains(this.headerText).should('be.visible');
  }

  chooseLogin(accountType: 'idir' | 'azureidir') {
    if (accountType === 'idir') {
      cy.get(this.idirButton).click();
    } else if (accountType === 'azureidir' || accountType === 'admin') {
      cy.get(this.azidirButton).click();
    } else {
      cy.log('Invalid Account Type');
    }
  }
}

export default LoginProxy;
