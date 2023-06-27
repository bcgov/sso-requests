import isNil from 'lodash.isnil';
import getGoldUISchema from '@app/schemas-ui/ui-gold';
import { Integration } from '@app/interfaces/Request';

interface Props {
  integration: Integration;
  formData?: Integration;
  isAdmin: boolean;
}

export const getUISchema = (props: Props) => {
  const { integration } = props;
  const isNew = isNil(integration?.id);

  if (!props.formData) props.formData = integration;

  return getGoldUISchema(props);
};
