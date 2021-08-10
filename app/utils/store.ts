const TOKEN_SESSION = 'tokens';

export const setTokens = (tokens: any) => {
  sessionStorage.setItem(TOKEN_SESSION, JSON.stringify(tokens || {}));
};

export const getTokens = () => {
  return JSON.parse(sessionStorage.getItem(TOKEN_SESSION) || '{}');
};

export const removeTokens = () => {
  sessionStorage.removeItem(TOKEN_SESSION);
};
