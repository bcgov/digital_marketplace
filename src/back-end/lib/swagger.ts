import { ORIGIN } from "back-end/config";
import swaggerJSDoc from "swagger-jsdoc";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Digital Marketplace",
      version: "1.0",
      description: "Server API for the Digital Marketplace"
    },
    servers: [
      {
        url: `${ORIGIN}/api`
      }
    ]
  },
  apis: ["src/back-end/docs/**/*.yaml"]
};

export default swaggerJSDoc(options);
