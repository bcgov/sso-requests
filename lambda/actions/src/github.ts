const { Octokit } = require('octokit');

const octokit = new Octokit({ auth: process.env.GH_ACCESS_TOKEN });

export const mergePR = async ({ owner, repo, prNumber }) => {
  try {
    await octokit.rest.pulls.merge({
      owner,
      repo,
      pull_number: prNumber,
    });
  } catch (err) {
    console.log(err);
  }
};
