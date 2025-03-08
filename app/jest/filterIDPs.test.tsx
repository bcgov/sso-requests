import { validateIDPs } from '@app/utils/helpers';

describe('Github', () => {
  describe('Draft', () => {
    const applied = false;
    describe('Public', () => {
      it('Allows admins to add and remove', () => {
        const isAdmin = true;
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubpublic'], applied, isAdmin });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['githubpublic'], updatedIdps: [], applied, isAdmin });
        expect(result).toEqual(true);
      });

      it('Allows regular users to remove only', () => {
        const isAdmin = false;
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubpublic'], applied, isAdmin });
        expect(result).toEqual(false);

        result = validateIDPs({ currentIdps: ['githubpublic'], updatedIdps: [], applied, isAdmin });
        expect(result).toEqual(true);
      });
    });

    describe('BCGov', () => {
      it('Allows admins to add and remove', () => {
        const isAdmin = true;
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubbcgov'], applied, isAdmin });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['githubbcgov'], updatedIdps: [], applied, isAdmin });
        expect(result).toEqual(true);
      });

      it('Allows regular users to add and remove', () => {
        const isAdmin = false;
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubbcgov'], applied, isAdmin });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['githubbcgov'], updatedIdps: [], applied, isAdmin });
        expect(result).toEqual(true);
      });
    });

    describe('Combinations', () => {
      it('Prevents both github options being selected for admins', () => {
        const isAdmin = true;
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubbcgov', 'githubpublic'], applied, isAdmin });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          applied,
          isAdmin,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubpublic'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          applied,
          isAdmin,
        });
        expect(result).toEqual(false);
      });

      it('Prevents both github options being selected for regulars', () => {
        const isAdmin = false;
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubbcgov', 'githubpublic'], applied, isAdmin });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          applied,
          isAdmin,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubpublic'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          applied,
          isAdmin,
        });
        expect(result).toEqual(false);
      });

      it('Allows admins to switch type', () => {
        const isAdmin = true;
        let result = validateIDPs({ currentIdps: ['githubbcgov'], updatedIdps: ['githubpublic'], applied, isAdmin });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['githubpublic'], updatedIdps: ['githubbcgov'], applied, isAdmin });
        expect(result).toEqual(true);
      });
    });
  });

  describe('Post submission pre-approval', () => {
    const applied = true;
    describe('Public', () => {
      it('Allows admins to add and remove', () => {
        const isAdmin = true;
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubpublic'], applied, isAdmin });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['githubpublic'], updatedIdps: [], applied, isAdmin });
        expect(result).toEqual(true);
      });

      it('Allows regular users to remove only', () => {
        const isAdmin = false;
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubpublic'], applied, isAdmin });
        expect(result).toEqual(false);

        result = validateIDPs({ currentIdps: ['githubpublic'], updatedIdps: [], applied, isAdmin });
        expect(result).toEqual(true);
      });
    });

    describe('BCGov', () => {
      it('Allows admins to add and remove', () => {
        const isAdmin = true;
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubbcgov'], applied, isAdmin });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['githubbcgov'], updatedIdps: [], applied, isAdmin });
        expect(result).toEqual(true);
      });

      it('Allows regular users to add and remove', () => {
        const isAdmin = false;
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubbcgov'], applied, isAdmin });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['githubbcgov'], updatedIdps: [], applied, isAdmin });
        expect(result).toEqual(true);
      });
    });

    describe('Combinations', () => {
      it('Prevents both github options being selected for admins', () => {
        const isAdmin = true;
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubbcgov', 'githubpublic'], applied, isAdmin });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          applied,
          isAdmin,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubpublic'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          applied,
          isAdmin,
        });
        expect(result).toEqual(false);
      });

      it('Allows admins to switch type', () => {
        const isAdmin = true;
        let result = validateIDPs({ currentIdps: ['githubbcgov'], updatedIdps: ['githubpublic'], applied, isAdmin });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['githubpublic'], updatedIdps: ['githubbcgov'], applied, isAdmin });
        expect(result).toEqual(true);
      });

      it('Prevents both github options being selected for regulars', () => {
        const isAdmin = false;
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubbcgov', 'githubpublic'], applied, isAdmin });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          applied,
          isAdmin,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubpublic'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          applied,
          isAdmin,
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
        const isAdmin = true;
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubpublic'], applied, isAdmin, githubApproved });
        expect(result).toEqual(false);

        result = validateIDPs({ currentIdps: ['githubpublic'], updatedIdps: [], applied, isAdmin, githubApproved });
        expect(result).toEqual(true);
      });

      it('Allows regular users to remove only', () => {
        const isAdmin = false;
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubpublic'], applied, isAdmin, githubApproved });
        expect(result).toEqual(false);

        result = validateIDPs({ currentIdps: ['githubpublic'], updatedIdps: [], applied, isAdmin, githubApproved });
        expect(result).toEqual(true);
      });
    });

    describe('BCGov', () => {
      it('Allows admins to remove only', () => {
        const isAdmin = true;
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubbcgov'], applied, isAdmin, githubApproved });
        expect(result).toEqual(false);

        result = validateIDPs({ currentIdps: ['githubbcgov'], updatedIdps: [], applied, isAdmin, githubApproved });
        expect(result).toEqual(true);
      });

      it('Allows regular users to remove only', () => {
        const isAdmin = false;
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['githubbcgov'], applied, isAdmin, githubApproved });
        expect(result).toEqual(false);

        result = validateIDPs({ currentIdps: ['githubbcgov'], updatedIdps: [], applied, isAdmin, githubApproved });
        expect(result).toEqual(true);
      });
    });

    describe('Combinations', () => {
      it('Prevents both github options being selected for admins', () => {
        const isAdmin = true;
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          applied,
          isAdmin,
          githubApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          applied,
          isAdmin,
          githubApproved,
        });
        expect(result).toEqual(false);
      });

      it('Prevents both github options being selected for regulars', () => {
        const isAdmin = false;
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          applied,
          isAdmin,
          githubApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['githubbcgov'],
          updatedIdps: ['githubbcgov', 'githubpublic'],
          applied,
          isAdmin,
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
      const isAdmin = true;
      it('Allows adding and removing all bceid idps', () => {
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['bceidbasic'], applied, isAdmin, bceidApproved });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['bceidbasic'], updatedIdps: [], applied, isAdmin, bceidApproved });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: [], updatedIdps: ['bceidboth'], applied, isAdmin, bceidApproved });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['bceidboth'], updatedIdps: [], applied, isAdmin, bceidApproved });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: [], updatedIdps: ['bceidbusiness'], applied, isAdmin, bceidApproved });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['bceidbusiness'], updatedIdps: [], applied, isAdmin, bceidApproved });
        expect(result).toEqual(true);
      });

      it('Prevents combining bceidboth with others', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidboth'],
          applied,
          isAdmin,
          bceidApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidboth'],
          applied,
          isAdmin,
          bceidApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidbusiness', 'bceidboth'],
          applied,
          isAdmin,
          bceidApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidbusiness'],
          applied,
          isAdmin,
          bceidApproved,
        });
        expect(result).toEqual(true);
      });
    });

    describe('Regular User', () => {
      const isAdmin = false;
      it('Allows adding and removing all bceid idps', () => {
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['bceidbasic'], applied, isAdmin, bceidApproved });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['bceidbasic'], updatedIdps: [], applied, isAdmin, bceidApproved });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: [], updatedIdps: ['bceidboth'], applied, isAdmin, bceidApproved });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['bceidboth'], updatedIdps: [], applied, isAdmin, bceidApproved });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: [], updatedIdps: ['bceidbusiness'], applied, isAdmin, bceidApproved });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['bceidbusiness'], updatedIdps: [], applied, isAdmin, bceidApproved });
        expect(result).toEqual(true);
      });

      it('Prevents combining bceidboth with others', () => {
        let result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidboth'],
          applied,
          isAdmin,
          bceidApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidboth'],
          applied,
          isAdmin,
          bceidApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidbusiness', 'bceidboth'],
          applied,
          isAdmin,
          bceidApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: [],
          updatedIdps: ['bceidbasic', 'bceidbusiness'],
          applied,
          isAdmin,
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
      const isAdmin = true;
      it('Only allows removing idps', () => {
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['bceidbasic'], applied, isAdmin, bceidApproved });
        expect(result).toEqual(false);

        result = validateIDPs({ currentIdps: ['bceidbasic'], updatedIdps: [], applied, isAdmin, bceidApproved });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: [], updatedIdps: ['bceidboth'], applied, isAdmin, bceidApproved });
        expect(result).toEqual(false);

        result = validateIDPs({ currentIdps: ['bceidboth'], updatedIdps: [], applied, isAdmin, bceidApproved });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: [], updatedIdps: ['bceidbusiness'], applied, isAdmin, bceidApproved });
        expect(result).toEqual(false);

        result = validateIDPs({ currentIdps: ['bceidbusiness'], updatedIdps: [], applied, isAdmin, bceidApproved });
        expect(result).toEqual(true);
      });
    });

    describe('Regular User', () => {
      const isAdmin = false;
      it('Allows removing all bceid idps', () => {
        let result = validateIDPs({ currentIdps: ['bceidboth'], updatedIdps: [], applied, isAdmin, bceidApproved });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['bceidbasic'], updatedIdps: [], applied, isAdmin, bceidApproved });
        expect(result).toEqual(true);

        result = validateIDPs({ currentIdps: ['bceidbusiness'], updatedIdps: [], applied, isAdmin, bceidApproved });
        expect(result).toEqual(true);
      });

      // Note: this is a strange requirement but intentional. A user can remove bceid and then add a different one,
      // But that process is needed as it resets approval and notifies the team.
      it('Prevents adding or changing any new bceid type', () => {
        let result = validateIDPs({ currentIdps: [], updatedIdps: ['bceidboth'], applied, isAdmin, bceidApproved });
        expect(result).toEqual(false);

        result = validateIDPs({ currentIdps: [], updatedIdps: ['bceidbasic'], applied, isAdmin, bceidApproved });
        expect(result).toEqual(false);

        result = validateIDPs({ currentIdps: [], updatedIdps: ['bceidbusiness'], applied, isAdmin, bceidApproved });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['bceidbusiness'],
          updatedIdps: ['bceidbusiness'],
          applied,
          isAdmin,
          bceidApproved,
        });
        expect(result).toEqual(true);

        result = validateIDPs({
          currentIdps: ['bceidbusiness'],
          updatedIdps: ['bceidbasic'],
          applied,
          isAdmin,
          bceidApproved,
        });
        expect(result).toEqual(false);

        result = validateIDPs({
          currentIdps: ['bceidbusiness', 'bceidbasic'],
          updatedIdps: ['bceidboth'],
          applied,
          isAdmin,
          bceidApproved,
        });
        expect(result).toEqual(false);
      });
    });
  });
});

