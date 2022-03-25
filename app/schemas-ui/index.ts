import { isNil } from 'lodash';
import getSilverUISchema from '@app/schemas-ui/ui';
import getGoldUISchema from '@app/schemas-ui/ui-gold';
import { Request, Option } from '@app/interfaces/Request';
import getConfig from 'next/config';
const { publicRuntimeConfig = {} } = getConfig() || {};
const { enable_gold } = publicRuntimeConfig;

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
