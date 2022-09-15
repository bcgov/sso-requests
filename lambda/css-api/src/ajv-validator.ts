import ajv from 'ajv';
import ajvErrors from 'ajv-errors';

const validator = new ajv({ allErrors: true });

ajvErrors(validator);

export default validator;
