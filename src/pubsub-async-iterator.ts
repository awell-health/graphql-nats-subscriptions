import { $$asyncIterator } from 'iterall';
import { PubSubEngine } from 'graphql-subscriptions';
import type { Logger } from 'pino';

/**
 * A class for digesting PubSubEngine events via the new AsyncIterator interface.
 * This implementation is a generic version of the one located at
 * https://github.com/apollographql/graphql-subscriptions/blob/master/src/event-emitter-to-async-iterator.ts
 * @class
 *
 * @constructor
 *
 * @property pullQueue @type {Function[]}
 * A queue of resolve functions waiting for an incoming event which has not yet arrived.
 * This queue expands as next() calls are made without PubSubEngine events occurring in between.
 *
 * @property pushQueue @type {any[]}
 * A queue of PubSubEngine events waiting for next() calls to be made.
 * This queue expands as PubSubEngine events arrive while no next() calls are made.
 */
export class PubSubAsyncIterator<T> implements AsyncIterator<T> {

  private pullQueue: Array<(value: IteratorResult<T>) => void>;
  private pushQueue: Array<T>;
  private eventsArray: string[];
  private allSubscribed: Promise<number[]>;
  private listening: boolean;
  private pubsub: PubSubEngine;
  private logger: Logger; // Made mandatory

  constructor(pubsub: PubSubEngine, eventNames: string | string[], logger: Logger) {
    this.pubsub = pubsub;
    this.pullQueue = [];
    this.pushQueue = [];
    this.listening = true;
    this.eventsArray = typeof eventNames === 'string' ? [eventNames] : eventNames;
    this.logger = logger.child({ className: 'pubsub-async-iterator' });
    this.allSubscribed = this.subscribeAll();
  }

  public async next(): Promise<IteratorResult<T>> {
    this.logger.trace('next has been called, current state [ pullQueue: (%j) pushQueue: (%j)]', this.pullQueue, this.pushQueue);
    await this.allSubscribed;
    return this.listening ? this.pullValue() : this.return();
  }

  public async return(): Promise<IteratorReturnResult<undefined>> {
    this.logger.trace('calling [return]');
    this.emptyQueue(await this.allSubscribed);
    return { value: undefined, done: true };
  }

  public async throw(error: any): Promise<IteratorReturnResult<T>> {
    this.logger.trace('throwing error');
    this.emptyQueue(await this.allSubscribed);
    return Promise.reject(error);
  }

  public [$$asyncIterator]() {
    return this;
  }

  private async pullValue(): Promise<IteratorResult<T>> {
    return new Promise<IteratorResult<T>>((resolve) => {
      if (this.pushQueue.length !== 0) {
        this.logger.trace('[pullValue] ');
        this.logger.trace('has elements in pushQueue (%j)', this.pushQueue);
        resolve({ value: this.pushQueue.shift()!, done: false });
      } else {
        this.logger.trace('[pullValue] ');
        this.logger.trace('push Promise.resolve into pullQueue (%j)', this.pullQueue);
        this.pullQueue.push(resolve);
      }
    });
  }

  private async pushValue(event: T): Promise<void> {
    this.logger.trace('[pushValue] with event (%j)', event);
    await this.allSubscribed;
    if (this.pullQueue.length !== 0) {
      this.logger.trace('pull event (%j) from pullQueue (%j)', event, this.pullQueue);
      const resolve = this.pullQueue.shift();
      resolve?.({ value: event, done: false });
    } else {
      this.pushQueue.push(event);
      this.logger.trace('push event (%j) to pushQueue (%j)', event, this.pullQueue);
    }
  }

  private emptyQueue(subscriptionIds: number[]): void {
    this.logger.trace('[emptyQueue] ');
    if (this.listening) {
      this.listening = false;
      this.logger.trace('listening is true, it will unsubscribeAll, will empty all elements in pullQueue (%j)', this.pullQueue);
      this.unsubscribeAll(subscriptionIds);
      this.pullQueue.forEach(resolve => resolve({ value: undefined as any, done: true }));
      this.pullQueue.length = 0;
      this.pushQueue.length = 0;
    }
  }

  private subscribeAll(): Promise<number[]> {
    this.logger.trace('[subscribeAll] ');
    return Promise.all(this.eventsArray.map(
      eventName => {
        this.logger.trace('subscribing to eventName (%s) with onMessage as this.pushValue', eventName);
        return this.pubsub.subscribe(eventName, this.pushValue.bind(this), {});
      },
    ));
  }

  private unsubscribeAll(subscriptionIds: number[]): void {
    this.logger.trace('unsubscribeAll to all subIds (%j)', subscriptionIds);
    subscriptionIds.forEach(subscriptionId => this.pubsub.unsubscribe(subscriptionId));
  }

}
