import { afterEach, describe, expect, it, vi } from 'vitest';
import { SerialTransport } from '../src/transport/serial.js';

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

function installSerialMock(requestPort: ReturnType<typeof vi.fn>): void {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      serial: {
        requestPort,
        getPorts: vi.fn().mockResolvedValue([]),
      },
    },
  });
}

const mockPort = {
  getInfo: () => ({ usbVendorId: 0x0403, usbProductId: 0x6015 }),
} as SerialPort;

describe('SerialTransport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', originalNavigator);
    } else {
      Reflect.deleteProperty(globalThis, 'navigator');
    }
  });

  it('opens the serial chooser with common USB serial adapter filters by default', async () => {
    const requestPort = vi.fn().mockResolvedValue(mockPort);
    installSerialMock(requestPort);

    await new SerialTransport().requestPort();

    expect(requestPort).toHaveBeenCalledWith({
      filters: SerialTransport.USB_SERIAL_FILTERS,
    });
  });

  it('passes explicit filters when a caller supplies them', async () => {
    const requestPort = vi.fn().mockResolvedValue(mockPort);
    const filters = [{ usbVendorId: 0x0403, usbProductId: 0x6015 }];
    installSerialMock(requestPort);

    await new SerialTransport().requestPort({ filters });

    expect(requestPort).toHaveBeenCalledWith({ filters });
  });

  it('opens the serial chooser without filters when a caller supplies an empty filter list', async () => {
    const requestPort = vi.fn().mockResolvedValue(mockPort);
    installSerialMock(requestPort);

    await new SerialTransport().requestPort({ filters: [] });

    expect(requestPort).toHaveBeenCalledWith();
  });
});
