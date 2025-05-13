import isNil from 'lodash.isnil';
import getRequesterInfoSchema from '@app/schemas/requester-info';
import termsAndConditionsSchema from '@app/schemas/terms-and-conditions';
import getProvidersGoldSchema from '@app/schemas/providers-gold';
import getEnvironmentGoldSchemas from '@app/schemas/environment-gold';
import getReviewSubmitSchema from '@app/schemas/review-submit';
import { Team } from '@app/interfaces/team';
import { Integration } from '@app/interfaces/Request';
import { BcscAttribute, BcscPrivacyZone } from '@app/interfaces/types';
import { RJSFSchema } from '@rjsf/utils';

export interface Schema extends RJSFSchema {
  customValidation?: string[];
  headerText: string;
  stepText: string;
}

export const getSchemas = ({
  integration,
  formData,
  teams = [],
  isAdmin = false,
  bcscPrivacyZones = [],
  bcscAttributes = [],
}: {
  integration?: Integration | undefined;
  formData: Integration;
  teams: Team[];
  isAdmin?: boolean;
  bcscPrivacyZones?: BcscPrivacyZone[];
  bcscAttributes?: BcscAttribute[];
}) => {
  console.log('here');

  if (!integration) integration = formData;

  const isApplied = integration.status === 'applied';
  const isNew = isNil(integration.id);

  const environmentSchemas = getEnvironmentGoldSchemas(formData);
  const schemas = [];
  if (isNew) {
    schemas.push(
      getRequesterInfoSchema(teams, formData),
      getProvidersGoldSchema(formData, { isAdmin }, bcscPrivacyZones, bcscAttributes),
      ...environmentSchemas,
      termsAndConditionsSchema,
    );
  } else {
    schemas.push(
      getRequesterInfoSchema(teams, formData),
      getProvidersGoldSchema(formData, { isAdmin }, bcscPrivacyZones, bcscAttributes),
      ...environmentSchemas,
    );
    if (!isApplied) schemas.push(termsAndConditionsSchema);
  }

  schemas.push(getReviewSubmitSchema());

  return schemas;
};

export const oidcDurationAdditionalFields = [
  'AccessTokenLifespan',
  'OfflineSessionIdleTimeout',
  'OfflineSessionMaxLifespan',
  'SessionIdleTimeout',
  'SessionMaxLifespan',
];

export const test = 'sadasdfasd';

export const samlDurationAdditionalFields = ['AssertionLifespan'];

export const samlFineGrainEndpointConfig = ['SamlLogoutPostBindingUri'];

export const samlSignedAssertions = ['SamlSignAssertions'];
