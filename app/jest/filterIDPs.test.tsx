import { validateIDPs } from '@app/utils/helpers';

const sampleSession = {
  email: '',
  client_roles: ['sso-admin'],
  given_name: '',
  family_name: '',
  idir_userid: '',
};

describe('Github', () => {
  describe('Draft', () => {
    const applied = false;
    describe('Public', () => {
      it('Allows admins to add and remove', () => {
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubpublic'], session: sampleSession });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['githubpublic'], updatedIdps: [], session: sampleSession });
        expect(result).toEqual(true);
      });

      it('Allows regular users to remove only', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubpublic'],
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubpublic'],
          updatedIdps: [],
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(true);
      });
    });

    describe('BCGov', () => {
      it('Allows admins to add and remove', () => {
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubbcgov'], session: sampleSession });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['githubbcgov'], updatedIdps: [], session: sampleSession });
        expect(result).toEqual(true);
      });

      it('Allows regular users to add and remove', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubbcgov'],
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: [],
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(true);
      });
    });

    describe('Combinations', () => {
      it('Prevents both github options being selected for admins', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          session: sampleSession,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          session: sampleSession,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubpublic'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          session: sampleSession,
        });
        expect(result).toEqual(false);
      });

      it('Prevents both github options being selected for regulars', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubpublic'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(false);
      });

      it('Allows admins to switch type', () => {
        let result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubpublic'],
          session: sampleSession,
        });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['githubpublic'], updatedIdps: ['githubbcgov'], session: sampleSession });
        expect(result).toEqual(true);
      });
    });
  });

  describe('Post submission pre-approval', () => {
    const applied = true;
    describe('Public', () => {
      it('Allows admins to add and remove', () => {
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubpublic'], session: sampleSession });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['githubpublic'], updatedIdps: [], session: sampleSession });
        expect(result).toEqual(true);
      });

      it('Allows regular users to remove only', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubpublic'],
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubpublic'],
          updatedIdps: [],
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(true);
      });
    });

    describe('BCGov', () => {
      it('Allows admins to add and remove', () => {
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubbcgov'], session: sampleSession });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['githubbcgov'], updatedIdps: [], session: sampleSession });
        expect(result).toEqual(true);
      });

      it('Allows regular users to add and remove', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubbcgov'],
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: [],
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(true);
      });
    });

    describe('Combinations', () => {
      it('Prevents both github options being selected for admins', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          session: sampleSession,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          session: sampleSession,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubpublic'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          session: sampleSession,
        });
        expect(result).toEqual(false);
      });

      it('Allows admins to switch type', () => {
        let result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubpublic'],
          session: sampleSession,
        });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['githubpublic'], updatedIdps: ['githubbcgov'], session: sampleSession });
        expect(result).toEqual(true);
      });

      it('Prevents both github options being selected for regulars', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubpublic'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(false);
      });
    });
  });

  describe('Post approval', () => {
    const applied = true;
    const githubApproved = true;
    describe('Public', () => {
      it('Allows admins to remove only', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubpublic'],
          githubApproved,
          session: sampleSession,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubpublic'],
          updatedIdps: [],
          githubApproved,
          session: sampleSession,
        });
        expect(result).toEqual(true);
      });

      it('Allows regular users to remove only', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubpublic'],
          githubApproved,
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubpublic'],
          updatedIdps: [],
          githubApproved,
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(true);
      });

      it('Allows regular users to update other IDPs when github public already exists', () => {
        let result = validateIDPs({
          currentIdps: ['githubpublic', 'azureidir'],
          updatedIdps: ['githubpublic', 'digitalcredential'],
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(true);
      });
    });

    describe('BCGov', () => {
      it('Allows admins to remove only', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubbcgov'],
          githubApproved,
          session: sampleSession,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: [],
          githubApproved,
          session: sampleSession,
        });
        expect(result).toEqual(true);
      });

      it('Allows regular users to remove only', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubbcgov'],
          githubApproved,
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: [],
          githubApproved,
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(true);
      });
    });

    describe('Combinations', () => {
      it('Prevents both github options being selected for admins', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          session: sampleSession,
          githubApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          session: sampleSession,
          githubApproved,
        });
        expect(result).toEqual(false);
      });

      it('Prevents both github options being selected for regulars', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          session: { ...sampleSession, client_roles: [] },
          githubApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          session: { ...sampleSession, client_roles: [] },
          githubApproved,
        });
        expect(result).toEqual(false);
      });
    });
  });
});

