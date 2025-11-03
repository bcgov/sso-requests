import { User } from '@/types';

export const updateUserProps = (users: User[]) => {
  return users.map((user) => {
    return getAllowedUserProps(user);
  });
};

export const getAllowedUserProps = (user: User) => {
  if (user) {
    return {
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      attributes: user.attributes,
    };
  }
};
