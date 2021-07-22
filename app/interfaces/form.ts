export interface ClientRequest {
  realm: string;
  devRedirectUrls: string[];
  testRedirectUrls: string[];
  prodRedirectUrls: string[];
  projectName: string;
  preferredEmail?: string;
  projectLead?: boolean;
  id?: number;
  newToSso?: boolean;
  status?: string;
  agreeWithTerms?: boolean;
  prNumber?: number;
  environments?: string[];
  createdAt?: string;
  publicAccess?: boolean;
}

export interface FormErrors {
  firstPageErrors?: object[];
  secondPageErrors?: object[];
  thirdPageErrors?: object[];
  fourthPageErrors?: object[];
}
