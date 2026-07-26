/**
 * queries.mjs — GraphQL documents.
 *
 * Kept as plain strings in one file so the exact shape of every network request is
 * auditable at a glance, and so query cost can be reasoned about without hunting
 * through render code.
 */

/** Identity + which years the account has any contributions in. */
export const Q_PROFILE = `
query Profile($login: String!) {
  rateLimit { remaining resetAt cost }
  user(login: $login) {
    id
    login
    name
    bio
    avatarUrl(size: 128)
    location
    company
    websiteUrl
    createdAt
    followers { totalCount }
    following { totalCount }
    starredRepositories { totalCount }
    repositories(ownerAffiliations: OWNER, privacy: PUBLIC) { totalCount }
    contributionsCollection { contributionYears }
    pullRequests(states: MERGED) { totalCount }
    openPRs: pullRequests(states: OPEN) { totalCount }
    allPRs: pullRequests { totalCount }
    issues(states: CLOSED) { totalCount }
    allIssues: issues { totalCount }
    gists { totalCount }
  }
}`;

/**
 * One calendar year of contributions. GitHub caps a contributionsCollection window
 * at 12 months, so career totals are assembled year by year.
 */
export const Q_YEAR = `
query Year($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalIssueContributions
      totalRepositoryContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date weekday contributionCount } }
      }
    }
  }
}`;

/**
 * Repositories with everything the scenes need: stats, languages, topics and the
 * user's own commit count on the default branch (`author:` filters to them).
 */
export const Q_REPOS = `
query Repos($login: String!, $cursor: String, $authorId: ID!) {
  rateLimit { remaining }
  user(login: $login) {
    repositories(
      first: 50
      after: $cursor
      ownerAffiliations: OWNER
      privacy: PUBLIC
      orderBy: { field: STARGAZERS, direction: DESC }
    ) {
      pageInfo { hasNextPage endCursor }
      nodes {
        name
        description
        url
        homepageUrl
        isFork
        isArchived
        isPrivate
        stargazerCount
        forkCount
        createdAt
        pushedAt
        diskUsage
        primaryLanguage { name color }
        licenseInfo { spdxId }
        repositoryTopics(first: 12) { nodes { topic { name } } }
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          totalSize
          edges { size node { name color } }
        }
        defaultBranchRef {
          name
          target {
            ... on Commit {
              history(author: { id: $authorId }) { totalCount }
            }
          }
        }
        releases { totalCount }
        watchers { totalCount }
      }
    }
  }
}`;
