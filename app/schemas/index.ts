import isNil from 'lodash.isnil';
import { JSONSchema6 } from 'json-schema';
import getRequesterInfoSchema from '@app/schemas/requester-info';
import termsAndConditionsSchema from '@app/schemas/terms-and-conditions';
import getProvidersSchema from '@app/schemas/providers';
import getProvidersGoldSchema from '@app/schemas/providers-gold';
import getEnvironmentGoldSchemas from '@app/schemas/environment-gold';
import getReviewSubmitSchema from '@app/schemas/review-submit';
import { Team } from '@app/interfaces/team';
import { Integration } from '@app/interfaces/Request';
import getConfig from 'next/config';
const { publicRuntimeConfig = {} } = getConfig() || {};
const { enable_gold } = publicRuntimeConfig;

export interface Schema extends JSONSchema6 {
  customValidation?: string[];
  headerText: string;
  stepText: string;
}

export const getSchemas = ({
  integration,
  formData,
  teams = [],
  isAdmin = false,
}: {
  integration?: Integration | undefined;
  formData: Integration;
  teams: Team[];
  isAdmin?: boolean;
}) => {
  if (!integration) integration = formData;

  const isApplied = integration.status === 'applied';
  const isNew = isNil(integration.id);

  const environmentSchemas = getEnvironmentGoldSchemas(formData);
  const schemas = [];
  if (isNew) {
    if (enable_gold) {
      schemas.push(
        getRequesterInfoSchema(teams),
        getProvidersGoldSchema(formData, { isAdmin }),
        ...environmentSchemas,
        termsAndConditionsSchema,
      );
    } else {
      schemas.push(getRequesterInfoSchema(teams), getProvidersSchema(formData), termsAndConditionsSchema);
    }
  } else {
    if (integration.serviceType === 'gold') {
      schemas.push(getRequesterInfoSchema(teams), getProvidersGoldSchema(formData, { isAdmin }), ...environmentSchemas);
      if (!isApplied) schemas.push(termsAndConditionsSchema);
    } else {
      schemas.push(getRequesterInfoSchema(teams), getProvidersSchema(formData));
      if (!isApplied) schemas.push(termsAndConditionsSchema);
    }
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

export const samlDurationAdditionalFields = ['AssertionLifespan'];

export const samlFineGrainEndpointConfig = ['SamlLogoutPostBindingUri'];
