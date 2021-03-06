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

export type DisplayStatus = 'In Draft' | 'Completed' | 'Submitted';

export type Environment = 'dev' | 'test' | 'prod';
