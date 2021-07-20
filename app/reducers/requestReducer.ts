import { ClientRequest } from 'interfaces/Request';
import type { Environment } from 'interfaces/types';

export interface RequestReducerState {
  requests?: ClientRequest[];
  selectedRequest?: ClientRequest;
  loadingInstallation?: boolean;
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
      const { id, ...rest } = action.payload;
      const { requests, selectedRequest: request } = state;
      let newRequest = { ...request, ...rest };
      const newRequests = requests?.map((request) => {
        if (request.id === id) return newRequest;
        return request;
      });
      return { ...state, requests: newRequests, selectedRequest: newRequest };
    default:
      return state;
  }
};

export default reducer;
