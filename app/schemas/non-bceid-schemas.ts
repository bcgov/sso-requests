import getRequesterInfoSchema from 'schemas/shared/requester-info';
import termsAndConditionsSchema from 'schemas/shared/terms-and-conditions';
import providersSchema from 'schemas/shared/providers';
import adminCommentSchema from 'schemas/admin-comment';
import { Team } from 'interfaces/team';

export const nonBceidSchemas = (teams: Team[]) => [
  getRequesterInfoSchema(teams),
  providersSchema,
  termsAndConditionsSchema,
];
export const appliedNonBceidSchemas = (teams: Team[]) => [
  getRequesterInfoSchema(teams),
  providersSchema,
  adminCommentSchema,
];
