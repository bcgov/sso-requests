import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { EventCountMetric, Integration } from 'interfaces/Request';
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
import { subtractDaysFromDate } from '@app/utils/helpers';

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

const getFormattedDateString = (d: Date) => {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const metricsStartDate = 'December 01, 2023';
const MetricsPanel = ({ integration }: Props) => {
  const [environment, setEnvironment] = useState('dev');
  const environments = integration?.environments || [];
  const [metrics, setMetrics] = useState<EventCountMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState<Date>(subtractDaysFromDate(14));
  const [toDate, setToDate] = useState<Date>(new Date());
  let selectedFromDate: Date = new Date();

  const handleTabSelect = (key: string) => {
    setEnvironment(key);
  };

  const handleFromDateChange = (val: Date) => {
    setFromDate(val);
  };

  const handleToDateChange = (val: Date) => {
    setToDate(val);
  };

  const fetchMetrics = useCallback(
    throttle(async (fromDate: string, toDate: string, environment: string) => {
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
    fetchMetrics(getFormattedDateString(fromDate), getFormattedDateString(toDate), environment);
  }, [integration?.clientId, environment, fromDate, toDate]);

  return (
    <>
      <TopMargin />

      <div>
        <DatePickerContainer>
          <DateTimePicker
            placeholderText="Start Date"
            selected={new Date(fromDate)}
            onChange={(date: Date) => handleFromDateChange(date)}
            minDate={new Date(metricsStartDate)}
            maxDate={toDate}
            label="Start Date"
          />
          <DateTimePicker
            placeholderText="End Date"
            selected={new Date(toDate)}
            onChange={(date: Date) => handleToDateChange(date)}
            minDate={fromDate}
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
        <Link
          href="https://access.redhat.com/documentation/en-us/red_hat_single_sign-on/7.4/html/server_administration_guide/auditing_and_events#event_types"
          external
        >
          here
        </Link>{' '}
        for event type details.
      </InfoMessage>
    </>
  );
};

export default withTopAlert(MetricsPanel);
