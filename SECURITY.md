# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

We take security issues in the Social Worker AI platform seriously, especially given the sensitive nature of crisis monitoring data.

### How to Report

1. **Do NOT open a public GitHub issue for security vulnerabilities.**
2. Instead, please use GitHub's [Private Vulnerability Reporting](https://github.com/profefernandez/soicalworkerai/security/advisories/new) feature.
3. Alternatively, contact the maintainers directly via email at security@60wattsofclarity.com

### What to Include

- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours of report
- **Initial Assessment**: Within 5 business days
- **Resolution Target**: Critical issues within 14 days

### Scope

This policy applies to:
- The main application codebase
- API endpoints
- Authentication and authorization mechanisms
- Data handling and storage of sensitive crisis information

## Security Best Practices for Contributors

- Never commit API keys, tokens, or credentials to the repository
- Use environment variables for sensitive configuration
- Follow the principle of least privilege for data access
- Ensure all dependencies are regularly updated

Thank you for helping keep this project and its users safe.
