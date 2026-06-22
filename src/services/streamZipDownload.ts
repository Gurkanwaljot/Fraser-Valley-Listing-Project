import { Zip, ZipPassThrough } from 'fflate';
import type { StreamManifest, StreamManifestFile } from './streamDownloadService';
import { recordStreamRun, recordStreamRunBeacon } from './streamDownloadService';

export interface StreamProgress {
  bytesDelivered: number;
  filesDelivered: number;
  expectedBytes: number;
  expectedFileCount: number;
  currentFile: string | null;
}

export interface StreamZipOptions {
  onProgress?: (progress: StreamProgress) => void;
  signal?: AbortSignal;
}

class FFlateError extends Error {}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function streamFileIntoZip(
  file: StreamManifestFile,
  entry: ZipPassThrough,
  signal: AbortSignal | undefined,
  onChunk: (bytes: number) => void,
): Promise<void> {
  const response = await fetch(file.signedUrl, { signal });
  if (!response.ok) {
    throw new Error(`Fetch failed for ${file.path}: HTTP ${response.status}`);
  }
  if (!response.body) {
    throw new Error(`No response body for ${file.path}`);
  }
  const reader = response.body.getReader();
  let received = 0;
  try {
    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const { value, done } = await reader.read();
      if (done) break;
      if (value && value.byteLength > 0) {
        entry.push(value, false);
        received += value.byteLength;
        onChunk(value.byteLength);
      }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
  }
  entry.push(new Uint8Array(0), true);
  if (received < file.sizeBytes) {
    throw new Error(
      `Short read for ${file.path}: ${received}/${file.sizeBytes} bytes`,
    );
  }
}

export async function streamZipDownload(
  manifest: StreamManifest,
  options: StreamZipOptions = {},
): Promise<{ bytesDelivered: number; filesDelivered: number }> {
  const { onProgress, signal } = options;
  const chunks: Uint8Array[] = [];
  let bytesDelivered = 0;
  let filesDelivered = 0;
  let currentFile: string | null = null;

  const zip = new Zip();
  let zipError: Error | null = null;
  zip.ondata = (err: Error | null, chunk: Uint8Array) => {
    if (err) {
      zipError = err instanceof Error ? err : new FFlateError(String(err));
      return;
    }
    if (chunk && chunk.byteLength > 0) {
      const copy = new Uint8Array(chunk.byteLength);
      copy.set(chunk);
      chunks.push(copy);
    }
  };

  const emitProgress = () => {
    if (!onProgress) return;
    onProgress({
      bytesDelivered,
      filesDelivered,
      expectedBytes: manifest.expectedBytes,
      expectedFileCount: manifest.expectedFileCount,
      currentFile,
    });
  };

  const beaconHandler = () => {
    recordStreamRunBeacon({
      runToken: manifest.runToken,
      status: 'cancelled',
      bytesDelivered,
      filesDelivered,
      errorMessage: 'Tab closed mid-stream',
    });
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', beaconHandler, { once: true });
  }

  try {
    emitProgress();
    for (let i = 0; i < manifest.files.length; i++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (zipError) throw zipError;

      const file = manifest.files[i];
      currentFile = file.path;
      emitProgress();

      const entry = new ZipPassThrough(file.path);
      zip.add(entry);

      await streamFileIntoZip(file, entry, signal, (delta) => {
        bytesDelivered += delta;
        emitProgress();
      });

      filesDelivered = i + 1;
      emitProgress();
    }

    zip.end();
    if (zipError) throw zipError;

    const blob = new Blob(chunks as BlobPart[], { type: 'application/zip' });
    triggerBlobDownload(blob, manifest.zipFilename);

    void recordStreamRun({
      runToken: manifest.runToken,
      status: 'success',
      bytesDelivered,
      filesDelivered,
    });

    return { bytesDelivered, filesDelivered };
  } catch (err) {
    const aborted =
      err instanceof DOMException && err.name === 'AbortError';
    const message = err instanceof Error ? err.message : String(err);
    void recordStreamRun({
      runToken: manifest.runToken,
      status: aborted ? 'cancelled' : 'error',
      bytesDelivered,
      filesDelivered,
      errorMessage: message,
    });
    throw err;
  } finally {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', beaconHandler);
    }
  }
}
