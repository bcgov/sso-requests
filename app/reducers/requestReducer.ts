import { Request } from 'interfaces/Request';

export interface RequestReducerState {
  requests?: Request[];
  loadingInstallation?: boolean;
  env?: 'dev' | 'test' | 'prod';
  installation?: object;
  requestId?: number;
  editingRequest?: boolean;
  updatingUrls?: boolean;
}

type ActionTypes =
  | 'setRequests'
  | 'setRequestId'
  | 'loadInstallation'
  | 'setInstallation'
  | 'setEditingRequest'
  | 'setEnvironment'
  | 'setUpdatingUrls';

interface Action {
  type: ActionTypes;
  payload?: any;
}

const reducer = (state: RequestReducerState, action: Action) => {
  if (action.type === 'setRequests') {
    return { ...state, requests: action.payload };
  }
  if (action.type === 'setRequestId') {
    return { ...state, requestId: action.payload };
  }
  if (action.type === 'loadInstallation') {
    return { ...state, loadingInstallation: true, installation: null };
  }
  if (action.type === 'setInstallation') {
    return { ...state, loadingInstallation: false, installation: action.payload };
  }
  if (action.type === 'setEditingRequest') {
    return { ...state, editingRequest: action.payload };
  }
  if (action.type === 'setEnvironment') {
    return { ...state, env: action.payload };
  }
  if (action.type === 'setUpdatingUrls') {
    return { ...state, updatingUrls: action.payload };
  }
  if (action.type === 'updateRequest') {
    const { id, urls } = action.payload;
    const { env, requests } = state;
    const request = state.requests?.find((request) => request.id === id);
    let newRequest = request ? { ...request } : ({} as Request);
    if (!newRequest.validRedirectUrls) newRequest.validRedirectUrls = { dev: [], test: [], prod: [] };
    // @ts-ignore
    newRequest.validRedirectUrls[env] = urls;
    if (env && !newRequest.environments.includes(env)) newRequest.environments.push(env);
    const newRequests = requests?.map((request) => (request.id === id ? newRequest : request));
    return { ...state, requests: newRequests };
  }
  return state;
};

export default reducer;
