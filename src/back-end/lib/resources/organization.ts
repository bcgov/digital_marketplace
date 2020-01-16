import * as crud from 'back-end/lib/crud';
import { Connection, createOrganization, readManyOrganizations, readOneOrganization, updateOrganization } from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler, Response } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateImageFile, validateOrganizationId } from 'back-end/lib/validation';
import { getString } from 'shared/lib';
import { CreateRequestBody, CreateValidationErrors, Organization, OrganizationSlim, UpdateRequestBody, UpdateValidationErrors } from 'shared/lib/resources/organization';
import { Session } from 'shared/lib/resources/session';
import { Id } from 'shared/lib/types';
import { allValid, getInvalidValue, invalid, isValid, optionalAsync, valid, validateUUID, Validation } from 'shared/lib/validation';
import * as orgValidation from 'shared/lib/validation/organization';

export interface ValidatedUpdateRequestBody extends UpdateRequestBody {
  id: Id;
  active?: boolean;
  deactivatedOn?: Date;
  deactivatedBy?: Id;
}

export type ValidatedCreateRequestBody = CreateRequestBody;

type DeleteValidatedReqBody = Organization;

type DeleteValidationErrors = {
  id?: string[];
  permissions?: string[];
};

type Resource = crud.Resource<
  SupportedRequestBodies,
  SupportedResponseBodies,
  CreateRequestBody,
  ValidatedCreateRequestBody,
  CreateValidationErrors,
  null,
  null,
  UpdateRequestBody,
  ValidatedUpdateRequestBody,
  UpdateValidationErrors,
  DeleteValidatedReqBody,
  DeleteValidationErrors,
  Session,
  Connection
>;

