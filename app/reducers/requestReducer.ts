import { Request } from 'interfaces/Request';

export interface RequestReducerState {
  requests?: Request[];
  loadingInstallation?: boolean;
  installation?: object;
  editingRequest?: boolean;
}

export type ActionTypes = 'setRequests' | 'setEditingRequest' | 'updateRequest' | 'deleteRequest';

export interface Action {
  type: ActionTypes;
  payload?: any;
}

const reducer = (state: RequestReducerState, action: Action) => {
  switch (action.type) {
    case 'setRequests':
      return { ...state, requests: action.payload };
    case 'setEditingRequest':
      return { ...state, editingRequest: action.payload };
    case 'updateRequest': {
      const { requests } = state;
      const newRequests = requests?.map((request) => {
        if (request.id === action.payload.id) return action.payload;
        return request;
      });
      return { ...state, requests: newRequests };
    }
    case 'deleteRequest': {
      const { requests } = state;
      const newRequests = requests?.filter((request) => request.id !== action.payload);
      return { ...state, requests: newRequests };
    }
    default:
      return state;
  }
};

export default reducer;
