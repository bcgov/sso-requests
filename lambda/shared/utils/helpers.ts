interface Request {
  preferredEmail: string;
  additionalEmails: string[];
}

export const getEmailList = (request: Request) => {
  const { preferredEmail, additionalEmails } = request;
  if (!additionalEmails || !Array.isArray(additionalEmails)) return [preferredEmail];
  return [preferredEmail, ...additionalEmails];
};

export const formatUrisForEmail = (uris: string[], prefix) => {
  if (uris.length === 0) return '';
  return `<li> ${prefix}: ${uris.join(', ')} </li>`;
};

export const realmToIDP = (realm?: string) => {
  let idps: string[] = [];
  if (realm === 'onestopauth') idps = ['idir'];
  if (realm === 'onestopauth-basic') idps = ['idir', 'bceid-basic'];
  if (realm === 'onestopauth-business') idps = ['idir', 'bceid-business'];
  if (realm === 'onestopauth-both') idps = ['idir', 'bceid-business', 'bceid-basic'];
  return idps;
};
