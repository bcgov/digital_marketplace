import { Connection } from "back-end/lib/db";
import { generateAIToken } from "back-end/lib/jwt";
import * as permissions from "back-end/lib/permissions";
import { JWT_EXPIRES_IN } from "back-end/config";
import {
  makeErrorResponseBody,
  makeTextResponseBody,
  nullRequestBodyHandler,
  Router,
  TextResponseBody
} from "back-end/lib/server";
import { ServerHttpMethod } from "back-end/lib/types";

// Convert JWT_EXPIRES_IN to seconds for API response
function getExpiresInSeconds(): number {
  if (typeof JWT_EXPIRES_IN === "string") {
    // Handle formats like "30m", "1h", "7d", etc.
    const match = JWT_EXPIRES_IN.match(/^(\d+)([smhd])$/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];
      switch (unit) {
        case "s":
          return value;
        case "m":
          return value * 60;
        case "h":
          return value * 60 * 60;
        case "d":
          return value * 60 * 60 * 24;
      }
    }
  }
  // If it's already a number or fallback
  return typeof JWT_EXPIRES_IN === "number" ? JWT_EXPIRES_IN : 30 * 60;
}

function makeRouter(
  _connection: Connection
): Router<any, any, any, any, TextResponseBody, any, any> {
  // @ts-ignore
  const router: Router<any, any, any, any, TextResponseBody, any, any> = [
    {
      method: ServerHttpMethod.Post,
      path: "/jwt/ai-token",
      handler: nullRequestBodyHandler(async (request) => {
        // Verify user is authenticated
        if (!permissions.isSignedIn(request.session)) {
          return {
            code: 401,
            headers: {
              "Content-Type": "application/json"
            },
            session: request.session,
            body: makeTextResponseBody(
              JSON.stringify({ error: "Authentication required" })
            )
          };
        }

        try {
          const token = generateAIToken(request.session);
          const expiresIn = getExpiresInSeconds();

          const responseBody = JSON.stringify({
            token,
            expiresIn,
            tokenType: "Bearer"
          });

          return {
            code: 200,
            headers: {
              "Content-Type": "application/json"
            },
            session: request.session,
            body: makeTextResponseBody(responseBody)
          };
        } catch (error) {
          request.logger.error(
            "JWT generation failed",
            makeErrorResponseBody(error as Error)
          );

          return {
            code: 500,
            headers: {
              "Content-Type": "application/json"
            },
            session: request.session,
            body: makeTextResponseBody(
              JSON.stringify({ error: "Token generation failed" })
            )
          };
        }
      })
    },
    {
      method: ServerHttpMethod.Post,
      path: "/jwt/refresh",
      handler: nullRequestBodyHandler(async (request) => {
        // Verify user is still authenticated with valid session
        if (!permissions.isSignedIn(request.session)) {
          return {
            code: 401,
            headers: {
              "Content-Type": "application/json"
            },
            session: request.session,
            body: makeTextResponseBody(
              JSON.stringify({ error: "Session expired" })
            )
          };
        }

        try {
          const token = generateAIToken(request.session);
          const expiresIn = getExpiresInSeconds();

          const responseBody = JSON.stringify({
            token,
            expiresIn,
            tokenType: "Bearer"
          });

          return {
            code: 200,
            headers: {
              "Content-Type": "application/json"
            },
            session: request.session,
            body: makeTextResponseBody(responseBody)
          };
        } catch (error) {
          request.logger.error(
            "JWT refresh failed",
            makeErrorResponseBody(error as Error)
          );

          return {
            code: 500,
            headers: {
              "Content-Type": "application/json"
            },
            session: request.session,
            body: makeTextResponseBody(
              JSON.stringify({ error: "Token refresh failed" })
            )
          };
        }
      })
    }
  ];

  return router;
}

export default makeRouter;
