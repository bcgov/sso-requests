export const checkIfUserIsServiceAccount = (username: string) => {
  return username.startsWith('service-account-');
};
