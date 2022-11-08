export const authenticate = async (headers) => {
  const { Authorization, authorization } = headers || {};
  const authHeader = Authorization || authorization;
  if (!authHeader || authHeader !== process.env.GH_SECRET) {
    return false;
  }

  return true;
};
