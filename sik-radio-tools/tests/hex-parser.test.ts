/**
 * Unit tests for Intel HEX firmware parsing
 */

import { describe, it, expect } from 'vitest';
import { parseIntelHex } from '../src/protocol/hex-parser.js';

const VALID_HEX = `:10010000214601360121470136007EFE09D2190140
:00000001FF`;

describe('hex-parser', () => {
  it('parses valid Intel HEX records', () => {
    const fw = parseIntelHex(VALID_HEX);

    expect(fw.totalBytes).toBe(16);
    expect(fw.segments).toHaveLength(1);
    expect(fw.segments[0].address).toBe(0x0100);
  });

  it('rejects records with invalid byte counts', () => {
    const invalidCount = VALID_HEX.replace(':10', ':11');

    expect(() => parseIntelHex(invalidCount)).toThrow(/byte count/i);
  });

  it('rejects records with invalid checksums', () => {
    const invalidChecksum = VALID_HEX.replace('0140', '0141');

    expect(() => parseIntelHex(invalidChecksum)).toThrow(/checksum/i);
  });
});
