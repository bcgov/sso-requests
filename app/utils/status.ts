import type { Status, DisplayStatus } from 'interfaces/types';

export const getStatusDisplayName = (status: Status): DisplayStatus => {
  switch (status) {
    case 'draft':
      return 'In Draft';
    case 'applied':
      return 'Completed';
    default:
      return 'Submitted';
  }
};
