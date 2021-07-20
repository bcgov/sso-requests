import type { Status, DisplayStatus } from 'interfaces/types';

export const getStatusDisplayName = (status: Status): DisplayStatus => {
  switch (status) {
    case 'draft':
      return 'In Draft';
    case 'applied':
      return 'Active Project';
    case 'submitted':
    case 'pr':
    case 'planned':
    case 'approved':
      return 'Request Submitted';
    default:
      return 'Technical Issues';
  }
};
