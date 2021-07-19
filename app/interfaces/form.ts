export interface Data {
  realm: string;
  devRedirectUrls: string[];
  testRedirectUrls: string[];
  prodRedirectUrls: string[];
  projectName: string;
  preferredEmail: string;
  projectLead?: boolean;
  id?: number;
  newToSso?: boolean;
  status?: string;
  publicAccess?: boolean;
}
