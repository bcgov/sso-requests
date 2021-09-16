interface Request {
  preferredEmail: string;
  additionalEmails: string[];
}

export const getEmailList = (request: Request) => {
  const { preferredEmail, additionalEmails } = request;
  return [preferredEmail, ...additionalEmails];
};
