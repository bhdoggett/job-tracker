// backend/src/lib/backup/manifest.test.ts
import { describe, it, expect } from "vitest";
import {
  buildManifest,
  validateManifest,
  fingerprintKey,
  ManifestValidationError,
  FORMAT_VERSION,
} from "./manifest";

describe("fingerprintKey", () => {
  it("is deterministic for the same key", () => {
    expect(fingerprintKey("abc123")).toBe(fingerprintKey("abc123"));
  });

  it("differs for different keys", () => {
    expect(fingerprintKey("abc123")).not.toBe(fingerprintKey("def456"));
  });
});

describe("buildManifest", () => {
  it("stamps the current format version and the provided fields", () => {
    const manifest = buildManifest({
      hostname: "test-host",
      keyFingerprint: "fp123",
      rowCounts: { projects: 2 },
      warnings: [],
    });
    expect(manifest.formatVersion).toBe(FORMAT_VERSION);
    expect(manifest.hostname).toBe("test-host");
    expect(manifest.keyFingerprint).toBe("fp123");
    expect(manifest.rowCounts).toEqual({ projects: 2 });
    expect(typeof manifest.createdAt).toBe("string");
  });
});

describe("validateManifest", () => {
  const valid = buildManifest({
    hostname: "host-a",
    keyFingerprint: "fp-match",
    rowCounts: { projects: 1 },
    warnings: [],
  });

  it("accepts a manifest whose fingerprint matches", () => {
    expect(validateManifest(valid, "fp-match")).toEqual(valid);
  });

  it("rejects a manifest whose fingerprint does not match", () => {
    expect(() => validateManifest(valid, "fp-different")).toThrow(ManifestValidationError);
  });

  it("rejects a manifest with an unsupported format version", () => {
    const wrongVersion = { ...valid, formatVersion: 999 };
    expect(() => validateManifest(wrongVersion, "fp-match")).toThrow(ManifestValidationError);
  });

  it("rejects a non-object manifest", () => {
    expect(() => validateManifest(null, "fp-match")).toThrow(ManifestValidationError);
  });
});
