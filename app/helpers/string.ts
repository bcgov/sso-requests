import trim from 'lodash.trim';
import toLower from 'lodash.tolower';

export const lowcase = (str: string) => toLower(trim(str));
