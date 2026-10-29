import { LogsService } from '@/services/logs-service';
import { queryGrafana } from '@/modules/grafana';
import { createEvent } from '@/utils';

jest.mock('@/modules/grafana', () => ({
  queryGrafana: jest.fn(() => Promise.resolve(['{"log": "log"}'])),
}));

jest.mock('@/utils', () => ({
  createEvent: jest.fn(() => Promise.resolve()),
}));

const DAY = 24 * 60 * 60 * 1000;

describe('LogsService', () => {
  const service = new LogsService();

  beforeAll(() => {
    process.env.TRINO_RETENTION_SCHEMA = 'retention.schema';
    process.env.TRINO_LIVE_SCHEMA = 'live.schema';
  });

  beforeEach(() => jest.clearAllMocks());

  const fetchRange = (startMs: number, endMs: number, clientId = 'my-client-1') =>
    service.fetchLogs('dev', clientId, '1', new Date(startMs).toISOString(), new Date(endMs).toISOString());

  const lastQuery = () => (queryGrafana as jest.Mock).mock.calls[0][0] as string;

  it('queries only the retention schema for ranges older than the cutoff', async () => {
    const response = await fetchRange(Date.now() - 3 * DAY, Date.now() - 2 * DAY);
    expect(response.status).toBe(200);
    expect(response.data).toEqual([{ log: 'log' }]);
    expect(lastQuery()).toContain('FROM retention.schema');
    expect(lastQuery()).not.toContain('live.schema');
  });

  it('queries only the live schema for recent ranges', async () => {
    await fetchRange(Date.now() - 60 * 60 * 1000, Date.now());
    expect(lastQuery()).toContain('FROM live.schema');
    expect(lastQuery()).not.toContain('retention.schema');
  });

  it('unions both schemas when the range crosses the cutoff', async () => {
    await fetchRange(Date.now() - 2 * DAY, Date.now());
    expect(lastQuery()).toContain('FROM retention.schema');
    expect(lastQuery()).toContain('FROM live.schema');
    expect(lastQuery()).toContain('UNION ALL');
  });

  it('returns 400 when the integration has no client id', async () => {
    const response = await fetchRange(Date.now() - DAY, Date.now(), null);
    expect(response.status).toBe(400);
    expect(queryGrafana).not.toHaveBeenCalled();
  });

  it('returns 500 and records a failure event when the query fails', async () => {
    (queryGrafana as jest.Mock).mockImplementationOnce(() => Promise.reject(new Error('err')));
    const response = await fetchRange(Date.now() - DAY, Date.now());
    expect(response.status).toBe(500);
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({ eventCode: 'logs-download-failure' }));
  });
});
