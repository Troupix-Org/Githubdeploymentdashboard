# Security Policy

## 🔒 Supported Versions

Currently, only the latest version is being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < 1.0   | :x:                |

## 🛡️ Security Considerations

This application is designed for **development and testing purposes**. Please be aware of the following security considerations:

### GitHub Token Storage

- **Local Storage:** GitHub tokens are stored in your browser's localStorage and IndexedDB
- **No Server:** Tokens are never sent to any external server
- **Browser Only:** Tokens remain on your local machine
- **Clear Data:** Use "Logout" to remove token from storage

⚠️ **Important:** 
- Never use this tool on shared/public computers
- Use fine-grained tokens with minimum required permissions
- Regularly rotate your GitHub tokens
- Never commit tokens to version control

### Data Privacy

- **No PII Collection:** This tool should not be used to collect or store Personally Identifiable Information
- **Local Data:** All project data is stored locally in your browser
- **Export Caution:** Be careful when exporting project JSON - it may contain sensitive repository information

### Token Permissions

We recommend using GitHub's fine-grained personal access tokens with these minimum permissions:

**Repository Permissions:**
- Actions: Read and Write (to trigger workflows)
- Contents: Read (to read workflow files)
- Metadata: Read (required)

**Account Permissions:**
- None required

### Best Practices

1. **Use Fine-Grained Tokens:**
   - Create tokens with minimal required permissions
   - Limit token scope to specific repositories
   - Set expiration dates on tokens

2. **Regular Rotation:**
   - Rotate tokens every 90 days
   - Revoke unused tokens immediately

3. **Secure Environment:**
   - Use HTTPS connections only
   - Keep your browser updated
   - Use a password manager for token backup

4. **Project Exports:**
   - Review exported JSON before sharing
   - Remove sensitive information before distribution
   - Never commit exports to public repositories

## 🚨 Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do Not Open a Public Issue

Please **do not** open a public GitHub issue for security vulnerabilities.

### 2. Report Privately

Send a detailed report to [SECURITY_EMAIL] including:

- **Description:** Clear description of the vulnerability
- **Impact:** Potential impact and severity
- **Reproduction:** Steps to reproduce the issue
- **Environment:** Browser, OS, and version information
- **Suggestions:** Any ideas for fixing (optional)

### 3. Response Time

- **Initial Response:** Within 48 hours
- **Status Updates:** Every 72 hours
- **Resolution Target:** Within 30 days (depending on severity)

### 4. Disclosure Policy

- We will work with you to understand and address the issue
- We will credit you in the security advisory (unless you prefer to remain anonymous)
- We will coordinate public disclosure timing with you
- We follow responsible disclosure practices

## 🔍 Security Measures

### Current Implementations

- ✅ No server-side storage of credentials
- ✅ Local-only token storage
- ✅ HTTPS enforced in production
- ✅ No third-party analytics or tracking
- ✅ Content Security Policy headers
- ✅ Regular dependency updates

### Planned Improvements

- 🔄 Optional token encryption in browser storage
- 🔄 Token expiration warnings
- 🔄 Audit log for sensitive operations
- 🔄 Session timeout options

## 🔐 Token Hygiene

### Creating Secure Tokens

```
1. Go to GitHub Settings → Developer Settings → Personal Access Tokens
2. Choose "Fine-grained tokens" (recommended)
3. Set a descriptive name: "Deployment Dashboard - [Device Name]"
4. Set expiration: 90 days maximum
5. Select only required repositories
6. Grant minimum required permissions:
   - Actions: Read and Write
   - Contents: Read
   - Metadata: Read (auto-selected)
7. Generate and securely store the token
```

### Revoking Tokens

If you suspect a token has been compromised:

1. **Immediate Actions:**
   - Go to GitHub Settings → Developer Settings → Personal Access Tokens
   - Find the token and click "Revoke"
   - Generate a new token with different permissions if needed

2. **In the App:**
   - Click "Logout" to remove the token from browser storage
   - Clear browser cache and cookies
   - Re-authenticate with the new token

### Token Detection

- Never commit `.env` files
- Never log tokens in browser console
- Never share screenshots containing tokens
- Use environment variables for CI/CD

## 🛠️ For Developers

### Security Checklist for Contributors

- [ ] No hardcoded secrets or tokens
- [ ] Sensitive data not logged to console
- [ ] Dependencies regularly updated
- [ ] No eval() or dangerous functions
- [ ] Input validation on all user inputs
- [ ] XSS prevention measures in place
- [ ] No SQL injection vectors (N/A - no database)
- [ ] Secure communication (HTTPS only)

### Dependency Security

We use automated tools to monitor dependencies:

- **Dependabot:** Automatic security updates
- **npm audit:** Regular vulnerability scans
- **GitHub Security Advisories:** Monitoring for CVEs

Run security audit locally:
```bash
npm audit
npm audit fix
```

## 📋 Security Checklist for Users

Before using this application:

- [ ] Running on HTTPS (in production)
- [ ] Using a private/personal computer
- [ ] Browser is up to date
- [ ] Using fine-grained GitHub token
- [ ] Token has minimal required permissions
- [ ] Token expiration is set
- [ ] Password manager stores token backup
- [ ] Understanding data is stored locally
- [ ] Aware of export sensitivity

## 📞 Contact

For security concerns or questions:

- **Email:** [SECURITY_EMAIL]
- **Response Time:** 48 hours
- **PGP Key:** [Optional - provide if available]

## 🙏 Acknowledgments

We appreciate security researchers who responsibly disclose vulnerabilities. Your contributions help keep the community safe.

---

**Note:** Replace `[SECURITY_EMAIL]` with your actual security contact email before publishing.

Last Updated: October 2025
