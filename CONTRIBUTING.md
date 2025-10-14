# Contributing to AsterDEX TypeScript SDK (Unofficial)

Thank you for your interest in contributing to the unofficial AsterDEX TypeScript SDK! This is a community-maintained project that provides a comprehensive TypeScript interface for the AsterDEX cryptocurrency exchange.

> ⚠️ **Important**: This is an **unofficial SDK** and is not affiliated with or endorsed by AsterDEX. This is a community effort to provide better developer tools for the AsterDEX platform.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and professional in all interactions.

### Our Standards

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment
4. Create a new branch for your changes
5. Make your changes
6. Test your changes
7. Submit a pull request

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm, yarn, or pnpm
- Git

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/asterdex-sdk.git
cd asterdex-sdk

# Install dependencies
npm install

# Copy environment template (if available)
cp .env.example .env

# Build the project
npm run build

# Run tests
npm test
```

### Environment Variables

For testing with real API credentials (optional):

```bash
ASTERDEX_API_KEY=your-api-key
ASTERDEX_API_SECRET=your-api-secret
ASTERDEX_ENVIRONMENT=testnet  # Always use testnet for development
```

**⚠️ Security Note**: Never commit real API credentials to the repository.

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-futures-api` - New features
- `fix/websocket-reconnection` - Bug fixes
- `docs/update-readme` - Documentation updates
- `refactor/error-handling` - Code refactoring

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Type Safety

- Use strict TypeScript
- Add proper type annotations
- Avoid `any` types when possible
- Export all public types from the main index

### Commit Messages

Follow conventional commits format:
- `feat: add new endpoint for futures trading`
- `fix: resolve websocket reconnection issue`
- `docs: update API documentation`
- `test: add unit tests for spot client`

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- config.test.ts
```

### Writing Tests

- Write unit tests for all new functionality
- Use descriptive test names
- Mock external dependencies
- Aim for high test coverage (>90%)
- Test both success and error scenarios

### Test Structure

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('FeatureName', () => {
  describe('methodName', () => {
    it('should handle normal case', () => {
      // Test implementation
    });

    it('should handle error case', () => {
      // Test error scenarios
    });
  });
});
```

## Documentation

### JSDoc Comments

Add JSDoc comments for all public APIs:

```typescript
/**
 * Places a new order on the exchange
 *
 * @param params - Order parameters
 * @returns Promise resolving to order response
 * @throws {ValidationError} When required parameters are missing
 * @throws {ApiResponseError} When API returns an error
 *
 * @example
 * ```typescript
 * const order = await client.spot.newOrder({
 *   symbol: 'BTCUSDT',
 *   side: 'BUY',
 *   type: 'LIMIT',
 *   quantity: '0.001',
 *   price: '35000'
 * });
 * ```
 */
public async newOrder(params: NewOrderParams): Promise<OrderAck> {
  // Implementation
}
```

### Examples

- Add working examples for new features
- Update existing examples when APIs change
- Ensure examples are tested and functional

## Pull Request Process

### Before Submitting

1. Ensure your code follows the project's coding standards
2. Write or update tests for your changes
3. Update documentation as needed
4. Run the full test suite
5. Build the project successfully

### Pull Request Template

When creating a pull request, include:

1. **Description**: Clear description of changes
2. **Type**: Feature, bug fix, documentation, etc.
3. **Testing**: How you tested the changes
4. **Breaking Changes**: Any breaking changes
5. **Related Issues**: Link to related issues

### Review Process

1. All PRs require at least one review
2. All tests must pass
3. Code coverage should not decrease
4. Documentation must be updated for new features
5. Breaking changes require special consideration

## Reporting Issues

### Bug Reports

