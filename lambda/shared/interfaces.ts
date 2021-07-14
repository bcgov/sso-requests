interface Urls {
  url: string;
}

export interface Session {
  idir_userid: string;
}

export interface Environments {
  dev?: boolean;
  test?: boolean;
  prod?: boolean;
  devRedirectUrls?: Urls[];
  testRedirectUrls?: Urls[];
  prodRedirectUrls?: Urls[];
}

export interface Data {
  identityProviders?: {
    github: boolean;
    idir: boolean;
  };
  environments?: Environments;
  projectName: string;
  preferredEmail: string;
  newToSSO: boolean;
  projectLead: boolean;
}

export interface FormattedData {
  identityProviders: string[];
  environments: string[];
  projectName: string;
  validRedirectUrls: {
    dev: string[];
    test: string[];
    prod: string[];
  };
  id?: number;
  projectLead: boolean;
  preferredEmail: string;
  newToSSO: boolean;
}