describe('SAML', () => {
  const applied = false;
  const isAdmin = false;
  const protocol = 'saml';
  it('Only allows one identity provider', () => {
    let result = validateIDPs({
      currentIdps: ['azureidir'],
      updatedIdps: ['azureidir', 'bceidbasic'],
      applied,
      isAdmin,
      protocol,
    });
    expect(result).toEqual(false);

    result = validateIDPs({ currentIdps: [], updatedIdps: ['azureidir', 'bceidbasic'], applied, isAdmin, protocol });
    expect(result).toEqual(false);

    result = validateIDPs({ currentIdps: [], updatedIdps: ['bceidbasic'], applied, isAdmin, protocol });
    expect(result).toEqual(true);
  });

  it('prevents adding new bceid type once bceid is approved', () => {
    const bceidApproved = true;
    let result = validateIDPs({
      currentIdps: ['bceidbusiness'],
      updatedIdps: ['bceidbasic'],
      applied,
      isAdmin,
      protocol,
      bceidApproved,
    });
    expect(result).toEqual(false);

    result = validateIDPs({
      currentIdps: ['bceidbasic'],
      updatedIdps: ['bceidbusiness'],
      applied,
      isAdmin,
      protocol,
      bceidApproved,
    });
    expect(result).toEqual(false);

    result = validateIDPs({
      currentIdps: ['bceidbasic'],
      updatedIdps: ['bceidboth'],
      applied,
      isAdmin,
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
      applied,
      isAdmin,
      protocol,
      bceidApproved,
    });
    expect(result).toEqual(false);
  });
});

