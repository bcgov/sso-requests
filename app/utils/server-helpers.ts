/**
 * Server-only counterparts to `utils/helpers.ts`. That file is also bundled into pages, so anything that reaches a
 * controller, the database or the logger belongs here instead.
 */
import { Integration, Division, BcgovUnit } from '@app/interfaces/Request';
import { usesBcServicesCard, usesOTP, usesBcgovIdir } from '@app/helpers/integration';
import { getSchemas } from '@app/schemas';
import { validateForm } from '@app/utils/validate';
import { getAttributes, getPrivacyZones } from '@app/controllers/bc-services-card';

let cachedClaims: any[] = [];

export const validateRequest = async (
  formData: any,
  original: Integration,
  teams: any[],
  bcgovUnits: BcgovUnit[],
  divisions: Division[],
  isUpdate = false,
) => {
  const validationArgs: any = { formData, teams };

  if (usesBcServicesCard(formData) || usesOTP(formData)) {
    const validPrivacyZones = await getPrivacyZones();
    validationArgs.bcscPrivacyZones = validPrivacyZones;
  }

  if (usesBcServicesCard(formData)) {
    const validAttributes = await getAttributes();
    validationArgs.bcscAttributes = validAttributes;
  }

  if (usesBcgovIdir(formData)) {
    validationArgs.bcgovUnits = bcgovUnits;

    validationArgs.divisions = divisions;
  }

  const schemas = getSchemas(validationArgs);
  return validateForm(formData, schemas);
};

export const getRequiredBCSCScopes = async (claims: string[]) => {
  if (cachedClaims.length === 0) {
    cachedClaims = await getAttributes();
  }
  const allClaims = cachedClaims;
  const requiredScopes = allClaims.filter((claim) => claims.includes(claim.name)).map((claim) => claim.scope);

  // Profile will always be a required scope since the sub depends on it
  if (!requiredScopes.includes('profile')) {
    requiredScopes.push('profile');
  }
  return ['openid', ...Array.from(new Set(requiredScopes))];
};
