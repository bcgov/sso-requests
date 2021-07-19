import { Request } from 'interfaces/Request';

const requests: Request[] = [
  {
    id: 1,
    idirUserid: 'ABCDEFG',
    projectName: 'My First Project',
    realm: 'test-client',
    validRedirectUris: {
      dev: ['http://localhost:3000'],
    },
    prNumber: 12345,
    environments: ['dev'],
    prSuccess: false,
    planSuccess: false,
    applySuccess: false,
    prCreatedAt: '2021-07-14T17:54:16.292Z',
    planRuntime: '2021-07-14T17:54:16.292Z',
    applyRuntime: '2021-07-14T17:54:16.292Z',
    createdAt: '2021-07-14T17:54:16.292Z',
    updatedAt: '2021-07-14T17:54:16.292Z',
  },
];

export default requests;
