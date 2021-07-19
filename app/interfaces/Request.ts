export interface ServerRequest {
  agreeWithTerms?: boolean;
  id?: number;
  idirUserid?: string;
  projectName?: string;
  realm?: string;
  validRedirectUrls?: {
    dev?: string[];
    test?: string[];
    prod?: string[];
  };
  prNumber?: number;
  environments?: string[];
  newToSso?: boolean;
  createdAt?: string;
  updatedAt?: string;
  status?: 'draft' | 'pending' | 'submitted' | 'approved' | 'completed';
}

export interface ClientRequest {
  realm?: string;
  devRedirectUrls?: string[];
  testRedirectUrls?: string[];
  prodRedirectUrls?: string[];
  projectName?: string;
  preferredEmail?: string;
  projectLead?: boolean;
  id?: number;
  newToSso?: boolean;
  status?: 'draft' | 'pending' | 'submitted' | 'approved' | 'completed';
  agreeWithTerms?: boolean;
  prNumber?: number;
  environments?: string[];
  createdAt?: string;
}