const resource: Resource = {
  routeNamespace: 'organizations',

  readMany(connection) {
    return nullRequestBodyHandler<JsonResponseBody<OrganizationSlim[]>, Session>(async request => {
      const respond = (code: number, body: OrganizationSlim[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
      // Pass session in so we can add owner name for admin/owner only
      const organizations = await readManyOrganizations(connection, request.session);
      return respond(200, organizations);
    });
  },

  readOne(connection) {
    return nullRequestBodyHandler<JsonResponseBody<Organization | string[]>, Session>(async request => {
      const respond = (code: number, body: Organization | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
      // Validate the provided id
      const validatedId = validateUUID(request.params.id);
      if (validatedId.tag === 'invalid') {
        return respond(400, validatedId.value);
      }
      // Only admins or the org owner can read the full org details
      if (await permissions.readOneOrganization(connection, request.session, validatedId.value)) {
        const organization = await readOneOrganization(connection, validatedId.value);
        return respond(200, organization);
      }
      return respond(401, [permissions.ERROR_MESSAGE]);
    });
  },

  create(connection) {
    return {
      async parseRequestBody(request) {
        const body = request.body.tag === 'json' ? request.body.value : {};
        return {
          legalName: getString(body, 'legalName'),
          logoImageFile: getString(body, 'logoImageFile'),
          websiteUrl: getString(body, 'websiteUrl'),
          streetAddress1: getString(body, 'streetAddress1'),
          streetAddress2: getString(body, 'streetAddress2'),
          city: getString(body, 'city'),
          region: getString(body, 'region'),
          mailCode: getString(body, 'mailCode'),
          country: getString(body, 'country'),
          contactName: getString(body, 'contactName'),
          contactTitle: getString(body, 'contactTitle'),
          contactEmail: getString(body, 'contactEmail'),
          contactPhone: getString(body, 'contactPhone')
        };
      },
      async validateRequestBody(request): Promise<Validation<ValidatedCreateRequestBody, CreateValidationErrors>> {
        const { legalName,
                logoImageFile,
                websiteUrl,
                streetAddress1,
                streetAddress2,
                city,
                region,
                mailCode,
                country,
                contactName,
                contactTitle,
                contactEmail,
                contactPhone } = request.body;

        const validatedLegalName = orgValidation.validateLegalName(legalName);
        const validatedLogoImageFile = await optionalAsync(logoImageFile, v => validateImageFile(connection, v));
        const validatedWebsiteUrl = orgValidation.validateWebsiteUrl(websiteUrl);
        const validatedStreetAddress1 = orgValidation.validateStreetAddress1(streetAddress1);
        const validatedStreetAddress2 = orgValidation.validateStreetAddress2(streetAddress2);
        const validatedCity = orgValidation.validateCity(city);
        const validatedRegion = orgValidation.validateRegion(region);
        const validatedMailCode = orgValidation.validateMailCode(mailCode);
        const validatedCountry = orgValidation.validateCountry(country);
        const validatedContactName = orgValidation.validateContactName(contactName);
        const validatedContactTitle = orgValidation.validateContactTitle(contactTitle);
        const validatedContactEmail = orgValidation.validateContactEmail(contactEmail);
        const validatedContactPhone = orgValidation.validateContactPhone(contactPhone);

        if (allValid([validatedLegalName,
                      validatedLogoImageFile,
                      validatedWebsiteUrl,
                      validatedStreetAddress1,
                      validatedStreetAddress2,
                      validatedCity,
                      validatedRegion,
                      validatedMailCode,
                      validatedCountry,
                      validatedContactName,
                      validatedContactTitle,
                      validatedContactEmail,
                      validatedContactPhone
                    ])) {
                      if (!permissions.createOrganization(request.session) || !request.session.user) {
                        return invalid({
                          permissions: [permissions.ERROR_MESSAGE]
                        });
                      }
                      return valid({
                        legalName: validatedLegalName.value,
                        logoImageFile: isValid(validatedLogoImageFile) && validatedLogoImageFile.value && validatedLogoImageFile.value.id,
                        websiteUrl: validatedWebsiteUrl.value,
                        streetAddress1: validatedStreetAddress1.value,
                        streetAddress2: validatedStreetAddress2.value,
                        city: validatedCity.value,
                        region: validatedRegion.value,
                        mailCode: validatedMailCode.value,
                        country: validatedCountry.value,
                        contactName: validatedContactName.value,
                        contactTitle: validatedContactTitle.value,
                        contactEmail: validatedContactEmail.value,
                        contactPhone: validatedContactPhone.value
                      } as ValidatedCreateRequestBody);
                    } else {
                      return invalid({
                        legalName: getInvalidValue(validatedLegalName, undefined),
                        logoImageFile: getInvalidValue(validatedLogoImageFile, undefined),
                        websiteUrl: getInvalidValue(validatedWebsiteUrl, undefined),
                        contactName: getInvalidValue(validatedContactName, undefined),
                        contactTitle: getInvalidValue(validatedContactTitle, undefined),
                        contactEmail: getInvalidValue(validatedContactEmail, undefined),
                        contactPhone: getInvalidValue(validatedContactPhone, undefined),
                        streetAddress1: getInvalidValue(validatedStreetAddress1, undefined),
                        streetAddress2: getInvalidValue(validatedStreetAddress2, undefined),
                        city: getInvalidValue(validatedCity, undefined),
                        region: getInvalidValue(validatedRegion, undefined),
                        mailCode: getInvalidValue(validatedMailCode, undefined),
                        country: getInvalidValue(validatedCountry, undefined)
                      });
                    }
      },
      async respond(request): Promise<Response<JsonResponseBody<Organization | CreateValidationErrors>, Session>> {
        const respond = (code: number, body: Organization | CreateValidationErrors) => basicResponse(code, request.session, makeJsonResponseBody(body));
        switch (request.body.tag) {
          case 'invalid':
            if (request.body.value.permissions) {
              return respond(401, request.body.value);
            }
            return respond(400, request.body.value);
          case 'valid':
            if (!request.session.user) {
              return respond(401, { permissions: [permissions.ERROR_MESSAGE] });
            }
            const organization = await createOrganization(connection, request.session.user.id, request.body.value);
            return respond(201, organization);
        }
      }
    };
  },

  update(connection) {
    return {
      async parseRequestBody(request): Promise<UpdateRequestBody> {
        const body = request.body.tag === 'json' ? request.body.value : {};
        return {
          legalName: getString(body, 'legalName'),
          logoImageFile: getString(body, 'logoImageFile'),
          websiteUrl: getString(body, 'websiteUrl'),
          streetAddress1: getString(body, 'streetAddress1'),
          streetAddress2: getString(body, 'streetAddress2'),
          city: getString(body, 'city'),
          region: getString(body, 'region'),
          mailCode: getString(body, 'mailCode'),
          country: getString(body, 'country'),
          contactName: getString(body, 'contactName'),
          contactTitle: getString(body, 'contactTitle'),
          contactEmail: getString(body, 'contactEmail'),
          contactPhone: getString(body, 'contactString')
        };
      },
      async validateRequestBody(request): Promise<Validation<ValidatedUpdateRequestBody, UpdateValidationErrors>> {
        const {
          legalName,
          logoImageFile,
          websiteUrl,
          streetAddress1,
          streetAddress2,
          city,
          region,
          mailCode,
          country,
          contactName,
          contactTitle,
          contactEmail,
          contactPhone } = request.body;

        const validatedOrganization = await validateOrganizationId(connection, request.params.id);
        const validatedLegalName = orgValidation.validateLegalName(legalName);
        const validatedLogoImageFile = await optionalAsync(logoImageFile, v => validateImageFile(connection, v));
        const validatedWebsiteUrl = orgValidation.validateWebsiteUrl(websiteUrl);
        const validatedStreetAddress1 = orgValidation.validateStreetAddress1(streetAddress1);
        const validatedStreetAddress2 = orgValidation.validateStreetAddress2(streetAddress2);
        const validatedCity = orgValidation.validateCity(city);
        const validatedRegion = orgValidation.validateRegion(region);
        const validatedMailCode = orgValidation.validateMailCode(mailCode);
        const validatedCountry = orgValidation.validateCountry(country);
        const validatedContactName = orgValidation.validateContactName(contactName);
        const validatedContactTitle = orgValidation.validateContactTitle(contactTitle);
        const validatedContactEmail = orgValidation.validateContactEmail(contactEmail);
        const validatedContactPhone = orgValidation.validateContactPhone(contactPhone);

        if (allValid([
          validatedOrganization,
          validatedLegalName,
          validatedLogoImageFile,
          validatedWebsiteUrl,
          validatedStreetAddress1,
          validatedStreetAddress2,
          validatedCity,
          validatedRegion,
          validatedMailCode,
          validatedCountry,
          validatedContactName,
          validatedContactTitle,
          validatedContactEmail,
          validatedContactPhone
        ])) {
          if (!await permissions.updateOrganization(connection, request.session, request.params.id)) {
            return invalid({
              permissions: [permissions.ERROR_MESSAGE]
            });
          }
          return valid({
            id: (validatedOrganization.value as Organization).id,
            legalName: validatedLegalName.value,
            logoImageFile: isValid(validatedLogoImageFile) && validatedLogoImageFile.value && validatedLogoImageFile.value.id,
            websiteUrl: validatedWebsiteUrl.value,
            streetAddress1: validatedStreetAddress1.value,
            streetAddress2: validatedStreetAddress2.value,
            city: validatedCity.value,
            region: validatedRegion.value,
            mailCode: validatedMailCode.value,
            country: validatedCountry.value,
            contactName: validatedContactName.value,
            contactTitle: validatedContactTitle.value,
            contactEmail: validatedContactEmail.value,
            contactPhone: validatedContactPhone.value
          } as ValidatedUpdateRequestBody);
        } else {
          return invalid({
            id: getInvalidValue(validatedOrganization, undefined),
            legalName: getInvalidValue(validatedLegalName, undefined),
            logoImageFile: getInvalidValue(validatedLogoImageFile, undefined),
            websiteUrl: getInvalidValue(validatedWebsiteUrl, undefined),
            contactName: getInvalidValue(validatedContactName, undefined),
            contactTitle: getInvalidValue(validatedContactTitle, undefined),
            contactEmail: getInvalidValue(validatedContactEmail, undefined),
            contactPhone: getInvalidValue(validatedContactPhone, undefined),
            streetAddress1: getInvalidValue(validatedStreetAddress1, undefined),
            streetAddress2: getInvalidValue(validatedStreetAddress2, undefined),
            city: getInvalidValue(validatedCity, undefined),
            region: getInvalidValue(validatedRegion, undefined),
            mailCode: getInvalidValue(validatedMailCode, undefined),
            country: getInvalidValue(validatedCountry, undefined)
          });
        }
      },
      async respond(request): Promise<Response<JsonResponseBody<Organization | UpdateValidationErrors>, Session>> {
        const respond = (code: number, body: Organization | UpdateValidationErrors) => basicResponse(code, request.session, makeJsonResponseBody(body));
        switch (request.body.tag) {
          case 'invalid':
            if (request.body.value.permissions) {
              return respond(401, request.body.value);
            }
            return respond(400, request.body.value);
          case 'valid':
            if (!await permissions.updateOrganization(connection, request.session, request.params.id)) {
              return respond(401, {
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            const updatedOrganization = await updateOrganization(connection, request.body.value);
            return respond(200, updatedOrganization);
        }
      }
    };
  },

  delete(connection) {
    return {
      async validateRequestBody(request): Promise<Validation<DeleteValidatedReqBody, DeleteValidationErrors>> {
        const validatedOrganization = await validateOrganizationId(connection, request.params.id);
        if (isValid(validatedOrganization)) {
          if (!(await permissions.deleteOrganization(connection, request.session, request.params.id))) {
            return invalid({
              permissions: [permissions.ERROR_MESSAGE]
            });
          }
          return validatedOrganization;
        } else {
          return invalid({
            id: getInvalidValue(validatedOrganization, undefined)
          });
        }
      },
      async respond(request): Promise<Response<JsonResponseBody<Organization | DeleteValidationErrors>, Session>> {
        const respond = (code: number, body: Organization | DeleteValidationErrors) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (request.body.tag === 'invalid') {
          if (request.body.value.permissions) {
            return respond(401, request.body.value);
          }
          return respond(404, request.body.value);
        }
        // Mark the organization as inactive
        const updatedOrganization = await updateOrganization(connection, {
          id: request.params.id,
          active: false,
          deactivatedOn: new Date(),
          deactivatedBy: request.session.user && request.session.user.id
        });
        return respond(200, updatedOrganization);
      }
    };
  }
};

export default resource;
