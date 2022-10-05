export interface DashboardReducerState {
  downloadError?: boolean;
}

export type ActionTypes = 'setDownloadError';

export interface Action {
  type: ActionTypes;
  payload?: any;
}

export const initialState: DashboardReducerState = {};

const reducer = (state: DashboardReducerState, action: Action) => {
  switch (action.type) {
    case 'setDownloadError': {
      return { ...state, downloadError: action.payload };
    }
    default:
      return state;
  }
};

export default reducer;
