import { isNil } from 'lodash';
import getRequesterInfoSchema from '@app/schemas/requester-info';
import termsAndConditionsSchema from '@app/schemas/terms-and-conditions';
import getProvidersGoldSchema from '@app/schemas/providers-gold';
import getEnvironmentGoldSchemas from '@app/schemas/environment-gold';
import getSdxServicesSchema from '@app/schemas/sdx-services';
import getReviewSubmitSchema from '@app/schemas/review-submit';
import { LoggedInUser, Team } from '@app/interfaces/team';
import { Integration, BcgovUnit, Division } from '@app/interfaces/Request';
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
  session,
  teams = [],
  bcscPrivacyZones = [],
  bcscAttributes = [],
  bcgovUnits = [],
  divisions = [],
}: {
  integration?: Integration | undefined;
  formData: Integration;
  session: LoggedInUser | null;
  teams: Team[];
  bcscPrivacyZones?: BcscPrivacyZone[];
  bcscAttributes?: BcscAttribute[];
  bcgovUnits?: BcgovUnit[];
  divisions?: Division[];
}) => {
  if (!integration) integration = formData;

  const isApplied = integration.status === 'applied';
  const isNew = isNil(integration.id);

  const environmentSchemas = getEnvironmentGoldSchemas(formData, session);
  const schemas = [];
  if (isNew) {
    schemas.push(
      getRequesterInfoSchema(teams, formData),
      getProvidersGoldSchema(formData, session, bcscPrivacyZones, bcscAttributes, bcgovUnits, divisions),
      ...environmentSchemas,
      termsAndConditionsSchema,
    );
  } else {
    schemas.push(
      getRequesterInfoSchema(teams, formData),
      getProvidersGoldSchema(formData, session, bcscPrivacyZones, bcscAttributes, bcgovUnits, divisions),
      ...environmentSchemas,
    );

    if (formData.devIdps?.includes('bcservicescard') && formData.sdxEnabled) {
      schemas.push(getSdxServicesSchema());
    }

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

export const samlDurationAdditionalFields = ['AssertionLifespan'];

export const samlFineGrainEndpointConfig = ['SamlLogoutPostBindingUri'];

export const samlSignedAssertions = ['SamlSignAssertions'];
