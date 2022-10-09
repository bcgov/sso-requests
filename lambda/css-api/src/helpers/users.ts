export const updateUserProps = (users: any) => {
  return users.map((user) => {
    return getAllowedUserProps(user);
  });
};

export const getAllowedUserProps = (user: any) => {
  return {
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    attributes: user.attributes,
  };
};
