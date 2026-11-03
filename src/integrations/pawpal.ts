import { createHmac, timingSafeEqual } from "node:crypto";

// const pawPalApiKey = "pawpal_test_insecure_hardcoded_key";

export function createPawPalReference(
  orderId: number,
  totalCents: number,
  apiKey: string,
): string {
  const payload = `${orderId}:${totalCents}`;
  const signature = createHmac("sha256", apiKey)
    .update(payload)
    .digest("hex")
    .slice(0, 16);
  return `pawpal_${orderId}_${signature}`;
}

export function createPawPalCheckoutUrl(orderId: number): string {
  const checkoutUrl = new URL("https://pawpal.example/checkout");
  checkoutUrl.searchParams.set("orderId", String(orderId));
  return checkoutUrl.toString();
}

export type PawPalWebhookVerification =
  | { outcome: "unauthorized" }
  | { outcome: "malformed" }
  | { outcome: "approved"; orderId: number };

export function verifyPawPalWebhook(
  providedKey: string | string[] | undefined,
  expectedKey: string,
  payload: unknown,
): PawPalWebhookVerification {
  if (typeof providedKey != "string") {
    return {
      outcome: "unauthorized",
    };
  }

  if (providedKey.length != expectedKey.length) {
    return {
      outcome: "unauthorized",
    };
  }

  if (
    !timingSafeEqual(
      Buffer.from(providedKey, "utf-8"),
      Buffer.from(expectedKey, "utf-8"),
    )
  ) {
    return {
      outcome: "unauthorized",
    };
  }

  const payloadRecord =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};

  const orderId =
    typeof payloadRecord.orderId === "number"
      ? payloadRecord.orderId
      : Number.NaN;

  if (
    payloadRecord.status != "approved" ||
    !Number.isInteger(orderId) ||
    orderId < 0
  ) {
    return {
      outcome: "malformed",
    };
  }

  return { outcome: "approved", orderId };
}
