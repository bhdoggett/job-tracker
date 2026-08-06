import { createHash } from "node:crypto";

export const FORMAT_VERSION = 1;

export interface Manifest {
  formatVersion: number;
  createdAt: string;
  hostname: string;
  keyFingerprint: string;
  rowCounts: Record<string, number>;
  warnings: string[];
}

export class ManifestValidationError extends Error {}

export function fingerprintKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex").slice(0, 16);
}

export function buildManifest(params: {
  hostname: string;
  keyFingerprint: string;
  rowCounts: Record<string, number>;
  warnings: string[];
}): Manifest {
  return {
    formatVersion: FORMAT_VERSION,
    createdAt: new Date().toISOString(),
    hostname: params.hostname,
    keyFingerprint: params.keyFingerprint,
    rowCounts: params.rowCounts,
    warnings: params.warnings,
  };
}

export function validateManifest(manifest: unknown, expectedKeyFingerprint: string): Manifest {
  if (typeof manifest !== "object" || manifest === null) {
    throw new ManifestValidationError("manifest.json is not a valid object");
  }
  const m = manifest as Record<string, unknown>;

  if (m.formatVersion !== FORMAT_VERSION) {
    throw new ManifestValidationError(
      `Archive format version ${String(m.formatVersion)} is not supported (expected ${FORMAT_VERSION})`
    );
  }
  if (typeof m.keyFingerprint !== "string") {
    throw new ManifestValidationError("manifest.json is missing keyFingerprint");
  }
  if (m.keyFingerprint !== expectedKeyFingerprint) {
    throw new ManifestValidationError(
      `ENCRYPTION_KEY mismatch: this archive was created on host "${String(
        m.hostname
      )}" with a different key. Copy ENCRYPTION_KEY from that machine's .env before importing.`
    );
  }

  return m as unknown as Manifest;
}
