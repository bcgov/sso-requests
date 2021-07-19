import { Request } from 'interfaces/Request';
import type { Environment } from 'interfaces/Environment';

export interface RequestReducerState {
  requests?: Request[];
  selectedRequest?: Request;
  loadingInstallation?: boolean;
  env?: Environment;
  installation?: object;
  editingRequest?: boolean;
  updatingUrls?: boolean;
}

type ActionTypes = 'setRequests' | 'setRequest' | 'setEditingRequest' | 'setUpdatingUrls' | 'updateRequest';

interface Action {
  type: ActionTypes;
  payload?: any;
}

const reducer = (state: RequestReducerState, action: Action) => {
  switch (action.type) {
    case 'setRequests':
      return { ...state, requests: action.payload };
    case 'setRequest':
      return { ...state, selectedRequest: action.payload };
    case 'setEditingRequest':
      return { ...state, editingRequest: action.payload };
    case 'setUpdatingUrls':
      return { ...state, updatingUrls: action.payload };
    case 'updateRequest':
      const { id, urls } = action.payload;
      const { env, requests } = state;
      const request = state.requests?.find((request) => request.id === id);
      let newRequest = request ? { ...request } : ({} as Request);
      if (!newRequest.validRedirectUris) newRequest.validRedirectUris = { dev: [], test: [], prod: [] };
      // @ts-ignore
      newRequest.validRedirectUris[env] = urls;
      if (env && !newRequest.environments.includes(env)) newRequest.environments.push(env);
      const newRequests = requests?.map((request) => (request.id === id ? newRequest : request));

      return { ...state, requests: newRequests };
    default:
      return state;
  }
};

export default reducer;
