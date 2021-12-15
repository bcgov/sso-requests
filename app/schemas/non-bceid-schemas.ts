import getRequesterInfoSchema from 'schemas/shared/requester-info';
import termsAndConditionsSchema from 'schemas/shared/terms-and-conditions';
import providersSchema from 'schemas/shared/providers';
import adminCommentSchema from 'schemas/admin-comment';

export const nonBceidSchemas = (hasTeam: boolean) => [
  getRequesterInfoSchema(hasTeam),
  providersSchema,
  termsAndConditionsSchema,
];
export const adminNonBceidSchemas = (hasTeam: boolean) => [
  getRequesterInfoSchema(hasTeam),
  providersSchema,
  adminCommentSchema,
];
