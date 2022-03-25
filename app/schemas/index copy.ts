import { isNil } from 'lodash';
import getRequesterInfoSchema from '@app/schemas/requester-info';
import termsAndConditionsSchema from '@app/schemas/terms-and-conditions';
import getProvidersSchema from '@app/schemas/providers';
import getProvidersGoldSchema from '@app/schemas/providers-gold';
import getEnvironmentGoldSchemas from '@app/schemas/environment-gold';
import getSilverUISchema from '@app/schemas/ui';
import getGoldUISchema from '@app/schemas/ui-gold';
import { Team } from '@app/interfaces/team';
import { Request, Option } from '@app/interfaces/Request';
import getConfig from 'next/config';
const { publicRuntimeConfig = {} } = getConfig() || {};
const { enable_gold } = publicRuntimeConfig;

export const getSchemas = ({
  integration,
  formData,
  teams = [],
}: {
  integration?: Request | undefined;
  formData: Request;
  teams: Team[];
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
        getProvidersGoldSchema(formData),
        ...environmentSchemas,
        termsAndConditionsSchema,
      );
    } else {
      schemas.push(getRequesterInfoSchema(teams), getProvidersSchema(formData), termsAndConditionsSchema);
    }
  } else {
    if (integration.serviceType === 'gold') {
      schemas.push(getRequesterInfoSchema(teams), getProvidersGoldSchema(formData), ...environmentSchemas);
      if (!isApplied) schemas.push(termsAndConditionsSchema);
    } else {
      schemas.push(getRequesterInfoSchema(teams), getProvidersSchema(formData));
      if (!isApplied) schemas.push(termsAndConditionsSchema);
    }
  }

  return schemas;
};

export const getUISchema = (integration: Request) => {
  const isNew = isNil(integration?.id);

  if (isNew) {
    if (enable_gold) {
      return getGoldUISchema(integration as Request);
    } else {
      return getSilverUISchema(integration as Request);
    }
  } else {
    if (integration?.serviceType === 'gold') {
      return getGoldUISchema(integration as Request);
    } else {
      return getSilverUISchema(integration as Request);
    }
  }
};
