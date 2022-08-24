import { isNil } from 'lodash';
import getSilverUISchema from '@app/schemas-ui/ui';
import getGoldUISchema from '@app/schemas-ui/ui-gold';
import { Integration, Option } from '@app/interfaces/Request';
import getConfig from 'next/config';
const { publicRuntimeConfig = {} } = getConfig() || {};
const { enable_gold } = publicRuntimeConfig;

interface Props {
  integration: Integration;
  formData?: Integration;
  isAdmin: boolean;
}

export const getUISchema = (props: Props) => {
  const { integration } = props;
  const isNew = isNil(integration?.id);

  if (!props.formData) props.formData = integration;

  if (isNew) {
    if (enable_gold) {
      return getGoldUISchema(props);
    } else {
      return getSilverUISchema(props);
    }
  } else {
    if (integration?.serviceType === 'gold') {
      return getGoldUISchema(props);
    } else {
      return getSilverUISchema(props);
    }
  }
};
