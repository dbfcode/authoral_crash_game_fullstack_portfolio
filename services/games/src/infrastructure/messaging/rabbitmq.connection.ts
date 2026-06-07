import amqp, { Channel, ChannelModel } from 'amqplib';
import {
  EXCHANGE_NAME,
  GAME_QUEUE,
  GAME_QUEUE_BINDINGS,
  WALLET_QUEUE,
  WALLET_QUEUE_BINDINGS,
} from '@crash/shared';

export class RabbitMqConnection {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  constructor(private readonly url: string) {}

  async connect(): Promise<Channel> {
    if (this.channel) {
      return this.channel;
    }

    this.connection = await amqp.connect(this.url);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

    return this.channel;
  }

  async setupWalletConsumer(): Promise<Channel> {
    const channel = await this.connect();
    await channel.assertQueue(WALLET_QUEUE, { durable: true });

    for (const binding of WALLET_QUEUE_BINDINGS) {
      await channel.bindQueue(WALLET_QUEUE, EXCHANGE_NAME, binding);
    }

    return channel;
  }

  async setupGameConsumer(): Promise<Channel> {
    const channel = await this.connect();
    await channel.assertQueue(GAME_QUEUE, { durable: true });

    for (const binding of GAME_QUEUE_BINDINGS) {
      await channel.bindQueue(GAME_QUEUE, EXCHANGE_NAME, binding);
    }

    return channel;
  }

  getChannel(): Channel {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    return this.channel;
  }

  async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
    this.channel = null;
    this.connection = null;
  }
}
