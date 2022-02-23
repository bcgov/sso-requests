export interface DashboardReducerState {
  panelTab?: string;
  downloadError?: boolean;
}

export type ActionTypes = 'setPanelTab' | 'setDownloadError';

export interface Action {
  type: ActionTypes;
  payload?: any;
}

export const initialState: DashboardReducerState = {};

const reducer = (state: DashboardReducerState, action: Action) => {
  switch (action.type) {
    case 'setPanelTab': {
      return { ...state, panelTab: action.payload };
    }
    case 'setDownloadError': {
      return { ...state, downloadError: action.payload };
    }
    default:
      return state;
  }
};

export default reducer;
