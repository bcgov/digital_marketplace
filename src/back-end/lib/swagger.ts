import { ORIGIN } from 'back-end/config';
import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  apis: ['src/back-end/docs/user-api.yaml', 'src/back-end/docs/organization-api.yaml'],
  swaggerDefinition: {
    servers: [
      {
        url: `${ORIGIN}/api`
      }
    ],
    info: {
      description: 'Server API for the Digital Marketplace',
      title: 'Digital Marketplace',
      version: '1.0'
    },
    openapi: '3.0.0'
  }
};

const specs = swaggerJSDoc(options);

export = specs;
