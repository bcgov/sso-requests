import { Request } from 'interfaces/Request';

export interface RequestReducerState {
  requests?: Request[];
  selectedRequest?: Request;
  loadingInstallation?: boolean;
  env?: 'dev' | 'test' | 'prod';
  installation?: object;
  editingRequest?: boolean;
  updatingUrls?: boolean;
}

type ActionTypes =
  | 'setRequests'
  | 'setRequest'
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
  if (action.type === 'setRequest') {
    console.log(action.payload);
    return { ...state, selectedRequest: action.payload };
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
    const { env, requests, selectedRequest: request } = state;
    let newRequest = { ...request };
    if (env === 'dev') newRequest['devRedirectUrls'] = urls;
    if (env === 'test') newRequest['testRedirectUrls'] = urls;
    if (env === 'prod') newRequest['prodRedirectUrls'] = urls;
    const newRequests = requests?.map((request) => {
      if (request.id === id) return newRequest;
      return request;
    });
    return { ...state, selectedRequest: newRequest, requests: newRequests };

    // const { id, urls } = action.payload;
    // const { env, requests } = state;
    // const request = state.requests?.find((request) => request.id === id);
    // let newRequest = request ? { ...request } : ({} as Request);
    // if (!newRequest.validRedirectUrls) newRequest.validRedirectUrls = { dev: [], test: [], prod: [] };
    // // @ts-ignore
    // newRequest.validRedirectUrls[env] = urls;
    // if (env && !newRequest.environments.includes(env)) newRequest.environments.push(env);
    // const newRequests = requests?.map((request) => (request.id === id ? newRequest : request));
    // return { ...state, requests: newRequests };
  }
  return state;
};

export default reducer;
