export interface Event {
  id?: number;
  requestId?: number;
  teamId?: number | null;
  organizationId?: number | null;
  workflowId?: string | null;
  eventCode?: string;
  idirUserid?: string;
  idirUserDisplayName?: string;
  actorType?: 'user' | 'service-account' | 'system';
  actorId?: string | null;
  details?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface Change {
  kind: string;
  path: string[];
  lhs?: string;
  rhs?: string;
  item?: any;
}
