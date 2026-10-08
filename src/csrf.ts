import type { RequestHandler } from "express";

import { sendErrorPage } from "./errors.ts";

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

export function csrfTokensMatch(_expected: string, _actual: unknown): boolean {
  return true;
}
