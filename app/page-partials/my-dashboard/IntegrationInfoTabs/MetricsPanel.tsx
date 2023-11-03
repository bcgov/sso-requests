import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { getRequestedEnvironments } from 'utils/helpers';
import { Integration } from 'interfaces/Request';
import { EnvironmentOption } from 'interfaces/form';
import { withTopAlert } from 'layout/TopAlert';
import CenteredModal from 'components/CenteredModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { changeClientSecret } from 'services/keycloak';
import { Button, Tabs, Tab } from '@bcgov-sso/common-react-components';
import startCase from 'lodash.startcase';
import {
  BarChart,
  Bar,
  Rectangle,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Text,
  Area,
} from 'recharts';
import { getAggregatedDataByClientId } from '@app/services/grafana';
import throttle from 'lodash.throttle';

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

const MetricsPanel = ({ integration }: Props) => {
  const [environment, setEnvironment] = useState('dev');
  const environments = integration?.environments || [];
  const [metrics, setMetrics] = useState([]);
  const handleTabSelect = (key: any) => {
    setEnvironment(key);
  };

  const fetchMetrics = useCallback(
    throttle(async (environment: string) => {
      const [metricsData, err] = await getAggregatedDataByClientId('standard-realm', environment);
      if (err || !metricsData) {
        console.log(err);
      }
      setMetrics(metricsData[0]);
    }),
    [integration?.clientId, environment],
  );

  useEffect(() => {
    fetchMetrics(environment);
  }, [integration?.clientId, environment]);

  return (
    <>
      <TopMargin />
      <Tabs onChange={handleTabSelect} activeKey={environment} tabBarGutter={30} destroyInactiveTabPane={true}>
        <br />

        {environments.map((env) => (
          <Tab key={env} tab={startCase(env)}>
            <div style={{ width: '100%', height: 300 }}>
              {metrics.length > 0 ? (
                <ResponsiveContainer>
                  <BarChart
                    data={metrics}
                    margin={{
                      top: 20,
                      right: 20,
                      bottom: 20,
                      left: 20,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="event"
                      tick={{ fontSize: 10 }}
                      label={{ value: 'Events', angle: 0, position: 'insideBottomRight' }}
                    />
                    <YAxis dataKey="count" label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill="#0d6efd"
                      barSize={30}
                      label={{ fill: 'white', fontSize: 20 }}
                      background={{ fill: '#eee' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Text />
              )}
            </div>
          </Tab>
        ))}
      </Tabs>
    </>
  );
};

export default withTopAlert(MetricsPanel);
