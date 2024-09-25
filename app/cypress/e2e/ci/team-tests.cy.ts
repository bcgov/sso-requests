// Creation of team variants

import data from '../../fixtures/teams.json'; // The data file will drive the tests
import Team from '../../appActions/Team';
import Utilities from '../../appActions/Utilities';
let util = new Utilities();
let testData = data;

describe('Create Teams', () => {
  const teams: Team[] = [];

  const cleanup = () => {
    cy.clearAllCookies();
    cy.setid(null).then(() => {
      cy.login();
    });
    teams.forEach((team) => {
      team.deleteTeam();
    });
    cy.logout();
  };

  after(() => {
    cleanup();
  });

  beforeEach(() => {
    cy.clearAllCookies();
    cy.setid(null).then(() => {
      cy.login();
    });
  });

  afterEach(() => {
    cy.logout();
  });

  // Iterate through the JSON file and create a team for each entry
  // The set up below allows for reporting on each test case
  testData.forEach((data, index) => {
    // Only run the test if the smoketest flag is set and the test is a smoketest
    if (util.runOk(data)) {
      // Keeping teams for cleanup
      let team = new Team();
      teams.push(team);

      it(`Create "${data.create.teamname}" (Test ID: ${data.create.test_id}) - ${data.create.description}`, () => {
        team.populateCreateContent(data);
        team.createTeam();
      });

      it(`Update "${data.update.teamname}" (Test ID: ${data.create.test_id}) - ${data.create.description}`, () => {
        team.populateUpdateContent(data);
        team.updateTeam();
      });
    }
  });
});
