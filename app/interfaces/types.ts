export type Status =
  | 'draft'
  | 'submitted'
  | 'pr'
  | 'prFailed'
  | 'planned'
  | 'planFailed'
  | 'approved'
  | 'applied'
  | 'applyFailed';

export type DisplayStatus = 'In Draft' | 'Active Project' | 'Request Submitted';

export type Environment = 'dev' | 'test' | 'prod';
