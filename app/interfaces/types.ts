export type Status = 'draft' | 'submitted' | 'pr' | 'prFailed' | 'planned' | 'planFailed' | 'applied' | 'applyFailed';

export type DisplayStatus = 'In Draft' | 'Completed' | 'Submitted';

export type Environment = 'dev' | 'test' | 'prod';

export type BcscPrivacyZone = {
  privacy_zone_uri: string;
  privacy_zone_name: string;
};

export type BcscAttribute = {
  name: string;
  user_friendly_name: string;
  user_friendly_description: string;
  data_type: string;
  scope: string;
};
