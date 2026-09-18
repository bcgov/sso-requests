import { validateIDPs } from '@app/utils/helpers';

// validateIDPs no longer reads the session: the caller says whether the actor
// may add a restricted IdP. Admin and non-admin are the two values of that flag.
const asAdmin = { canAddRestrictedIdps: true };
const asUser = { canAddRestrictedIdps: false };

describe('Github', () => {
  describe('Draft', () => {
    const applied = false;
    describe('Public', () => {
      it('Allows admins to add and remove', () => {
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubpublic'], ...asAdmin });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['githubpublic'], updatedIdps: [], ...asAdmin });
        expect(result).toEqual(true);
      });

      it('Allows regular users to remove only', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubpublic'],
          ...asUser,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubpublic'],
          updatedIdps: [],
          ...asUser,
        });
        expect(result).toEqual(true);
      });
    });

    describe('BCGov', () => {
      it('Allows admins to add and remove', () => {
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubbcgov'], ...asAdmin });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['githubbcgov'], updatedIdps: [], ...asAdmin });
        expect(result).toEqual(true);
      });

      it('Allows regular users to add and remove', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubbcgov'],
          ...asUser,
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: [],
          ...asUser,
        });
        expect(result).toEqual(true);
      });
    });

    describe('Combinations', () => {
      it('Prevents both github options being selected for admins', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          ...asAdmin,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          ...asAdmin,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubpublic'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          ...asAdmin,
        });
        expect(result).toEqual(false);
      });

      it('Prevents both github options being selected for regulars', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          ...asUser,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          ...asUser,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubpublic'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          ...asUser,
        });
        expect(result).toEqual(false);
      });

      it('Allows admins to switch type', () => {
        let result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubpublic'],
          ...asAdmin,
        });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['githubpublic'], updatedIdps: ['githubbcgov'], ...asAdmin });
        expect(result).toEqual(true);
      });
    });
  });

  describe('Post submission pre-approval', () => {
    const applied = true;
    describe('Public', () => {
      it('Allows admins to add and remove', () => {
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubpublic'], ...asAdmin });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['githubpublic'], updatedIdps: [], ...asAdmin });
        expect(result).toEqual(true);
      });

      it('Allows regular users to remove only', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubpublic'],
          ...asUser,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubpublic'],
          updatedIdps: [],
          ...asUser,
        });
        expect(result).toEqual(true);
      });
    });

    describe('BCGov', () => {
      it('Allows admins to add and remove', () => {
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubbcgov'], ...asAdmin });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['githubbcgov'], updatedIdps: [], ...asAdmin });
        expect(result).toEqual(true);
      });

      it('Allows regular users to add and remove', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubbcgov'],
          ...asUser,
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: [],
          ...asUser,
        });
        expect(result).toEqual(true);
      });
    });

    describe('Combinations', () => {
      it('Prevents both github options being selected for admins', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          ...asAdmin,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          ...asAdmin,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubpublic'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          ...asAdmin,
        });
        expect(result).toEqual(false);
      });

      it('Allows admins to switch type', () => {
        let result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubpublic'],
          ...asAdmin,
        });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['githubpublic'], updatedIdps: ['githubbcgov'], ...asAdmin });
        expect(result).toEqual(true);
      });

      it('Prevents both github options being selected for regulars', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          ...asUser,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          ...asUser,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubpublic'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          ...asUser,
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
          ...asAdmin,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubpublic'],
          updatedIdps: [],
          githubApproved,
          ...asAdmin,
        });
        expect(result).toEqual(true);
      });

      it('Allows regular users to remove only', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubpublic'],
          githubApproved,
          ...asUser,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubpublic'],
          updatedIdps: [],
          githubApproved,
          ...asUser,
        });
        expect(result).toEqual(true);
      });

      it('Allows regular users to update other IDPs when github public already exists', () => {
        let result = validateIDPs({
          currentIdps: ['githubpublic', 'azureidir'],
          updatedIdps: ['githubpublic', 'digitalcredential'],
          ...asUser,
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
          ...asAdmin,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: [],
          githubApproved,
          ...asAdmin,
        });
        expect(result).toEqual(true);
      });

      it('Allows regular users to remove only', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubbcgov'],
          githubApproved,
          ...asUser,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: [],
          githubApproved,
          ...asUser,
        });
        expect(result).toEqual(true);
      });
    });

    describe('Combinations', () => {
      it('Prevents both github options being selected for admins', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          ...asAdmin,
          githubApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          ...asAdmin,
          githubApproved,
        });
        expect(result).toEqual(false);
      });

      it('Prevents both github options being selected for regulars', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          ...asUser,
          githubApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          ...asUser,
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
          ...asAdmin,
        });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['bceidbasic'], updatedIdps: [], bceidApproved, ...asAdmin });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: [], updatedIdps: ['bceidboth'], bceidApproved, ...asAdmin });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['bceidboth'], updatedIdps: [], bceidApproved, ...asAdmin });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbusiness'],
          bceidApproved,
          ...asAdmin,
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: ['bceidbusiness'],
          updatedIdps: [],
          bceidApproved,
          ...asAdmin,
        });
        expect(result).toEqual(true);
      });

      it('Prevents combining bceidboth with others', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidboth'],
          ...asAdmin,
          bceidApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidboth'],
          ...asAdmin,
          bceidApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidbusiness', 'bceidboth'],
          ...asAdmin,
          bceidApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidbusiness'],
          ...asAdmin,
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
          ...asUser,
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: ['bceidbasic'],
          updatedIdps: [],
          bceidApproved,
          ...asUser,
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidboth'],
          bceidApproved,
          ...asUser,
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: ['bceidboth'],
          updatedIdps: [],
          bceidApproved,
          ...asUser,
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbusiness'],
          bceidApproved,
          ...asUser,
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: ['bceidbusiness'],
          updatedIdps: [],
          bceidApproved,
          ...asUser,
        });
        expect(result).toEqual(true);
      });

      it('Prevents combining bceidboth with others', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidboth'],
          ...asAdmin,
          bceidApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidboth'],
          ...asAdmin,
          bceidApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidbusiness', 'bceidboth'],
          ...asAdmin,
          bceidApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidbusiness'],
          ...asAdmin,
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
          ...asAdmin,
        });
        expect(result).toEqual(false);

        result = validateIDPs({ currentIdps: ['bceidbasic'], updatedIdps: [], bceidApproved, ...asAdmin });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: [], updatedIdps: ['bceidboth'], bceidApproved, ...asAdmin });
        expect(result).toEqual(false);

        result = validateIDPs({ currentIdps: ['bceidboth'], updatedIdps: [], bceidApproved, ...asAdmin });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbusiness'],
          bceidApproved,
          ...asAdmin,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['bceidbusiness'],
          updatedIdps: [],
          bceidApproved,
          ...asAdmin,
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
          ...asUser,
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: ['bceidbasic'],
          updatedIdps: [],
          bceidApproved,
          ...asUser,
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: ['bceidbusiness'],
          updatedIdps: [],
          bceidApproved,
          ...asUser,
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
          ...asUser,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic'],
          bceidApproved,
          ...asUser,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbusiness'],
          bceidApproved,
          ...asUser,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['bceidbusiness'],
          updatedIdps: ['bceidbusiness'],
          ...asUser,
          bceidApproved,
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: ['bceidbusiness'],
          updatedIdps: ['bceidbasic'],
          ...asUser,
          bceidApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['bceidbusiness', 'bceidbasic'],
          updatedIdps: ['bceidboth'],
          ...asUser,
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
      ...asUser,
      protocol,
    });
    expect(result).toEqual(false);

    result = validateIDPs({
      currentIdps: [],
      updatedIdps: ['azureidir', 'bceidbasic'],
      protocol,
      ...asUser,
    });
    expect(result).toEqual(false);

    result = validateIDPs({
      currentIdps: [],
      updatedIdps: ['bceidbasic'],
      protocol,
      ...asUser,
    });
    expect(result).toEqual(true);
  });

  it('prevents adding new bceid type once bceid is approved', () => {
    const bceidApproved = true;
    let result = validateIDPs({
      currentIdps: ['bceidbusiness'],
      updatedIdps: ['bceidbasic'],
      ...asUser,
      protocol,
      bceidApproved,
    });
    expect(result).toEqual(false);

    result = validateIDPs({
      currentIdps: ['bceidbasic'],
      updatedIdps: ['bceidbusiness'],
      ...asUser,
      protocol,
      bceidApproved,
    });
    expect(result).toEqual(false);

    result = validateIDPs({
      currentIdps: ['bceidbasic'],
      updatedIdps: ['bceidboth'],
      ...asUser,
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
      ...asUser,
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
      ...asUser,
    });
    expect(result).toEqual(false);
  });

  it('Prevents regular users from adding idir post submission', () => {
    const applied = true;

    let result = validateIDPs({
      currentIdps: ['bceidbusiness'],
      updatedIdps: ['idir'],
      ...asUser,
    });
    expect(result).toEqual(false);
  });

  it('Allows admin users to add idir in draft', () => {
    let result = validateIDPs({ currentIdps: ['bceidbusiness'], updatedIdps: ['idir'], ...asAdmin });
    expect(result).toEqual(true);
  });

  it('Allows admin users to add idir after creation', () => {
    let result = validateIDPs({ currentIdps: ['bceidbusiness'], updatedIdps: ['idir'], ...asAdmin });
    expect(result).toEqual(true);
  });

  it('Allows regular users to keep idir if present', () => {
    const applied = false;

    let result = validateIDPs({
      currentIdps: ['idir'],
      updatedIdps: ['idir'],
      ...asUser,
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
        ...asUser,
        bcServicesCardApproved,
      });
      expect(result).toEqual(false);

      result = validateIDPs({
        currentIdps: ['bcservicescard'],
        updatedIdps: ['idir'],
        ...asAdmin,
        bcServicesCardApproved,
      });
      expect(result).toEqual(false);
    });
  });
});

describe('OTP', () => {
  describe('Post Approval', () => {
    it('Allows admins to add and remove', () => {
      let result = validateIDPs({ currentIdps: [], updatedIdps: ['otp'], ...asAdmin });
      expect(result).toEqual(true);

      result = validateIDPs({ currentIdps: ['otp'], updatedIdps: [], ...asAdmin });
      expect(result).toEqual(true);
    });

    it('Allows regular users to remove only', () => {
      let result = validateIDPs({
        currentIdps: [],
        updatedIdps: ['otp'],
        ...asUser,
      });
      expect(result).toEqual(false);

      result = validateIDPs({ currentIdps: ['otp'], updatedIdps: [], ...asUser });
      expect(result).toEqual(true);
    });

    it('Allows regular users to update other IDPs when OTP already exists', () => {
      let result = validateIDPs({
        currentIdps: ['otp', 'azureidir'],
        updatedIdps: ['otp', 'digitalcredential'],
        ...asUser,
      });
      expect(result).toEqual(true);
    });
  });
});
