import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { Integration } from 'interfaces/Request';
import { withTopAlert } from 'layout/TopAlert';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Tabs, Tab } from '@bcgov-sso/common-react-components';
import startCase from 'lodash.startcase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Text, Legend } from 'recharts';
import { getMetrics } from '@app/services/grafana';
import throttle from 'lodash.throttle';
import moment from 'moment';
import DateTimePicker from '@app/components/DateTimePicker';
import { InfoMessage } from '@app/components/MessageBox';
import { Link } from '@button-inc/bcgov-theme';

export const DatePickerContainer = styled.div`
  height: 100%;
  display: flex;
  align-items: center;
  padding-right: 15px;
  & > * {
    margin-left: 15px;
  }
`;

const Label = styled.label`
  margin-bottom: 2px;
`;

const TopMargin = styled.div`
  height: var(--field-top-spacing);
`;

const LeftTitle = styled.span`
  color: #000;
  font-size: 1.1rem;
  font-weight: bold;
`;

const PaddedIcon = styled(FontAwesomeIcon)`
  margin-right: 20px;
`;

const StyledP = styled.div`
  margin-bottom: 5px;
  display: flex;
  align-items: center;
`;

const StyledHr = styled.hr`
  background-color: black;
`;

interface Props {
  integration: Integration;
}

const metricsStartDate = 'December 01, 2023';
const MetricsPanel = ({ integration }: Props) => {
  const [environment, setEnvironment] = useState('dev');
  const environments = integration?.environments || [];
  const [metrics, setMetrics] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState<string>(moment().subtract(14, 'days').format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState<string>(moment().format('YYYY-MM-DD'));
  const handleTabSelect = (key: any) => {
    setEnvironment(key);
  };

  const getFormattedDate = (val: Date) => {
    return moment.utc(val).format('YYYY-MM-DD');
  };

  const handleFromDateChange = (val: Date) => {
    setFromDate(getFormattedDate(val));
  };

  const handleToDateChange = (val: Date) => {
    setToDate(getFormattedDate(val));
  };

  const fetchMetrics = useCallback(
    throttle(async (environment: string) => {
      const [metricsData, err] = await getMetrics(integration?.id as number, environment, fromDate, toDate);

      if (err || metricsData.length === 0) {
        setMetrics([]);
      } else {
        setMetrics(metricsData);
      }
    }),
    [integration?.clientId, environment, fromDate, toDate],
  );

  useEffect(() => {
    fetchMetrics(environment);
  }, [integration?.clientId, environment, fromDate, toDate]);

  return (
    <>
      <TopMargin />

      <div>
        <DatePickerContainer>
          <DateTimePicker
            placeholderText="Start Date"
            selected={new Date(fromDate)}
            onChange={(date: any) => handleFromDateChange(date)}
            minDate={new Date(metricsStartDate)}
            label="Start Date"
          />
          <DateTimePicker
            placeholderText="End Date"
            selected={new Date(toDate)}
            onChange={(date: any) => handleToDateChange(date)}
            minDate={new Date(metricsStartDate)}
            label="End Date"
          />
        </DatePickerContainer>
      </div>

      <Tabs onChange={handleTabSelect} activeKey={environment} tabBarGutter={30} destroyInactiveTabPane={true}>
        <br />

        {environments.map((env) => (
          <Tab key={env} tab={startCase(env)}>
            <div style={{ width: '100%', height: 300 }}>
              {metrics?.length > 0 ? (
                <ResponsiveContainer>
                  <BarChart
                    data={metrics}
                    margin={{
                      top: 20,
                      right: 20,
                      bottom: 30,
                      left: 20,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="event"
                      tick={{ fontSize: 10 }}
                      label={{ value: 'Events', position: 'insideBottomRight' }}
                    />
                    <YAxis dataKey="count" label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="count"
                      fill="#0d6efd"
                      barSize={30}
                      label={{ fill: '#0d6efd', fontSize: 20, position: 'top' }}
                      background={{ fill: '#eee' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <Text>No data available yet!</Text>
                </div>
              )}
            </div>
          </Tab>
        ))}
      </Tabs>
      <InfoMessage>
        This tab was released {metricsStartDate}. Please refer to{' '}
        <Link href="https://bcgov.github.io/sso-docs/integrating-your-application/installation-json" external>
          here
        </Link>{' '}
        for event type details.
      </InfoMessage>
    </>
  );
};

export default withTopAlert(MetricsPanel);
