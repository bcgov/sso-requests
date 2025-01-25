class RequestPage {
  path: string = '/my-dashboard/integrations';

  projectName: string = '#root_projectName';
  loginNameDev: string = '#root_devLoginTitle';
  loginNameTest: string = '#root_testLoginTitle';
  loginNameProd: string = '#root_prodLoginTitle';
  teamId: string = '#root_teamId';
  publicAccess: string = '#root_publicAccess-Public';
  confidentialAccess: string = '#root_publicAccess-Confidential';
  identityProvider: string = '#root_devIdps';
  additionalRoleAttribute: string = '#root_additionalRoleAttribute';
  redirectUri: string = '#root_devValidRedirectUris_0';
  redirectUriTest: string = '#root_testValidRedirectUris_0';
  redirectUriProd: string = '#root_prodValidRedirectUris_0';
  agreeWithTerms: string = '#root_agreeWithTerms';
  confirmModal: string = '#info-modal';
  confirmDeleteModal: string = '#confirmation-modal';
  confirmDeleteButton: string = '[data-testid="confirm-delete-submitting-request"]';
  integrationsTable: string = 'table[role="table"] > tbody > tr > td:nth-child(1)';
  integrationsTableName: string = 'table[role="table"] > tbody > tr > td:nth-child(2)';
  integrationsTableStatus: string = 'table[role="table"] > tbody > tr > td:nth-child(3)';
  editButton: string = '[data-testid="action-button-edit"]';
  deleteConfirmationInput: string = '[data-testid="delete-confirmation-input"]';
  deleteButton: string = '[data-testid="action-button-delete"]';
  confirmDeleteInt: string = 'button[data-testid="confirm-delete-confirm-deletion"]';
  confirmDeleteIntModal: string = '[id^="delete-modal-"]';
  envDev: string = '#root_environments_0';
  envTest: string = '#root_environments_1';
  envProd: string = '#root_environments_2';
  tabTechDetails: string = '#rc-tabs-1-tab-tech-details';
  tabRoleManagement: string = '#rc-tabs-1-tab-role-management';
  tabUserRoleManagement: string = '#rc-tabs-1-tab-user-role-management';
  tabHistory: string = '#rc-tabs-1-tab-history';
  usesTeam: string = '#root_usesTeam';
  usesDisplayHeaderDev: string = '#root_devDisplayHeaderTitle';
  usesDisplayHeaderTest: string = '#root_testDisplayHeaderTitle';
  usesDisplayHeaderProd: string = '#root_prodDisplayHeaderTitle';
  projectLead: string = '#root_projectLead';
  requestIntegration: string = '[data-testid="request-integration"]';
  clientProtocol: string = '#root_protocol [type="radio"]';
  root_authType: string = '#root_authType [type="radio"]';
  // Preview Tab
  prev_Tab: string = '[data-testid="stage-review-submit"]';
  prev_AssociatedTeam: string = '[data-testid="associated-team"]';
  prev_Accountable: string = '[data-testid="you-accountable"]';
  prev_clientProtocol: string = '[data-testid="client-protocol"]';
  prev_ClientTypeTeam: string = '[data-testid="client-type-team"]';
  prev_UseCase: string = '[data-testid="use-case"]';
  prev_ProjectName: string = '[data-testid="project-name"]';
  prev_AddRoleAttribute: string = '[data-testid="add-role-attrib"]';
  prev_IdpRequired: string = '[data-testid="idp-required"]';
  prev_DevUri: string = '[data-testid="dev-uri"]';
  prev_TestUri: string = '[data-testid="test-uri"]';
  prev_ProdUri: string = '[data-testid="prod-uri"]';

  // Stages
  stageRequesterInfo: string = '[data-testid="stage-requester-info"]';
  stageBasicInfo: string = '[data-testid="stage-basic-info"]';
  stageDevelopment: string = '[data-testid="stage-development"]';
  stageTest: string = '[data-testid="stage-test"]';
  stageProduction: string = '[data-testid="stage-production"]';
  stageReviewSubmit: string = '[data-testid="stage-review-submit"]';

  // Roles
  createRoleButton: string = '[data-testid="create-role-button"]';
  roleNameInputField: string = '[data-testid="role-name-input-field"]';
  roleEnvironment = 'input[id^="react-select-"]';
  confirmCreateNewRole: string = '[data-testid="modal-confirm-btn-create-new-role"]';
  confirmDeleteRole: string = '[data-testid="modal-confirm-btn-delete-role"]';
  envSelect: string = 'input[id^="react-select-"]'; // eq(0)
  idpSelect: string = 'input[id^="react-select-"]'; // eq(1)
  criterionSelect: string = 'input[id^="react-select-"]'; // eq(2)
  pagingSelect: string = 'input[id^="react-select-"]'; // eq(3)
  assignSelect: string = 'input[id^="react-select-"]'; // eq(4)

  //IDIM Search
  idimSearchButton: string = 'button[data-testid="idim-search-button"]';
  idimWebserviceLookup: string = '#idim-webservice-lookup';
  idimViewDetails: string = 'svg[data-icon="eye"]';
  idimAdditionalUserInfo: string = 'div#additiona-user-info';
  idimCancelAddUserInfo: string = '[data-testid="modal-cancel-btn-additional-user-info"]';
  idimDownloadUser: string = 'svg[data-icon="download"]';

  idpLabels = {
    idirMFALabel: 'IDIR - MFA',
    basicBceidLabel: 'Basic BCeID',
    businessBceidLabel: 'Business BCeID',
    basicOrBusinessBceidLabel: 'Basic or Business BCeID',
    githubBCGovLabel: 'GitHub BC Gov',
    digitalCredentialLabel: 'Digital Credential',
    bcscLabel: 'BC Services Card',
  };

  // In info modal, click close button
  confirmClose() {
    cy.get(this.confirmModal).find(this.confirmDeleteButton).click();
  }

  confirmDelete(confirm: Boolean) {
    if (confirm) {
      cy.get(this.confirmDeleteModal).find(this.confirmDeleteButton).click();
      //data-testid="confirm-delete-submitting-request"
    }
  }

  confirmDeleteIntegration(id: string, projectName: string) {
    cy.get('#delete-modal-' + Number(id)).then(($modal) => {
      const confirmationInput = Cypress.$(this.deleteConfirmationInput);
      if (confirmationInput.length) {
        cy.wrap($modal).find(this.deleteConfirmationInput, { timeout: 3000 }).type(projectName, { force: true });
      }
      cy.wrap($modal).find(this.confirmDeleteInt).contains('Delete').click({ force: true });
    });
  }

  submitRequest(submit: Boolean) {
    if (submit) {
      cy.get('button').contains('Submit').click();
    }
  }

  updateRequest(update: Boolean) {
    if (update) {
      cy.get('button').contains('Update').click();
    }
  }

  setProjectName(projName: string) {
    cy.get(this.projectName).clear();
    cy.get(this.projectName).type(projName);
  }

  setClientProtocol(protocol: string) {
    cy.get(this.clientProtocol + '[value="' + protocol + '"]').check();
  }

  setAuthType(type: string) {
    cy.get(this.root_authType + '[value="' + type + '"]').check();
  }

  setLoginNameDev(logName: string) {
    cy.get(this.loginNameDev).clear();
    cy.get(this.loginNameDev).type(logName);
  }

  setLoginNameTest(logName: string) {
    cy.get(this.loginNameTest).clear();
    cy.get(this.loginNameTest).type(logName);
  }

  setLoginNameProd(logName: string) {
    cy.get(this.loginNameProd).clear();
    cy.get(this.loginNameProd).type(logName);
  }

  setEnvironment(env: string[]) {
    // Clean current settings
    cy.get(this.envTest).uncheck();
    cy.get(this.envProd).uncheck();

    if (env.includes('test')) {
      cy.get(this.envTest).check();
    }
    if (env.includes('prod')) {
      cy.get(this.envProd).check();
    }
    if (env.includes('dev')) {
      // Dev is default so no action required
    }
  }

  setTeamId(teamId: string) {
    cy.get(this.teamId).select(teamId);
  }

  setTeamName(teamName: string) {
    cy.get(this.teamId).select(teamName);
  }

  agreeWithTrms(agreeWithTerms: boolean) {
    if (agreeWithTerms) {
      cy.get(this.agreeWithTerms).check();
    }
  }

  startRequest() {
    cy.visit('/my-dashboard');
    cy.get(this.requestIntegration).click();
  }

  setTeam(team: boolean) {
    if (team) {
      cy.get(this.usesTeam).check({ force: true });
    } else {
      cy.get(this.usesTeam).uncheck({ force: true });
    }
  }

  setHeaderTitleDev(header: boolean) {
    if (header) {
      cy.get(this.usesDisplayHeaderDev).check({ force: true });
    } else {
      cy.get(this.usesDisplayHeaderDev).uncheck({ force: true });
    }
  }

  setHeaderTitleTest(header: boolean) {
    if (header) {
      cy.get(this.usesDisplayHeaderTest).check({ force: true });
    } else {
      cy.get(this.usesDisplayHeaderTest).uncheck({ force: true });
    }
  }

  setHeaderTitleProd(header: boolean) {
    if (header) {
      cy.get(this.usesDisplayHeaderProd).check({ force: true });
    } else {
      cy.get(this.usesDisplayHeaderProd).uncheck({ force: true });
    }
  }

  setProjectLead(lead: boolean) {
    if (lead) {
      cy.get(this.projectLead).check({ force: true });
    } else {
      cy.get(this.projectLead).uncheck({ force: true });
    }
  }

  pageNext() {
    cy.get('button').contains('Next').click();
  }

  setPublicAccess(publicAccess: boolean) {
    if (publicAccess) {
      cy.get(this.publicAccess).check();
    } else {
      cy.get(this.confidentialAccess).check();
    }
  }

  // Set search Parameters for "Assign Users to Roles"
  setRoleEnvironment(env: string) {
    cy.get(this.envSelect)
      .eq(0)
      .type(env + '{enter}');
  }
  setRoleIdp(idp: string) {
    cy.get(this.idpSelect)
      .eq(1)
      .type(idp + '{enter}');
  }
  setRoleCriterion(criterion: string) {
    cy.get(this.criterionSelect)
      .eq(2)
      .type(criterion + '{enter}');
  }
  setRolePaging(paging: string) {
    cy.get(this.pagingSelect)
      .eq(3)
      .type(paging + '{enter}');
  }
  setRoleSearch(search: string) {
    cy.get('input[placeholder="Enter search criteria"]').clear().type(search);
    cy.get('button').contains('Search').click({ force: true });
  }
  setRoleAssignSelect(assign: string) {
    cy.get(this.assignSelect)
      .eq(4)
      .type(assign + '{enter}');
    cy.get('p').contains('Last saved at ').wait(5000);
  }
  setRolePickUser(user: string) {
    cy.get('[data-testid="role-search-table"] td')
      .contains(user)
      .parent()
      .then(($row) => {
        cy.wrap($row).click();
      });
  }

  // Clears all checkboxes and rechecks included idps
  setIdentityProvider(identityProviders: string[]) {
    Object.entries(this.idpLabels).forEach(([label, matcher]) => {
      cy.contains(matcher).find('input[type="checkbox"]').uncheck();
      if (identityProviders.some((idpLabel) => idpLabel.match(matcher))) {
        cy.contains(matcher).find('input[type="checkbox"]').check();
      }
    });
  }

  setadditionalRoleAttribute(additionalRoleAttribute: string) {
    if (additionalRoleAttribute) {
      cy.get(this.additionalRoleAttribute).clear();
      cy.get(this.additionalRoleAttribute).type(additionalRoleAttribute);
    }
  }

  getFirstRequestID(): string {
    let id: string = '';
    cy.get(this.integrationsTable)
      .first()
      .then(($id) => {
        id = $id.text();
      });
    return id;
  }

  selectPrivacyZone(privacyZone: string) {
    cy.log('Set privacy log called');
    if (privacyZone) {
      cy.log('Set privacy log called two');
      cy.get('[data-testid="bcsc-privacy-zone"]').type(privacyZone + '{enter}');
    }
  }

  selectBCSCAttributes(attributes: string[]) {
    cy.log('Set attribute called');
    if (attributes) {
      cy.log('Set attribute log called 2');
      attributes.forEach(function (attribute) {
        cy.get('[data-testid="bcsc-attributes"]').type(attribute + '{enter}');
      });
      cy.get('[data-testid="bcsc-attributes"]').type('{esc}');
    }
  }
}

export default RequestPage;
