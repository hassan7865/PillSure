import { Request, Response, NextFunction } from "express";

const redactHeaders = (headers: Request["headers"]) => {
  const safeHeaders = { ...headers };
  if (safeHeaders.authorization) {
    safeHeaders.authorization = "[REDACTED]";
  }
  return safeHeaders;
};

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const startedAt = new Date().toISOString();

  console.log("[REQUEST]", {
    startedAt,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    headers: redactHeaders(req.headers),
  });

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const level = res.statusCode >= 400 ? "[REQUEST_ERROR]" : "[RESPONSE]";

    console.log(level, {
      finishedAt: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
    });
  });

  next();
};
