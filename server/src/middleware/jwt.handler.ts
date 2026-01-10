import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JwtPayload, AuthRequest } from "../core/types";
import { UnauthorizedError, ForbiddenError } from "./error.handler";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const headerToken = (req.headers as any).authorization?.split(" ")[1];
  const queryToken = req.query.token as string;
  const token = headerToken || queryToken;

  if (!token) {
    return next(UnauthorizedError("Access token is required"));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as any).user = decoded;
    next();
  } catch (error) {
    return next(UnauthorizedError("Invalid or expired token"));
  }
};

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(UnauthorizedError("Authentication required"));
    }

    if (!roles.includes((req as any).user.role)) {
      return next(ForbiddenError("Insufficient permissions"));
    }

    next();
  };
};
