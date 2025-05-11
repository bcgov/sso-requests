export interface IntegrationEvent {
  id?: number;
  requestId: number;
  eventCode: string;
  idirUserid: string;
  details: string;
  idirUserDisplayName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IntegrationRole {
  id?: number;
  name: string;
  environment: string;
  requestId: number;
  composite?: boolean;
  compositeRoles?: number[];
  createdBy?: number;
  lastUpdatedBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
