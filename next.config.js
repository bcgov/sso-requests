module.exports = {
  reactStrictMode: true,
  // For gh pages deployment need to prefix the repository as part of the base url
  assetPrefix: process.env.NODE_ENV === 'development' ? '' : '/sso-requests/',
};
