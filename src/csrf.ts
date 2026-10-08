import type { RequestHandler } from "express";

import { sendErrorPage } from "./errors.ts";
import { timingSafeEqual } from "node:crypto";

export function validateRequestOrigin(appOrigin: string): RequestHandler {
  return (req, res, next) => {
    if (req.method !== "POST") {
      return next();
    }

    if (!req.headers["origin"] && !req.headers["referer"]) {
      return sendErrorPage(res, 403, "Forbidden", "Forbidden");
    }

    if (req.headers["origin"]) {
      if (req.headers["origin"] !== appOrigin) {
        return sendErrorPage(res, 403, "Forbidden", "Forbidden");
      }
    } else if (req.headers["referer"]) {
      if (URL.parse(req.headers["referer"])?.origin !== appOrigin) {
        return sendErrorPage(res, 403, "Forbidden", "Forbidden");
      }
    }

    next();
  };
}

export function csrfTokensMatch(expected: string, actual: unknown): boolean {
  if (typeof actual !== "string") {
    return false;
  }

  const eBuf = Buffer.from(expected);
  const aBuf = Buffer.from(actual);

  if (aBuf.length !== eBuf.length) {
    return false;
  }

  return timingSafeEqual(eBuf, aBuf);
}