describe('Discontinued', () => {
  it('Prevents regular users from adding idir in draft', () => {
    const applied = false;
    const isAdmin = false;
    let result = validateIDPs({ currentIdps: ['bceidbusiness'], updatedIdps: ['idir'], applied, isAdmin });
    expect(result).toEqual(false);
  });

  it('Prevents regular users from adding idir post submission', () => {
    const applied = true;
    const isAdmin = false;
    let result = validateIDPs({ currentIdps: ['bceidbusiness'], updatedIdps: ['idir'], applied, isAdmin });
    expect(result).toEqual(false);
  });

  it('Allows admin users to add idir in draft', () => {
    const applied = false;
    const isAdmin = true;
    let result = validateIDPs({ currentIdps: ['bceidbusiness'], updatedIdps: ['idir'], applied, isAdmin });
    expect(result).toEqual(true);
  });

  it('Allows admin users to add idir after creation', () => {
    const applied = true;
    const isAdmin = true;
    let result = validateIDPs({ currentIdps: ['bceidbusiness'], updatedIdps: ['idir'], applied, isAdmin });
    expect(result).toEqual(true);
  });

  it('Allows regular users to keep idir if present', () => {
    const applied = false;
    const isAdmin = false;
    let result = validateIDPs({ currentIdps: ['idir'], updatedIdps: ['idir'], applied, isAdmin });
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
        applied,
        isAdmin,
        bcServicesCardApproved,
      });
      expect(result).toEqual(false);

      isAdmin = true;
      result = validateIDPs({
        currentIdps: ['bcservicescard'],
        updatedIdps: ['idir'],
        applied,
        isAdmin,
        bcServicesCardApproved,
      });
      expect(result).toEqual(false);
    });
  });
});
