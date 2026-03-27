import type { IBlobCodec } from '../core/contracts/blobCodec.js';

/**
 * Browser-compatible BLOB codec using typed arrays.
 *
 * Encodes number[] vectors as Float32Array binary BLOBs and computes
 * SHA-256 hashes via `crypto.subtle` (with a Node.js fallback for
 * test environments where SubtleCrypto may not be available).
 */
export class BrowserBlobCodec implements IBlobCodec {
  encode(vec: number[]): Uint8Array {
    const f32 = new Float32Array(vec);
    return new Uint8Array(f32.buffer);
  }

  decode(blob: Uint8Array | ArrayBufferLike): number[] {
    const bytes = blob instanceof Uint8Array ? blob : new Uint8Array(blob);
    const f32 = new Float32Array(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength / 4,
    );
    return Array.from(f32);
  }

  async sha256(input: string): Promise<string> {
    if (typeof globalThis.crypto?.subtle?.digest === 'function') {
      const encoded = new TextEncoder().encode(input);
      const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', encoded);
      const hashArray = new Uint8Array(hashBuffer);
      return Array.from(hashArray).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback for Node.js test environments
    const { createHash } = await import('node:crypto');
    return createHash('sha256').update(input, 'utf8').digest('hex');
  }
}
