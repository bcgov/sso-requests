import fs from 'fs';
import path from 'path';
import { ACTIONS, PERMISSIONS, RESOURCES, isValidPermission, isValidPermissionSet } from '../src';

describe('vocabulary', () => {
  it('has no duplicates', () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
  });

  it('spells every permission as resource:action', () => {
    const resources = Object.values(RESOURCES) as string[];
    const actions = Object.values(ACTIONS) as string[];

    for (const permission of PERMISSIONS) {
      const [resource, action] = permission.split(':');
      expect(resources).toContain(resource);
      expect(actions).toContain(action);
    }
  });

  it('validates a permission', () => {
    expect(isValidPermission('integrations:read')).toBe(true);
    expect(isValidPermission('integrations:approve-bceid')).toBe(false);
    expect(isValidPermission('integrations')).toBe(false);
    expect(isValidPermission(null)).toBe(false);
    expect(isValidPermission(['integrations:read'])).toBe(false);
  });

  it('validates a permission set', () => {
    expect(isValidPermissionSet([])).toBe(true);
    expect(isValidPermissionSet(['integrations:read', 'roles:write'])).toBe(true);
    expect(isValidPermissionSet(['integrations:read', 'nope'])).toBe(false);
    expect(isValidPermissionSet('integrations:read')).toBe(false);
  });
});

/**
 * The failure this package exists to prevent is a second copy of the vocabulary
 * drifting from the first. Nothing enforces that by construction, so it is a test.
 */
describe('the vocabulary is declared in exactly one place', () => {
  const repoRoot = path.resolve(__dirname, '../../..');

  const sourceFilesDeclaringTheVocabulary = () => {
    const offenders: string[] = [];

    const scan = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (['node_modules', '.next', 'build', 'dist', '.git', 'migrations'].includes(entry.name)) continue;
          scan(full);
        } else if (/\.tsx?$/.test(entry.name)) {
          const body = fs.readFileSync(full, 'utf8');
          // The pair of strings that only a vocabulary declaration would contain.
          if (body.includes("'user-role-mappings:write'") && body.includes("'idp-users:read'")) {
            offenders.push(path.relative(repoRoot, full));
          }
        }
      }
    };

    for (const pkg of ['app', 'api', 'packages']) scan(path.join(repoRoot, pkg));

    // Tests and fixtures may name permissions freely; source may not.
    return offenders.filter((file) => !/(^|\/)(jest|jest-api|test|tests)\//.test(file) && !file.includes('.test.'));
  };

  it('is declared by this package and by nothing else', () => {
    const declarations = sourceFilesDeclaringTheVocabulary();

    expect(declarations.filter((file) => !file.startsWith('packages/authz/'))).toEqual([]);
    // And it really is declared here, so a rename cannot make this pass vacuously.
    expect(declarations).toContain(path.join('packages', 'authz', 'src', 'permissions.ts'));
  });
});
