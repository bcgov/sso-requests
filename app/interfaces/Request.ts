export interface Request {
  id: number;
  idirUserid: string;
  projectName: string;
  identityProviders: string[];
  validRedirectUrls: string[];
  prNumber: number;
  environments: string[];
  prSuccess: string;
  planSuccess: string;
  applySuccess: string;
  prCreatedAt: string;
  planRuntime: string;
  applyRuntime: string;
  createdAt: string;
  updatedAt: string;
}
