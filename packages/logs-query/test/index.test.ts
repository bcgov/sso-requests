import { buildLogsQuery, getLiveSchemaBoundary, getLogSourceRanges } from '../src';

const HOUR = 60 * 60 * 1000;
const now = Date.parse('2026-10-20T14:30:00.000Z');
const boundary = Date.parse('2026-10-19T14:00:00.000Z');
const schemas = { retention: 'retention.schema', live: 'live.schema' };

describe('getLiveSchemaBoundary', () => {
  it('floors the cutoff to the hour', () => {
    expect(getLiveSchemaBoundary(now)).toBe(boundary);
  });
});

describe('getLogSourceRanges', () => {
  it('uses the retention schema only for ranges older than the cutoff', () => {
    expect(getLogSourceRanges(boundary - 10 * HOUR, boundary - HOUR, now, schemas)).toEqual([
      { table: 'retention.schema', from: boundary - 10 * HOUR, to: boundary - HOUR, inclusiveEnd: true },
    ]);
  });

  it('uses the live schema only for ranges after the cutoff', () => {
    expect(getLogSourceRanges(boundary, now, now, schemas)).toEqual([
      { table: 'live.schema', from: boundary, to: now, inclusiveEnd: true },
    ]);
  });

  it('splits ranges crossing the cutoff without overlap', () => {
    expect(getLogSourceRanges(boundary - HOUR, now, now, schemas)).toEqual([
      { table: 'retention.schema', from: boundary - HOUR, to: boundary, inclusiveEnd: false },
      { table: 'live.schema', from: boundary, to: now, inclusiveEnd: true },
    ]);
  });
});

describe('buildLogsQuery', () => {
  it('unions both schemas with half-open bounds at the boundary', () => {
    const sql = buildLogsQuery('dev', getLogSourceRanges(boundary - HOUR, now, now, schemas), 'my-client-1');
    expect(sql).toContain("timestamp < from_iso8601_timestamp('2026-10-19T14:00:00.000Z')");
    expect(sql).toContain("timestamp >= from_iso8601_timestamp('2026-10-19T14:00:00.000Z')");
    expect(sql).toContain('UNION ALL');
    expect(sql).toContain("= 'e4ca1d-dev'");
  });

  it('uses the production namespace only in production', () => {
    const ranges = getLogSourceRanges(boundary, now, now, schemas);
    expect(buildLogsQuery('prod', ranges, 'my-client-1', 'production')).toContain("= 'eb75ad-prod'");
    expect(buildLogsQuery('prod', ranges, 'my-client-1', 'development')).toContain("= 'e4ca1d-prod'");
  });

  it('escapes LIKE wildcards and quotes in the client id', () => {
    const sql = buildLogsQuery('dev', getLogSourceRanges(boundary, now, now, schemas), "a_b%c'd");
    expect(sql).toContain("LIKE '%clientId=a\\_b\\%c''d,%' ESCAPE '\\'");
  });
});
