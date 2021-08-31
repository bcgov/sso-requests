import requesterInfoSchema from 'schemas/shared/requester-info';
import termsAndConditionsSchema from 'schemas/shared/terms-and-conditions';
import providersSchema from 'schemas/shared/providers';

export const nonBceidSchemas = [requesterInfoSchema, providersSchema, termsAndConditionsSchema];
export const adminNonBceidSchemas = [requesterInfoSchema, providersSchema];
