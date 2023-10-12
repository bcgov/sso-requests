import { UserSurveyInformation } from './team';

export interface SurveyData {
  message: string;
  rating: number;
  triggerEvent: keyof UserSurveyInformation;
}