describe('BCeID', () => {
  describe('Post submission pre-approval', () => {
    const applied = true;
    const bceidApproved = false;
    describe('Admin', () => {
      it('Allows adding and removing all bceid idps', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic'],
          bceidApproved,
          session: sampleSession,
        });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['bceidbasic'], updatedIdps: [], bceidApproved, session: sampleSession });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: [], updatedIdps: ['bceidboth'], bceidApproved, session: sampleSession });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['bceidboth'], updatedIdps: [], bceidApproved, session: sampleSession });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbusiness'],
          bceidApproved,
          session: sampleSession,
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: ['bceidbusiness'],
          updatedIdps: [],
          bceidApproved,
          session: sampleSession,
        });
        expect(result).toEqual(true);
      });

      it('Prevents combining bceidboth with others', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidboth'],
          session: sampleSession,
          bceidApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidboth'],
          session: sampleSession,
          bceidApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidbusiness', 'bceidboth'],
          session: sampleSession,
          bceidApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidbusiness'],
          session: sampleSession,
          bceidApproved,
        });
        expect(result).toEqual(true);
      });
    });

    describe('Regular User', () => {
      it('Allows adding and removing all bceid idps', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic'],
          bceidApproved,
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: ['bceidbasic'],
          updatedIdps: [],
          bceidApproved,
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidboth'],
          bceidApproved,
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: ['bceidboth'],
          updatedIdps: [],
          bceidApproved,
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbusiness'],
          bceidApproved,
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: ['bceidbusiness'],
          updatedIdps: [],
          bceidApproved,
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(true);
      });

      it('Prevents combining bceidboth with others', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidboth'],
          session: sampleSession,
          bceidApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidboth'],
          session: sampleSession,
          bceidApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidbusiness', 'bceidboth'],
          session: sampleSession,
          bceidApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidbusiness'],
          session: sampleSession,
          bceidApproved,
        });
        expect(result).toEqual(true);
      });
    });
  });

  describe('Post submission and approval', () => {
    const applied = true;
    const bceidApproved = true;
    describe('Admin', () => {
      it('Only allows removing idps', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic'],
          bceidApproved,
          session: sampleSession,
        });
        expect(result).toEqual(false);

        result = validateIDPs({ currentIdps: ['bceidbasic'], updatedIdps: [], bceidApproved, session: sampleSession });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: [], updatedIdps: ['bceidboth'], bceidApproved, session: sampleSession });
        expect(result).toEqual(false);

        result = validateIDPs({ currentIdps: ['bceidboth'], updatedIdps: [], bceidApproved, session: sampleSession });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbusiness'],
          bceidApproved,
          session: sampleSession,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['bceidbusiness'],
          updatedIdps: [],
          bceidApproved,
          session: sampleSession,
        });
        expect(result).toEqual(true);
      });
    });

    describe('Regular User', () => {
      it('Allows removing all bceid idps', () => {
        let result = validateIDPs({
          currentIdps: ['bceidboth'],
          updatedIdps: [],
          bceidApproved,
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: ['bceidbasic'],
          updatedIdps: [],
          bceidApproved,
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: ['bceidbusiness'],
          updatedIdps: [],
          bceidApproved,
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(true);
      });

      // Note: this is a strange requirement but intentional. A user can remove bceid and then add a different one,
      // But that process is needed as it resets approval and notifies the team.
      it('Prevents adding or changing any new bceid type', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidboth'],
          bceidApproved,
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic'],
          bceidApproved,
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbusiness'],
          bceidApproved,
          session: { ...sampleSession, client_roles: [] },
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['bceidbusiness'],
          updatedIdps: ['bceidbusiness'],
          session: { ...sampleSession, client_roles: [] },
          bceidApproved,
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: ['bceidbusiness'],
          updatedIdps: ['bceidbasic'],
          session: { ...sampleSession, client_roles: [] },
          bceidApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['bceidbusiness', 'bceidbasic'],
          updatedIdps: ['bceidboth'],
          session: { ...sampleSession, client_roles: [] },
          bceidApproved,
        });
        expect(result).toEqual(false);
      });
    });
  });
});

