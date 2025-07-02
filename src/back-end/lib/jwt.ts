import jwt from "jsonwebtoken";
import {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_AUDIENCE,
  JWT_ISSUER
} from "back-end/config";
import { Session } from "shared/lib/resources/session";
import { UserType } from "shared/lib/resources/user";

export interface JWTPayload {
  sub: string; // user ID
  name: string;
  email: string | null;
  type: UserType;
  capabilities: string[];
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}

export function generateAIToken(session: Session): string {
  if (!session || !session.user) {
    throw new Error("Invalid session for JWT generation");
  }

  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const payload: Partial<JWTPayload> = {
    sub: session.user.id,
    name: session.user.name,
    email: session.user.email,
    type: session.user.type,
    capabilities: session.user.capabilities
  };

  const options: jwt.SignOptions = {
    expiresIn: JWT_EXPIRES_IN as any,
    audience: JWT_AUDIENCE,
    issuer: JWT_ISSUER
  };

  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyAIToken(token: string): JWTPayload | null {
  if (!JWT_SECRET) {
    return null;
  }

  try {
    const options: jwt.VerifyOptions = {
      audience: JWT_AUDIENCE,
      issuer: JWT_ISSUER
    };

    const decoded = jwt.verify(token, JWT_SECRET, options) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}
