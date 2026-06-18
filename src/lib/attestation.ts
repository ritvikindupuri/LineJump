import crypto from "node:crypto";
import type { ScanReport } from "./mcp-scanner";

// For demonstration, a static key pair. In reality, this would be KMS/Sigstore.
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

export function signReport(report: ScanReport): {
  payload: string;
  signature: string;
  publicKey: string;
} {
  const payload = JSON.stringify(report);
  const sign = crypto.createSign("SHA256");
  sign.update(payload);
  sign.end();
  const signature = sign.sign(privateKey, "base64");

  return {
    payload,
    signature,
    publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
}
