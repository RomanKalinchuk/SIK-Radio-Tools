/**
 * Unit tests for SiK AT client behavior
 */

import { describe, it, expect } from 'vitest';
import { SiKRadioClient } from '../src/protocol/sik-client.js';
import type { Transport, TransportCallbacks } from '../src/transport/types.js';

class ImmediateResponseTransport implements Transport {
  private callbacks: TransportCallbacks = {};
  readonly isConnected = true;

  async requestPort(): Promise<void> {}

  async reconnectKnownPort(): Promise<boolean> {
    return false;
  }

  async open(): Promise<void> {}

  async close(): Promise<void> {}

  setCallbacks(cb: TransportCallbacks): void {
    this.callbacks = cb;
  }

  async write(data: string | Uint8Array): Promise<void> {
    const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
    if (text.trim().toUpperCase() === 'ATI') {
      this.callbacks.onLine?.('SiK radio v1.0');
      this.callbacks.onLine?.('OK');
    }
  }
}

describe('SiKRadioClient', () => {
  it('registers response waiter before writing AT commands', async () => {
    const client = new SiKRadioClient(new ImmediateResponseTransport());

    await expect(client.getVersion()).resolves.toBe('SiK radio v1.0');
  });
});
