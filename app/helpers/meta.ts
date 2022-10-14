export const idpMap: any = {
  idir: 'IDIR',
  azureidir: 'Azure IDIR',
  bceidbasic: 'Basic BCeID',
  bceidbusiness: 'Business BCeID',
  bceidboth: 'Basic or Business BCeID',
  github: 'GitHub BC Gov',
  githuball: 'GitHub',
};

export const envMap: any = {
  dev: 'Development',
  test: 'Test',
  prod: 'Production',
};

export const silverRealmIdpsMap: { [key: string]: string[] } = {
  onestopauth: ['idir'],
  'onestopauth-basic': ['idir', 'bceidbasic'],
  'onestopauth-business': ['idir', 'bceidbusiness'],
  'onestopauth-both': ['idir', 'bceidboth'],
};
