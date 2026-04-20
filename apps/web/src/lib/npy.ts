/**
 * Minimal NumPy `.npy` parser sufficient for Neureel's per-frame activation
 * tensors.
 *
 * Only accepts little-endian float32 (`<f4`) C-order arrays. That's what
 * `np.save` on `preds.astype(np.float32)` from `ml/utils/raw_upload.py`
 * produces. Anything else throws a clear error so the caller can surface it.
 *
 * Format reference: https://numpy.org/doc/stable/reference/generated/numpy.lib.format.html
 *
 *   magic     6 bytes  \x93NUMPY
 *   major     1 byte
 *   minor     1 byte
 *   hdr_len   u16 LE  (v1.0)  |  u32 LE  (v2.0/3.0)
 *   header    ASCII Python dict literal, e.g.
 *             {'descr': '<f4', 'fortran_order': False, 'shape': (30, 20484)}
 *             padded with spaces + newline so total is a multiple of 64
 *   body      raw array bytes
 */

export interface NpyFloat32 {
  shape: number[];
  data: Float32Array;
}

const MAGIC = [0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59];

export function parseNpyFloat32(buf: ArrayBuffer): NpyFloat32 {
  const view = new DataView(buf);

  if (buf.byteLength < 10) throw new Error("NPY: buffer too small");
  for (let i = 0; i < MAGIC.length; i++) {
    if (view.getUint8(i) !== MAGIC[i]) {
      throw new Error("NPY: bad magic — not a .npy file");
    }
  }
  const major = view.getUint8(6);
  const minor = view.getUint8(7);
  if (major < 1 || major > 3) {
    throw new Error(`NPY: unsupported version ${major}.${minor}`);
  }

  let headerLen: number;
  let headerStart: number;
  if (major === 1) {
    headerLen = view.getUint16(8, true);
    headerStart = 10;
  } else {
    headerLen = view.getUint32(8, true);
    headerStart = 12;
  }

  const headerBytes = new Uint8Array(buf, headerStart, headerLen);
  const header = new TextDecoder("ascii").decode(headerBytes).trim();

  const descr = extract(header, /'descr'\s*:\s*'([^']+)'/);
  const fortran = extract(header, /'fortran_order'\s*:\s*(True|False)/);
  const shapeStr = extract(header, /'shape'\s*:\s*\(([^)]*)\)/);

  if (descr !== "<f4") {
    throw new Error(
      `NPY: expected dtype '<f4' (little-endian float32), got '${descr}'`,
    );
  }
  if (fortran !== "False") {
    throw new Error("NPY: fortran_order=True not supported");
  }

  const shape = shapeStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const n = Number.parseInt(s, 10);
      if (!Number.isFinite(n) || n < 0) {
        throw new Error(`NPY: bad shape component '${s}'`);
      }
      return n;
    });

  const elements = shape.reduce((a, b) => a * b, 1);
  const dataStart = headerStart + headerLen;
  const dataBytes = elements * 4;
  if (buf.byteLength < dataStart + dataBytes) {
    throw new Error(
      `NPY: truncated — expected ${dataBytes} bytes of float32 data, got ${buf.byteLength - dataStart}`,
    );
  }

  // Float32Array is little-endian on every platform Neureel targets.
  const data = new Float32Array(buf, dataStart, elements);

  return { shape, data };
}

function extract(header: string, re: RegExp): string {
  const m = header.match(re);
  if (!m) {
    throw new Error(`NPY: could not parse header (missing ${re.source})`);
  }
  return m[1];
}
