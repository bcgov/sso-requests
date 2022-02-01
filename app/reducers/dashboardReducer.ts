import { Request } from 'interfaces/Request';
import { Team } from 'interfaces/team';

export interface DashboardReducerState {
  requests?: Request[];
  loadingInstallation?: boolean;
  installation?: object;
  teams?: Team[];
  activeRequestId?: number;
  activeTeamId?: number;
  tableTab?: string;
  panelTab?: string;
  downloadError?: boolean;
  requestIdToDelete?: number;
  teamIdToDelete?: number;
  teamIdToEdit?: number;
}

export type ActionTypes =
  | 'setRequests'
  | 'updateRequest'
  | 'deleteRequest'
  | 'setTeams'
  | 'updateTeam'
  | 'setTableTab'
  | 'setPanelTab'
  | 'setActiveRequestId'
  | 'setActiveTeamId'
  | 'setDownloadError'
  | 'setRequestIdToDelete'
  | 'setTeamIdToDelete'
  | 'setTeamIdToEdit';

export interface Action {
  type: ActionTypes;
  payload?: any;
}

export const initialState: DashboardReducerState = {
  tableTab: 'activeProjects',
};

const reducer = (state: DashboardReducerState, action: Action) => {
  switch (action.type) {
    case 'setRequests':
      return { ...state, requests: action.payload };
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
    case 'setTeams': {
      return { ...state, teams: action.payload };
    }
    case 'setTableTab': {
      return { ...state, tableTab: action.payload };
    }
    case 'setPanelTab': {
      return { ...state, panelTab: action.payload };
    }
    case 'setActiveRequestId': {
      return { ...state, activeRequestId: action.payload, activeTeamId: undefined };
    }
    case 'setActiveTeamId': {
      // console.log(`the active team id is triggered with action.payload: ${action.payload}`)
      //TODO Is this already usede for determining the team being worked on?
      return { ...state, activeTeamId: action.payload, activeRequestId: undefined };
    }
    case 'setRequestIdToDelete': {
      return { ...state, requestIdToDelete: action.payload };
    }
    case 'setTeamIdToDelete': {
      return { ...state, teamIdToDelete: action.payload };
    }
    // TODO FIX THIS TO SEND THE CORRECT PAYLOAD
    case 'setTeamIdToEdit': {
      // console.log(`the teamIDToEdit is triggered with action.payload: ${action.payload}`)
      return { ...state, teamIdToEdit: action.payload };
    }
    default:
      return state;
  }
};

export default reducer;
