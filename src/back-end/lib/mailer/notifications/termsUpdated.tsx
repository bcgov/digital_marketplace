import * as db from 'back-end/lib/db';
import * as templates from 'back-end/lib/mailer/templates';
import { makeSend } from 'back-end/lib/mailer/transport';
import React from 'react';
import { User, UserType } from 'shared/lib/resources/user';
import { getValidValue } from 'shared/lib/validation';

export async function handleTermsUpdated(connection: db.Connection): Promise<void> {
  const activeVendors = getValidValue(await db.readManyUsersByRole(connection, UserType.Vendor, false), null);
  if (activeVendors) {
    for (const vendor of activeVendors) {
      await vendorTermsChanged(vendor);
    }
  }
}

export const vendorTermsChanged = makeSend(vendorTermsChangedT);

export async function vendorTermsChangedT(recipient: User) {
  const title = 'Our Terms and Conditions Have Been Updated';
  const description = 'The Digital Marketplace Terms & Conditions for vendors have been updated.';
  return [{
    summary: 'Vendor Terms & Conditions are updated; notify active vendors to re-accept',
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      body: (
        <div>
          <p>The updated Terms & Conditions must be reviewed and accepted prior to submitting proposal for Code-With-Us and Sprint-With-Us opportunities.</p>
        </div>
      ),
      callsToAction: [viewTermsAndConditionsCallToAction(recipient)]
    })
  }];
}

export function viewTermsAndConditionsCallToAction(vendor: User): templates.LinkProps {
  return {
    text: 'Review Terms & Conditions',
    url: templates.makeUrl(`/users/${vendor.id}?tab=legal`)
  };
}
