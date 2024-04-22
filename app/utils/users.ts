import debounce from 'lodash.debounce';
import { getIdirUsersByEmail } from '@app/services/user';

/**
 * Throttled function to search for IDIR users by email. Callback is compatible for react-select async component.
 */
export const throttledIdirSearch = debounce(
  (email, cb) => {
    if (email.length <= 2) {
      cb([]);
      return;
    }
    getIdirUsersByEmail(email).then(([data, error]) => {
      if (error) {
        cb([{ value: 'error', label: 'Failed to fetch users', isDisabled: true }]);
      } else {
        cb(data?.map((user) => ({ value: user.id, label: user.mail })) || []);
      }
    });
  },
  300,
  { trailing: true },
);
