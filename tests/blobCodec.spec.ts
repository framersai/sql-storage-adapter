import { describe, it, expect } from 'vitest';
import { NodeBlobCodec } from '../src/codecs/NodeBlobCodec.js';
import { BrowserBlobCodec } from '../src/codecs/BrowserBlobCodec.js';

const testVec = [0.1, 0.2, 0.3, -0.5, 1.0, 0.0];

describe('NodeBlobCodec', () => {
  const codec = new NodeBlobCodec();

  it('encode returns a Uint8Array of correct length', () => {
    const blob = codec.encode(testVec);
    expect(blob).toBeInstanceOf(Uint8Array);
    expect(blob.length).toBe(testVec.length * 4);
  });

  it('roundtrip: decode(encode(vec)) equals original', () => {
    const blob = codec.encode(testVec);
    const decoded = codec.decode(blob);
    expect(decoded.length).toBe(testVec.length);
    for (let i = 0; i < testVec.length; i++) {
      expect(decoded[i]).toBeCloseTo(testVec[i]!, 5);
    }
  });

  it('sha256 returns 64-char hex string', async () => {
    const hash = await codec.sha256('hello world');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('sha256 is deterministic', async () => {
    const h1 = await codec.sha256('test input');
    const h2 = await codec.sha256('test input');
    expect(h1).toBe(h2);
  });
});

describe('BrowserBlobCodec', () => {
  const codec = new BrowserBlobCodec();

  it('encode returns a Uint8Array of correct length', () => {
    const blob = codec.encode(testVec);
    expect(blob).toBeInstanceOf(Uint8Array);
    expect(blob.length).toBe(testVec.length * 4);
  });

  it('roundtrip: decode(encode(vec)) equals original', () => {
    const blob = codec.encode(testVec);
    const decoded = codec.decode(blob);
    expect(decoded.length).toBe(testVec.length);
    for (let i = 0; i < testVec.length; i++) {
      expect(decoded[i]).toBeCloseTo(testVec[i]!, 5);
    }
  });

  it('sha256 returns 64-char hex string', async () => {
    const hash = await codec.sha256('hello world');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('NodeBlobCodec and BrowserBlobCodec produce identical results', () => {
    const nodeCodec = new NodeBlobCodec();
    const nodeBlob = nodeCodec.encode(testVec);
    const browserBlob = codec.encode(testVec);
    expect(new Uint8Array(nodeBlob)).toEqual(new Uint8Array(browserBlob));
  });
});
