# graphql-nats-subscriptions

This package implements the PubSubEngine Interface from the graphql-subscriptions package. 
It allows you to connect your subscriptions manager to a NATS enabled Pub Sub broker to support 
horizontally scalable subscriptions setup.

This is a modernized fork adapted from [graphql-redis-subscriptions](https://github.com/davidyaha/graphql-redis-subscriptions) package.

## Requirements

- Node.js >= 22.0.0  
- NATS 1.4.x
- TypeScript >= 5.0.0

## Dependencies

This package requires the following peer dependencies:

- `graphql-subscriptions` ^2.0.0 
- `nats` >=1.4.0 <2.0.0

**Note:** `pino` is included as a direct dependency since logging is mandatory.

## Installation

```bash
npm install graphql-nats-subscriptions graphql-subscriptions nats
```

## Basic Usage

```javascript
import { NatsPubSub } from 'graphql-nats-subscriptions';
import pino from 'pino';

// Create a logger instance (required)
const logger = pino({ level: 'info' });

// Create PubSub instance
const pubsub = new NatsPubSub({
  logger: logger  // Required: pino.Logger instance
}); // connecting to nats://localhost:4222 by default

const subscriptionManager = new SubscriptionManager({
  schema,
  pubsub,
  setupFunctions: {},
});
```

## Advanced Usage

### With custom NATS connection

```javascript
import { connect } from 'nats';
import { NatsPubSub } from 'graphql-nats-subscriptions';
import pino from 'pino';

const logger = pino({ level: 'debug' });
const natsClient = connect({ 
  url: 'nats://my-nats-server:4222',
  // other NATS 1.4.x options
});

const pubsub = new NatsPubSub({
  client: natsClient,
  logger: logger  // Required
});
```

### Using Trigger Transform

As the [graphql-redis-subscriptions](https://github.com/davidyaha/graphql-redis-subscriptions) package, this package supports
a trigger transform function. This trigger transform allows you to use the `channelOptions` object provided to the `SubscriptionManager`
instance, and return trigger string which is more detailed than the regular trigger.

First create a simple and generic trigger transform:
```javascript
const triggerTransform = (trigger, {path}) => [trigger, ...path].join('.');
```

Note that the `path` field is expected to be passed to the `channelOptions`, but you can customize this as needed.

Next, pass the `triggerTransform` to the `NatsPubSub` constructor:
```javascript
const pubsub = new NatsPubSub({
  triggerTransform,
  logger: logger  // Required
});
```

Lastly, provide a setupFunction for your subscription field that specifies the trigger and calls it with the `channelOptions` object containing `repoName`:

```javascript
const subscriptionManager = new SubscriptionManager({
  schema,
  pubsub,
  setupFunctions: {
    commentsAdded: (options, {repoName}) => ({
      commentsAdded: {
        channelOptions: {path: [repoName]},
      },
    }),
  },
});
```

## Logging

This package **requires** [pino](https://github.com/pinojs/pino) for logging. The logger parameter is mandatory in the constructor.

All log levels (trace, debug, info, warn, error, fatal) are supported. The library will create child loggers as needed.

### Logger Usage

The `logger` option requires a `pino.Logger` instance:

```javascript
import pino from 'pino';

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty', // for development
    options: {
      colorize: true
    }
  }
});

const pubsub = new NatsPubSub({ 
  logger: logger  // Required - will throw error if not provided
});
```

## Changes from Original

This modernized version includes:

- **Updated to Node.js 22+** with modern TypeScript 5.x
- **Mandatory pino logging** - ensures consistent, high-performance logging across all instances
- **Updated to NATS 1.4.x** - compatible with your monorepo requirements  
- **Modern tooling** - ESLint instead of deprecated TSLint, updated Jest
- **Improved TypeScript** - strict mode enabled, better type safety
- **Updated dependencies** - all packages updated to latest compatible versions

## Migration from Original

If you're migrating from the original package:

1. **Update Node.js** to version 22+
2. **Replace logger dependency**:
   ```bash
   npm uninstall @cdm-logger/core @cdm-logger/server
   # pino is now included automatically as a dependency
   ```
3. **Update logger initialization** (now required):
   ```javascript
   // Before (optional)
   import { ConsoleLogger } from '@cdm-logger/server';
   const logger = ConsoleLogger.create('app', { level: 'trace' });
   const pubsub = new NatsPubSub({ logger }); // optional
   
   // After (required)  
   import pino from 'pino';
   const logger = pino({ level: 'trace', name: 'app' });
   const pubsub = new NatsPubSub({ logger }); // required
   ```
4. **Update NATS** to 1.4.x (if not already)
5. **Update other dependencies** as shown in package.json

## Requirements

You need a `nats-server` running. Check out [NATS.io](https://nats.io) to get started on your machine.

## License

This package is licensed under the ISC License.
