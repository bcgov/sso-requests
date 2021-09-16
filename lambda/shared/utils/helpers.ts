interface Request {
  preferredEmail: string;
  additionalEmails: string[];
}

export const getEmailList = (request: Request) => {
  const { preferredEmail, additionalEmails } = request;
  if (!additionalEmails || !Array.isArray(additionalEmails)) return [preferredEmail];
  return [preferredEmail, ...additionalEmails];
};
