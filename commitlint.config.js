module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Dependabot's auto-generated commit bodies include release-note/changelog
    // links that routinely exceed the default 100 char limit; disable this
    // rule so otherwise-valid Dependabot PRs don't fail commitlint.
    'body-max-line-length': [0],
  },
};
