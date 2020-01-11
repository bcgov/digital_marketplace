import * as crud from 'back-end/lib/crud';
import { Connection, createOrganization, readManyOrganizations, readOneOrganization, updateOrganization } from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateImageFile, validateOrganizationId } from 'back-end/lib/validation';
import { getString } from 'shared/lib';
import { CreateRequestBody, CreateValidationErrors, Organization, OrganizationSlim, UpdateRequestBody, UpdateValidationErrors } from 'shared/lib/resources/organization';
import { Session } from 'shared/lib/resources/session';
import { Id } from 'shared/lib/types';
import { allValid, getInvalidValue, invalid, isValid, optional, optionalAsync, valid, validateUUID } from 'shared/lib/validation';
import * as orgValidation from 'shared/lib/validation/organization';

export interface ValidatedUpdateRequestBody extends UpdateRequestBody {
  id: Id;
  active?: boolean;
  deactivatedOn?: Date;
  deactivatedBy?: Id;
}

export type ValidatedCreateRequestBody = CreateRequestBody;

type DeleteValidatedReqBody = Organization;

type DeleteReqBodyErrors = string[];

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
  DeleteReqBodyErrors,
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
        return request.body.tag === 'json' ? request.body.value : {};
      },
      async validateRequestBody(request) {
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
        const validatedLogoImageFile = logoImageFile ? await validateImageFile(connection, logoImageFile) : valid(undefined);
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
                      return valid({
                        legalName: validatedLegalName.value,
                        logoImageFile: isValid(validatedLogoImageFile) ? validatedLogoImageFile.value && validatedLogoImageFile.value.id : undefined,
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
      async respond(request) {
        const respond = (code: number, body: Organization | CreateValidationErrors) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!permissions.createOrganization(request.session) || !request.session.user) {
          return respond(401, {
            permissions: [permissions.ERROR_MESSAGE]
          });
        }
        switch (request.body.tag) {
          case 'invalid':
            return respond(400, request.body.value);
          case 'valid':
            const organization = await createOrganization(connection, request.session.user.id, request.body.value);
            return respond(200, organization);
        }
      }
    };
  },

  update(connection) {
    return {
      async parseRequestBody(request) {
        const body = request.body.tag === 'json' ? request.body.value : {};
        return {
          legalName: getString(body, 'legalName') || undefined,
          logoImageFile: getString(body, 'logoImageFile') || undefined,
          websiteUrl: getString(body, 'websiteUrl') || undefined,
          streetAddress1: getString(body, 'streetAddress1') || undefined,
          streetAddress2: getString(body, 'streetAddress2') || undefined,
          city: getString(body, 'city') || undefined,
          region: getString(body, 'region') || undefined,
          mailCode: getString(body, 'mailCode') || undefined,
          country: getString(body, 'country') || undefined,
          contactName: getString(body, 'contactName') || undefined,
          contactTitle: getString(body, 'contactTitle') || undefined,
          contactEmail: getString(body, 'contactEmail') || undefined,
          contactPhone: getString(body, 'contactString') || undefined
        };
      },
      async validateRequestBody(request) {
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
        const validatedLegalName = optional(legalName, orgValidation.validateLegalName);
        const validatedLogoImageFile = await optionalAsync(logoImageFile, v => validateImageFile(connection, v));
        const validatedWebsiteUrl = orgValidation.validateWebsiteUrl(websiteUrl);
        const validatedStreetAddress1 = optional(streetAddress1, orgValidation.validateStreetAddress1);
        const validatedStreetAddress2 = orgValidation.validateStreetAddress2(streetAddress2);
        const validatedCity = optional(city, orgValidation.validateCity);
        const validatedRegion = optional(region, orgValidation.validateRegion);
        const validatedMailCode = optional(mailCode, orgValidation.validateMailCode);
        const validatedCountry = optional(country, orgValidation.validateCountry);
        const validatedContactName = optional(contactName, orgValidation.validateContactName);
        const validatedContactTitle = orgValidation.validateContactTitle(contactTitle);
        const validatedContactEmail = optional(contactEmail, orgValidation.validateContactEmail);
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
          return valid({
            id: (validatedOrganization.value as Organization).id,
            legalName: validatedLegalName.value,
            logoImageFile: isValid(validatedLogoImageFile) ? validatedLogoImageFile.value && validatedLogoImageFile.value.id : undefined,
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
      async respond(request) {
        const respond = (code: number, body: Organization | UpdateValidationErrors) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!await permissions.updateOrganization(connection, request.session, request.params.id)) {
          return respond(401, {
            permissions: [permissions.ERROR_MESSAGE]
          });
        }
        switch (request.body.tag) {
          case 'invalid':
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
      async validateRequestBody(request) {
        // Validate the provided id
        const validatedId = validateUUID(request.params.id);
        if (validatedId.tag === 'invalid') {
          return validatedId;
        }
        const organization = await readOneOrganization(connection, request.params.id);
        if (!organization) {
          return invalid(['Organization not found.']);
        }
        if (!organization.active) {
          return invalid(['Organization is already inactive.']);
        }
        return valid(organization);
      },
      async respond(request) {
        const respond = (code: number, body: Organization | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (request.body.tag === 'invalid') {
          return respond(404, request.body.value);
        }
        const id = request.body.value.id;
        if (!(await permissions.deleteOrganization(connection, request.session, request.params.id))) {
          return respond(401, [permissions.ERROR_MESSAGE]);
        }
        // Mark the organization as inactive
        const updatedOrganization = await updateOrganization(connection, {
          id,
          active: false,
          deactivatedOn: new Date(),
          deactivatedBy: request.session.user!.id
        });
        return respond(200, updatedOrganization);
      }
    };
  }
};

export default resource;
