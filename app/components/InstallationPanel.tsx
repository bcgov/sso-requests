import React, { useContext, useEffect, useState } from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import Grid from '@button-inc/bcgov-theme/Grid';
import Loader from 'react-loader-spinner';
import { getInstallation } from 'services/keycloak';
import Button from 'html-components/Button';
import { prettyJSON, copyTextToClipboard, downloadText } from 'utils/text';
import { ClientRequest } from 'interfaces/Request';
import type { Environment } from 'interfaces/types';

const AlignCenter = styled.div`
  text-align: center;
`;

const LeftTitle = styled.span`
  color: #000;
  font-size: 1.1rem;
`;

const StatusLabel = styled.span`
  color: #3e3e3e;
  font-size: 14px;
  font-weight: 700;
`;

const TopMargin = styled.div`
  height: var(--field-top-spacing);
`;

interface EnvironmentOption {
  name: Environment;
  display: string;
}

const environments: EnvironmentOption[] = [
  {
    name: 'dev',
    display: 'Development',
  },
  {
    name: 'test',
    display: 'Test',
  },
  {
    name: 'prod',
    display: 'Production',
  },
];

const InstallationPanel = ({ request }: { request: ClientRequest }) => {
  const [loading, setLoading] = useState(false);

  const handleInstallationClick = async (environment: Environment) => {
    setLoading(true);
    const [data, err] = await getInstallation(request.id as number, environment);
    setLoading(false);
    return data;
  };

  const handleCopyClick = async (env: Environment) => {
    const inst = await handleInstallationClick(env);
    copyTextToClipboard(prettyJSON(inst));
  };

  const handleDownloadClick = async (env: Environment) => {
    const inst = await handleInstallationClick(env);
    downloadText(prettyJSON(inst), `${request.projectName}-installation-${env}.json`);
  };

  if (loading)
    return (
      <AlignCenter>
        <Loader type="Grid" color="#000" height={45} width={45} visible={true} />
      </AlignCenter>
    );

  return (
    <>
      <TopMargin />
      <Grid cols={4}>
        {environments.map((env) => {
          return (
            <React.Fragment key={env.name}>
              <Grid.Row collapse="992" gutter={[]}>
                <Grid.Col span={1}>
                  <LeftTitle>{env.display}</LeftTitle>
                </Grid.Col>
                <Grid.Col span={3}>
                  <Button size="xsmall" variant="grey" onClick={() => handleCopyClick(env.name)}>
                    Copy
                  </Button>
                  &nbsp;
                  <Button size="xsmall" variant="grey" onClick={() => handleDownloadClick(env.name)}>
                    Download
                  </Button>
                  &nbsp;&nbsp;
                  <FontAwesomeIcon color="green" icon={faCheckCircle} />
                  &nbsp;
                  <StatusLabel>Ready</StatusLabel>
                </Grid.Col>
              </Grid.Row>
              <br />
            </React.Fragment>
          );
        })}
      </Grid>
    </>
  );
};

export default InstallationPanel;