describe('SAML', () => {
  const applied = false;

  const protocol = 'saml';
  it('Only allows one identity provider', () => {
    let result = validateIDPs({
      currentIdps: ['azureidir'],
      updatedIdps: ['azureidir', 'bceidbasic'],
      session: { ...sampleSession, client_roles: [] },
      protocol,
    });
    expect(result).toEqual(false);

    result = validateIDPs({
      currentIdps: [],
      updatedIdps: ['azureidir', 'bceidbasic'],
      protocol,
      session: { ...sampleSession, client_roles: [] },
    });
    expect(result).toEqual(false);

    result = validateIDPs({
      currentIdps: [],
      updatedIdps: ['bceidbasic'],
      protocol,
      session: { ...sampleSession, client_roles: [] },
    });
    expect(result).toEqual(true);
  });

  it('prevents adding new bceid type once bceid is approved', () => {
    const bceidApproved = true;
    let result = validateIDPs({
      currentIdps: ['bceidbusiness'],
      updatedIdps: ['bceidbasic'],
      session: { ...sampleSession, client_roles: [] },
      protocol,
      bceidApproved,
    });
    expect(result).toEqual(false);

    result = validateIDPs({
      currentIdps: ['bceidbasic'],
      updatedIdps: ['bceidbusiness'],
      session: { ...sampleSession, client_roles: [] },
      protocol,
      bceidApproved,
    });
    expect(result).toEqual(false);

    result = validateIDPs({
      currentIdps: ['bceidbasic'],
      updatedIdps: ['bceidboth'],
      session: { ...sampleSession, client_roles: [] },
      protocol,
      bceidApproved,
    });
    expect(result).toEqual(false);
  });

  it('prevents removing bceid type once bceid is approved', () => {
    const bceidApproved = true;
    let result = validateIDPs({
      currentIdps: ['bceidbusiness'],
      updatedIdps: ['azureidir'],
      session: { ...sampleSession, client_roles: [] },
      protocol,
      bceidApproved,
    });
    expect(result).toEqual(false);
  });
});

describe('Discontinued', () => {
  it('Prevents regular users from adding idir in draft', () => {
    const applied = false;

    let result = validateIDPs({
      currentIdps: ['bceidbusiness'],
      updatedIdps: ['idir'],
      session: { ...sampleSession, client_roles: [] },
    });
    expect(result).toEqual(false);
  });

  it('Prevents regular users from adding idir post submission', () => {
    const applied = true;

    let result = validateIDPs({
      currentIdps: ['bceidbusiness'],
      updatedIdps: ['idir'],
      session: { ...sampleSession, client_roles: [] },
    });
    expect(result).toEqual(false);
  });

  it('Allows admin users to add idir in draft', () => {
    let result = validateIDPs({ currentIdps: ['bceidbusiness'], updatedIdps: ['idir'], session: sampleSession });
    expect(result).toEqual(true);
  });

  it('Allows admin users to add idir after creation', () => {
    let result = validateIDPs({ currentIdps: ['bceidbusiness'], updatedIdps: ['idir'], session: sampleSession });
    expect(result).toEqual(true);
  });

  it('Allows regular users to keep idir if present', () => {
    const applied = false;

    let result = validateIDPs({
      currentIdps: ['idir'],
      updatedIdps: ['idir'],
      session: { ...sampleSession, client_roles: [] },
    });
    expect(result).toEqual(true);
  });
});

describe('BCSC', () => {
  describe('post-approval', () => {
    it('Prevents all users removing bcsc after approval', () => {
      const applied = true;
      const bcServicesCardApproved = true;
      let isAdmin = false;
      let result = validateIDPs({
        currentIdps: ['bcservicescard'],
        updatedIdps: ['idir'],
        session: { ...sampleSession, client_roles: [] },
        bcServicesCardApproved,
      });
      expect(result).toEqual(false);

      result = validateIDPs({
        currentIdps: ['bcservicescard'],
        updatedIdps: ['idir'],
        session: sampleSession,
        bcServicesCardApproved,
      });
      expect(result).toEqual(false);
    });
  });
});

describe('OTP', () => {
  describe('Post Approval', () => {
    it('Allows admins to add and remove', () => {
      let result = validateIDPs({ currentIdps: [], updatedIdps: ['otp'], session: sampleSession });
      expect(result).toEqual(true);

      result = validateIDPs({ currentIdps: ['otp'], updatedIdps: [], session: sampleSession });
      expect(result).toEqual(true);
    });

    it('Allows regular users to remove only', () => {
      let result = validateIDPs({
        currentIdps: [],
        updatedIdps: ['otp'],
        session: { ...sampleSession, client_roles: [] },
      });
      expect(result).toEqual(false);

      result = validateIDPs({ currentIdps: ['otp'], updatedIdps: [], session: { ...sampleSession, client_roles: [] } });
      expect(result).toEqual(true);
    });

    it('Allows regular users to update other IDPs when OTP already exists', () => {
      let result = validateIDPs({
        currentIdps: ['otp', 'azureidir'],
        updatedIdps: ['otp', 'digitalcredential'],
        session: { ...sampleSession, client_roles: [] },
      });
      expect(result).toEqual(true);
    });
  });
});
