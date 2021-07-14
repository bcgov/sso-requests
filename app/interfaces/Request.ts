export interface Request {
  id: number;
  idirUserid: string;
  projectName: string;
  realm: string;
  identityProviders?: string[];
  validRedirectUrls: string[];
  prNumber: number;
  environments: string[];
  prSuccess: boolean;
  planSuccess: boolean;
  applySuccess: boolean;
  prCreatedAt: string;
  planRuntime: string;
  applyRuntime: string;
  createdAt: string;
  updatedAt: string;
}
