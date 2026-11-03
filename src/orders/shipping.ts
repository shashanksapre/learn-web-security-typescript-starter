import type { Keyring } from "../storage/keyring.ts";
import {
  encryptWithKeyring,
  decryptWithKeyring,
  serializeEncryptedPayload,
  deserializeEncryptedPayload,
} from "../storage/keyring.ts";

export type ShippingDetails = {
  name: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
};

export function encryptShippingDetails(
  details: ShippingDetails,
  keyring: Keyring | undefined,
): string {
  const encrypted = encryptWithKeyring(
    Buffer.from(JSON.stringify(details), "utf-8"),
    keyring,
  );

  return serializeEncryptedPayload(encrypted).toString("utf-8");
}

export function decryptShippingDetails(
  serialized: string,
  keyring: Keyring | undefined,
): ShippingDetails {
  let details: unknown;

  try {
    const encrypted = deserializeEncryptedPayload(
      Buffer.from(serialized, "utf-8"),
    );

    const data = decryptWithKeyring(encrypted, keyring);
    details = JSON.parse(data.toString("utf-8"));
  } catch {
    throw new Error("Invalid shipping details");
  }

  if (!isShippingDetails(details)) {
    throw new Error("Invalid shipping details");
  }

  return details;
}

function isShippingDetails(details: unknown): details is ShippingDetails {
  if (!details || typeof details !== "object") {
    return false;
  }

  const candidate = details as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.address === "string" &&
    typeof candidate.city === "string" &&
    typeof candidate.region === "string" &&
    typeof candidate.postalCode === "string"
  );
}
