import { instance } from './axios';
import { Event } from 'interfaces/Event';

interface EventSearchCriteria {
  requestId: number;
  eventCode: string;
  order?: any;
  limit?: number;
  page?: number;
  clearNotifications?: boolean;
}

interface EventsResult {
  count: number;
  rows: Event[];
}

export const getEvents = async (criteria: EventSearchCriteria): Promise<[EventsResult, null] | [null, any]> => {
  try {
    const result: EventsResult = await instance.post('events', criteria).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    console.error(err);
    return [null, err];
  }
};
