import isNil from 'lodash.isnil';
import getGoldUISchema from '@app/schemas-ui/ui-gold';
import { Integration } from '@app/interfaces/Request';
import { Team } from '@app/interfaces/team';

interface Props {
  integration: Integration;
  formData?: Integration;
  isAdmin: boolean;
  teams: Team[];
  schemas: any;
}

export const getUISchema = (props: Props) => {
  const { integration } = props;
  const isNew = isNil(integration?.id);

  if (!props.formData) props.formData = integration;

  return getGoldUISchema(props);
};
