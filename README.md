# LGTM Compliancer Checker Probot App

A GitHub Probot App that ensures that Pull Requests meet a minimum compliance threshold when using LGTM Enteprise


## Features
- Outputs a [GitHub Check](https://developer.github.com/v3/checks/) depending on the configuration of the LGTM Compliance 
- YAML Configuration file located in a repository controls the compliance policies
- Can define policies based on the alert severity level, and the alert tags

## Get Started

1. Deploy and Install the GitHub App
2. Ensure that [Pull Request Integration](https://help.semmle.com/lgtm-enterprise/user/help/managing-automated-code-review.html#enabling-pr-integration) has been turned on in LGTM
3. [Required] Create a file `.github/lgtm-compliance.yml` as described in the [How it Works](#How-it-Works) section to configure settings (and override defaults)
4. Open a Pull Request and after LGTM has run a GitHub Check will be added to the Pull Request

## How it Works

A `.github/lgtm-compliance.yml` file is required in order to define your compliance policies per repository. For each language you can specify a minimum severty level as well as tags that are required. If any alert meets the minimum severity and contains any of the tags, the GitHub Check will result in a failure. Otherwise it will succeed.

Severity: recommendation < warning < error < ALL
Tags: An array of required tags OR 'ALL'

```yml
javascript:
  severity: 'warning'
  tags: ['maintainability', 'security']
java:
  severity: 'ALL'
  tags: ['security']
python:
  severity: 'error'
  tags: 'ALL'
cpp:
  severity: 'error'
  tags: ['security']
csharp:
  severity: 'error'
  tags: ['security']
go:
  severity: 'error'
  tags: ['security']
```

When setting up this Probot App you can also set a number of Environment Variables

Possible Environment Variables:
- LGTM_URL [Required] - URL to LGTM Enterprise
- LGTM_TOKEN [Required] - Admin token to access LGTM API
- GHE_HOST [default: 'github.com'] - Sets the GitHub Enterprise Host URL

## Deployment

See [docs/deploy.md](docs/deploy.md) if you would like to run your own instance of this app.
