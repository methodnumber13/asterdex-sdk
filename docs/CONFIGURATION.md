# Configuration Guide

This guide explains how to configure the AsterDEX SDK using environment variables and configuration options.

## Environment Variables

The SDK supports comprehensive configuration via environment variables. This allows you to:

- Use different API endpoints for different environments
- Override default settings without changing code
- Securely store credentials outside your codebase
- Easily deploy to different environments

### Basic Configuration

```bash
# API Credentials
ASTERDEX_API_KEY=your_api_key_here
ASTERDEX_API_SECRET=your_api_secret_here

# Environment Selection
ASTERDEX_ENVIRONMENT=mainnet  # or 'testnet'
```

### Advanced Configuration

```bash
# Request Configuration
ASTERDEX_TIMEOUT=60000              # Request timeout in milliseconds
ASTERDEX_RECV_WINDOW=5000           # Receive window for signed requests

# Rate Limiting
ASTERDEX_ENABLE_RATE_LIMITING=true  # Enable/disable rate limiting
ASTERDEX_MAX_RETRIES=3              # Maximum retry attempts
ASTERDEX_RETRY_DELAY=1000           # Delay between retries (ms)
ASTERDEX_BACKOFF_MULTIPLIER=2       # Exponential backoff multiplier
```

### Custom API Endpoints

The SDK automatically selects the appropriate endpoints based on `ASTERDEX_ENVIRONMENT`:

- **mainnet**: Uses production AsterDEX endpoints
- **testnet**: Uses testnet AsterDEX endpoints

You can override these defaults for **any environment** using:

```bash
# Override endpoints for both mainnet and testnet
ASTERDEX_SPOT_URL=https://custom-spot-api.example.com
ASTERDEX_FUTURES_URL=https://custom-futures-api.example.com
ASTERDEX_WEBSOCKET_URL=wss://custom-websocket.example.com
```

**Default Endpoints:**

| Environment | Spot API | Futures API | WebSocket |
|------------|----------|-------------|-----------|
| `mainnet` | `https://sapi.asterdex.com` | `https://fapi.asterdex.com` | `wss://sstream.asterdex.com` |

## Usage Examples

### 1. Environment-based Configuration

Create a `.env` file in your project root:

```bash
# .env
ASTERDEX_API_KEY=your_api_key
ASTERDEX_API_SECRET=your_api_secret
ASTERDEX_ENVIRONMENT=testnet
```

Then use the SDK:

```typescript
import { AsterDEX } from '@asterdex/sdk';

// Load configuration from environment variables
const client = AsterDEX.fromEnv();

// Start trading
const exchangeInfo = await client.spot.getExchangeInfo();
```

### 2. Mixed Configuration

Combine environment variables with runtime configuration:

```typescript
import { AsterDEX } from '@asterdex/sdk';

// Use environment for credentials, override timeout
const client = new AsterDEX({
  ...AsterDEX.fromEnv().getConfig(),
  timeout: 30000, // Override default timeout
});
```

### 3. Custom Endpoints for Development

```bash
# .env.development
ASTERDEX_API_KEY=dev_key
ASTERDEX_API_SECRET=dev_secret
ASTERDEX_SPOT_URL=http://localhost:3001
ASTERDEX_FUTURES_URL=http://localhost:3002
ASTERDEX_WS_URL=ws://localhost:3003
```

### 4. Production Configuration

```bash
# .env.production
ASTERDEX_API_KEY=prod_key
ASTERDEX_API_SECRET=prod_secret
ASTERDEX_ENVIRONMENT=mainnet
ASTERDEX_ENABLE_RATE_LIMITING=true
ASTERDEX_MAX_RETRIES=5
```

## Configuration Priority

The SDK resolves configuration in the following order (highest to lowest priority):

1. **Runtime Configuration** - Config passed to constructor
2. **Environment Variables** - Custom override variables (`ASTERDEX_SPOT_URL`, etc.)
3. **Environment-specific Defaults** - Based on `ASTERDEX_ENVIRONMENT`
4. **Built-in Defaults** - Hardcoded fallback values

## Environment Files

### Using .env Files

Install a dotenv package to automatically load environment variables:

```bash
npm install dotenv
```

Then load it in your application:

```typescript
import 'dotenv/config';
import { AsterDEX } from '@asterdex/sdk';

const client = AsterDEX.fromEnv();
```

### Multiple Environment Files

You can use different environment files for different stages:

```bash
# Development
npm run dev   # loads .env.development

# Testing
npm run test  # loads .env.test

# Production
npm run start # loads .env.production
```

## Security Best Practices

### 1. Never Commit Credentials

```bash
# .gitignore
.env
.env.local
.env.*.local
```

### 2. Use Environment-Specific Files

```bash
.env.example          # Template (safe to commit)
.env.development      # Development settings
.env.test            # Test settings
.env.production      # Production settings (never commit)
```

### 3. Validate Configuration

```typescript
import { AsterDEX } from '@asterdex/sdk';

try {
  const client = AsterDEX.fromEnv();

  // Validate that credentials are present
  if (!client.getConfig().apiKey) {
    throw new Error('API key is required');
  }

  console.log('Configuration loaded successfully');
} catch (error) {
  console.error('Configuration error:', error.message);
  process.exit(1);
}
```

## Deployment Examples

### Docker

```dockerfile
# Dockerfile
FROM node:18

# Copy environment template
COPY .env.example .env

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

```bash
# Run with environment variables
docker run -e ASTERDEX_API_KEY=your_key -e ASTERDEX_API_SECRET=your_secret my-app
```

### Kubernetes

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: asterdex-config
data:
  ASTERDEX_ENVIRONMENT: "mainnet"
  ASTERDEX_TIMEOUT: "60000"
  ASTERDEX_ENABLE_RATE_LIMITING: "true"

---
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: asterdex-credentials
type: Opaque
stringData:
  ASTERDEX_API_KEY: "your_api_key"
  ASTERDEX_API_SECRET: "your_api_secret"
```

### AWS Lambda

```typescript
// Configure via AWS Lambda environment variables
export const handler = async (event: any) => {
  const client = AsterDEX.fromEnv();

  // Your trading logic here
  const result = await client.spot.getAccount();

  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
};
```

## Troubleshooting

### Common Issues

1. **Invalid URL Format**
   ```
   Error: Invalid spot baseUrl: invalid-url
   ```
   Ensure URLs start with `https://` or `wss://`

2. **Missing Environment Variables**
   ```typescript
   // Check if environment variables are loaded
   console.log('API Key:', process.env.ASTERDEX_API_KEY ? 'Present' : 'Missing');
   ```

3. **Configuration Validation**
   ```typescript
   try {
     const client = new AsterDEX({ timeout: -1000 });
   } catch (error) {
     console.error(error.message); // "Timeout must be greater than 0"
   }
   ```

### Debug Configuration

```typescript
import { AsterDEX } from '@asterdex/sdk';

const client = AsterDEX.fromEnv();
const config = client.getConfig();

console.log('Current configuration:');
console.log('Environment:', config.environment);
console.log('Spot URL:', config.baseUrl.spot);
console.log('Futures URL:', config.baseUrl.futures);
console.log('WebSocket URL:', config.baseUrl.websocket);
console.log('Timeout:', config.timeout);
console.log('Rate Limiting:', config.enableRateLimiting);
```