import { isNil } from 'lodash';
import getGoldUISchema from '@app/schemas-ui/ui-gold';
import { BcgovUnit, Integration } from '@app/interfaces/Request';
import { LoggedInUser, Team } from '@app/interfaces/team';
import { Division } from '@app/interfaces/Request';
import { GetStandardSettingsResponse } from '@app/interfaces/api';

interface Props {
  integration: Integration;
  formData?: Integration;
  session: LoggedInUser | null;
  teams: Team[];
  schemas: any;
  defaultSessionSettings: GetStandardSettingsResponse;
  bcscExcluded: boolean;
  bcgovUnits: BcgovUnit[];
  divisions: Division[];
}

export const getUISchema = (props: Props) => {
  const { integration } = props;
  const isNew = isNil(integration?.id);

  if (!props.formData) props.formData = integration;

  return getGoldUISchema(props);
};
