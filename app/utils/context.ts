import React from 'react';
import { SessionContextInterface } from '@app/types/users';
import { UserSurveyInformation } from '@app/interfaces/team';

export const SessionContext = React.createContext<SessionContextInterface | null>(null);
export const SurveyContext = React.createContext<{
  setShowSurvey: (show: boolean, eventType: keyof UserSurveyInformation) => void;
} | null>(null);
