/**
 * Serial transport using Web Serial API
 * Requires user gesture for requestPort()
 */

import type { Transport, TransportCallbacks, SerialPortFilter } from './types.js';
import { LineBuffer } from '../protocol/line-buffer.js';


export class SerialTransport implements Transport {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private readerLock = false;
  private callbacks: TransportCallbacks = {};
  private lineListeners: Set<(line: string) => void> = new Set();
  private dataListeners: Set<(data: Uint8Array) => void> = new Set();
  private lineBuffer: LineBuffer;
  private _isConnected = false;
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();

  /** Common SiK radio USB IDs. */
  static readonly SIK_FILTERS: SerialPortFilter[] = [
    { usbVendorId: 0x0403, usbProductId: 0x6015 },
  ];

  /** Common USB-to-serial chips used by SiK radios and adapter cables. */
  static readonly USB_SERIAL_FILTERS: SerialPortFilter[] = [
    { usbVendorId: 0x0403 }, // FTDI
    { usbVendorId: 0x10c4 }, // Silicon Labs CP210x
    { usbVendorId: 0x1a86 }, // WCH CH340/CH341
    { usbVendorId: 0x067b }, // Prolific PL2303
  ];

  constructor() {
    this.lineBuffer = new LineBuffer({
      onLine: (line) => {
        this.callbacks.onLine?.(line);
        this.lineListeners.forEach((cb) => cb(line));
      },
    });
  }

  addLineListener(cb: (line: string) => void): () => void {
    this.lineListeners.add(cb);
    return () => this.lineListeners.delete(cb);
  }

  addDataListener(cb: (data: Uint8Array) => void): () => void {
    this.dataListeners.add(cb);
    return () => this.dataListeners.delete(cb);
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  get portInfo(): { name?: string; vendorId?: number; productId?: number } | undefined {
    if (!this.port) return undefined;
    try {
      const info = (this.port as SerialPort).getInfo?.();
      const vid = info?.usbVendorId;
      const pid = info?.usbProductId;
      const name =
        (this.port as SerialPort & { serialNumber?: string }).serialNumber ??
        (vid != null && pid != null ? `USB ${vid.toString(16).padStart(4, '0')}:${pid.toString(16).padStart(4, '0')}` : null) ??
        'Serial Port';
      return { name, vendorId: vid, productId: pid };
    } catch {
      return { name: 'Serial Port' };
    }
  }

  setCallbacks(cb: TransportCallbacks): void {
    this.callbacks = cb;
  }

  async requestPort(options?: { filters?: SerialPortFilter[] }): Promise<void> {
    if (!navigator.serial) {
      throw new Error('Web Serial API is not available. Use Chrome 89+ on desktop.');
    }
    const filters = options?.filters ?? SerialTransport.USB_SERIAL_FILTERS;
    this.port = filters && filters.length > 0
      ? await navigator.serial.requestPort({ filters })
      : await navigator.serial.requestPort();
  }

  async reconnectKnownPort(): Promise<boolean> {
    if (!navigator.serial) return false;
    const ports = await navigator.serial.getPorts();
    if (ports.length === 0) return false;

    const match = (filters: { usbVendorId: number; usbProductId?: number }[]): SerialPort | undefined =>
      ports.find((p) => {
        const info = p.getInfo?.();
        return filters.some(
          (f) =>
            info?.usbVendorId === f.usbVendorId &&
            (f.usbProductId === undefined || info?.usbProductId === f.usbProductId)
        );
      });

    this.port =
      match(SerialTransport.SIK_FILTERS) ??
      match(SerialTransport.USB_SERIAL_FILTERS) ??
      (ports.length === 1 ? ports[0] : null);

    return this.port !== null;
  }

  async open(options: { baudRate: number }): Promise<void> {
    if (!this.port) {
      throw new Error('No port selected. Call requestPort() or reconnectKnownPort() first.');
    }
    await this.port.open({
      baudRate: options.baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      bufferSize: 65536,
    });
    this._isConnected = true;
    this.startReadLoop();
  }

  async close(): Promise<void> {
    this._isConnected = false;
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {
        /* ignore */
      }
      this.reader = null;
    }
    if (this.port) {
      try {
        await this.port.close();
      } catch {
        /* ignore */
      }
      this.port = null;
    }
    this.callbacks.onClose?.();
  }

  async write(data: string | Uint8Array): Promise<void> {
    if (!this.port?.writable) {
      throw new Error('Port is not open for writing');
    }
    const writer = (this.port as SerialPort).writable.getWriter();
    try {
      const bytes = typeof data === 'string'
        ? this.encoder.encode(data)
        : data;
      await writer.write(bytes);
    } finally {
      writer.releaseLock();
    }
  }

  private async startReadLoop(): Promise<void> {
    if (!this.port?.readable || this.readerLock) return;
    this.readerLock = true;
    this.reader = (this.port as SerialPort).readable.getReader();

    try {
      const port = this.port!;
      while (this._isConnected && port.readable) {
        const { value, done } = await this.reader!.read();
        if (done) break;
        if (value && value.length > 0) {
          this.dataListeners.forEach((cb) => cb(value));
          const text = this.decoder.decode(value);
          this.callbacks.onData?.(text);
          this.lineBuffer.push(text);
        }
      }
    } catch (err) {
      if (this._isConnected) {
        this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      this.reader?.releaseLock();
      this.reader = null;
      this.readerLock = false;
      if (this._isConnected) {
        this._isConnected = false;
        this.callbacks.onClose?.();
      }
    }
  }
}
