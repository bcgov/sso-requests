import { approvalResetsForRemovedIdps } from '@app/helpers/permissions';
import { getAllowedIdpsForApprover } from '@app/utils/helpers';
import { Session } from '@app/shared/interfaces';

describe('BCGOV IDIR approval lifecycle', () => {
  it('limits the dedicated approver to BCGOV IDIR integrations', () => {
    expect(
      getAllowedIdpsForApprover({
        client_roles: ['bcgovidir-approver'],
      } as Session),
    ).toEqual(['bcgovidir']);
  });

  it('resets approval when BCGOV IDIR is removed', () => {
    expect(
      approvalResetsForRemovedIdps(
        { bcgovidirApproved: true, devIdps: ['bcgovidir', 'azureidir'] },
        { bcgovidirApproved: true, devIdps: ['azureidir'] },
      ),
    ).toEqual({ bcgovidirApproved: false });
  });

  it('preserves approval while BCGOV IDIR remains selected', () => {
    expect(
      approvalResetsForRemovedIdps(
        { bcgovidirApproved: true, devIdps: ['bcgovidir'] },
        { bcgovidirApproved: true, devIdps: ['bcgovidir', 'azureidir'] },
      ),
    ).toEqual({});
  });
});