When reporting bugs on [GitHub Issues](https://github.com/methodnumber13/asterdex-sdk/issues), include:

1. **Environment**: Node.js version, OS, SDK version
2. **Steps to Reproduce**: Clear steps to reproduce the issue
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Code Sample**: Minimal code to reproduce the issue
6. **Error Messages**: Full error messages and stack traces

**Template:**

```markdown
## Bug Description
Brief description of the bug

## Environment
- Node.js version:
- OS:
- SDK version:
- TypeScript version:

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Code Sample
\```typescript
// Minimal reproducible code
\```

## Error Messages
\```
Error stack trace here
\```
```

### Feature Requests

For feature requests, include:

1. **Use Case**: Why is this feature needed?
2. **Proposal**: How should it work?
3. **Examples**: Example usage
4. **Alternatives**: Alternative solutions considered

**Template:**

```markdown
## Feature Request

### Problem/Use Case
Describe the problem or use case

### Proposed Solution
How should this feature work?

### Example Usage
\```typescript
// Example code showing how the feature would be used
\```

### Alternatives Considered
Other solutions you've considered

### Additional Context
Any other relevant information
```

## API Design Guidelines

### Consistency

- Follow existing naming conventions
- Use consistent parameter patterns
- Maintain backwards compatibility when possible

### Error Handling

- Use appropriate error types
- Provide meaningful error messages
- Include error codes when available

### Type Definitions

- Define interfaces for all API responses
- Use union types for enums
- Export all public types

### Documentation

- Document all public methods
- Include usage examples
- Document error conditions

## Release Process

Releases are handled by the maintainer:

1. Version bump following [semantic versioning](https://semver.org/)
   - **MAJOR**: Breaking changes
   - **MINOR**: New features (backwards compatible)
   - **PATCH**: Bug fixes (backwards compatible)
2. Update `CHANGELOG.md` with all changes
3. Create release notes on GitHub
4. Publish to npm (if applicable)
5. Tag release on GitHub

## Priority Areas for Contribution

We especially welcome contributions in these areas:

### High Priority
- 🐛 Bug fixes and stability improvements
- 📚 Documentation improvements and examples
- ✅ Test coverage improvements
- 🔒 Security enhancements

### Medium Priority
- ⚡ Performance optimizations
- 🎨 Code quality and refactoring
- 🌐 New WebSocket stream types
- 📊 Additional utility functions

### Future Enhancements
- 🔄 Rate limiting improvements
- 📈 Advanced trading strategies helpers
- 🎯 TypeScript strict mode improvements
- 🧪 Integration test suite

## Community Guidelines

### What We're Looking For

✅ **Encouraged**:
- Well-tested code with high coverage
- Clear, documented APIs
- Performance improvements
- Security enhancements
- Bug fixes with test cases
- Documentation improvements
- Helpful examples

❌ **Discouraged**:
- Breaking changes without discussion
- Code without tests
- Undocumented features
- Performance regressions
- Security vulnerabilities

## Recognition

Contributors will be:
- Listed in the project README
- Mentioned in release notes for significant contributions
- Credited in the `package.json` contributors field

## Legal

By contributing, you agree that:
- Your contributions will be licensed under the MIT License
- You have the right to submit the work
- You understand this is an unofficial SDK not affiliated with AsterDEX

## Questions?

If you have questions about contributing:

1. 📖 Check existing [issues](https://github.com/methodnumber13/asterdex-sdk/issues) and [pull requests](https://github.com/methodnumber13/asterdex-sdk/pulls)
2. 💬 Create a new [GitHub Discussion](https://github.com/methodnumber13/asterdex-sdk/discussions) for general questions
3. 🐛 Open an [issue](https://github.com/methodnumber13/asterdex-sdk/issues) for specific problems
4. 🐦 Contact the maintainer on [Twitter](https://x.com/afrow0w13)

## Thank You!

Thank you for contributing to the AsterDEX TypeScript SDK! Your efforts help make cryptocurrency trading more accessible to developers. Every contribution, no matter how small, is valuable to the community.

---

**Maintainer**: [methodnumber13](https://github.com/methodnumber13)
**Repository**: [asterdex-sdk](https://github.com/methodnumber13/asterdex-sdk)