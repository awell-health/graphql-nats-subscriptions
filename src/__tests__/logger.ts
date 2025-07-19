
import pino, { Logger } from 'pino';

export const logger: Logger = pino({
    level: 'trace',
    name: 'nats-subscription'
});
