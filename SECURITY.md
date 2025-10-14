# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in this SDK, please report it by:

1. **Do NOT** open a public issue
2. Email the maintainer directly or create a private security advisory on GitHub
3. Include detailed information about the vulnerability

## Security Considerations

### npm Audit Vulnerabilities

This project uses development dependencies (Vite, Vitest, TypeScript tools) that may show vulnerabilities in `npm audit`. These vulnerabilities:

- ✅ **Are in devDependencies only** - Not included in the published package
- ✅ **Do not affect production usage** - Only used during development/testing
- ✅ **Do not affect end users** - Not bundled in the distributed package

### Published Package Security

The published npm package includes only:
```json
{
  "dependencies": {
    "dotenv": "^17.2.2",
    "ws": "^8.14.2",           // ✅ Safe version (vulnerabilities are in ws 7.x)
    "web3": "^4.16.0",
    "web3-eth-accounts": "^4.3.1"
  }
}
```

All production dependencies are kept up-to-date and secure.

### Known Dev Dependency Advisories

The following advisories affect **development tools only**:

1. **esbuild/vite** (moderate) - Development server vulnerability, not included in production
2. **validator/vite-plugin-dts** (moderate) - TypeScript declaration generation tool, dev only
3. **vue-template-compiler** (moderate) - Build tool dependency, dev only
4. **ws 7.x** (high) - Old version in dev dependencies, production uses ws 8.x (safe)

These do not pose a security risk to applications using this SDK.

### Verifying Package Contents

You can verify what's included in the published package:

```bash
npm pack asterdex-sdk
tar -tzf asterdex-sdk-1.0.0.tgz
```

Only `dist/`, `README.md`, and `LICENSE` files are included.

## Best Practices for SDK Users

1. **API Credentials**: Never commit API keys or secrets to version control
2. **Environment Variables**: Use `.env` files (gitignored) for sensitive data
3. **Testnet First**: Always test on testnet before using mainnet
4. **Rate Limiting**: Respect API rate limits to avoid account suspension
5. **Error Handling**: Implement proper error handling for all API calls
6. **Updates**: Keep the SDK updated to receive security patches

## Disclaimer

This is an unofficial SDK and is not affiliated with AsterDEX. Use at your own risk. Always review the source code before using in production.
