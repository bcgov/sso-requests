export interface Event {
  id?: number;
  requestId?: number;
  eventCode?: string;
  idirUserid?: string;
  idirUserDisplayName?: string;
  // Organization events have no request to hang from.
  organizationId?: number;
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
