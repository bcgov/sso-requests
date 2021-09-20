export interface Event {
  id?: number;
  requestId?: number;
  eventCode?: string;
  idirUserid?: string;
  idirUserDisplayName?: string;
  details?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface Change {
  kind: string;
  path: string[];
  lhs?: string;
  rhs?: string;
  item?: object;
}
