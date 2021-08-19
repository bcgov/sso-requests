import React, { useContext, useEffect, useState } from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import Grid from '@button-inc/bcgov-theme/Grid';
import Loader from 'react-loader-spinner';
import { getInstallation } from 'services/keycloak';
import Button from 'html-components/Button';
import { prettyJSON, copyTextToClipboard, downloadText } from 'utils/text';
import { Request } from 'interfaces/Request';
import type { Environment } from 'interfaces/types';
import { environments } from 'utils/constants';
import { DEFAULT_FONT_SIZE } from 'styles/theme';
import { withBottomAlert, BottomAlert } from 'layout/BottomAlert';

const AlignCenter = styled.div`
  text-align: center;
`;

const LeftTitle = styled.span`
  color: #000;
  font-size: ${DEFAULT_FONT_SIZE};
  font-weight: bold;
`;

const StatusLabel = styled.span`
  color: #3e3e3e;
  font-size: 14px;
  font-weight: 700;
`;

const TopMargin = styled.div`
  height: var(--field-top-spacing);
`;

interface Props {
  selectedRequest: Request;
  alert: BottomAlert;
}

const InstallationPanel = ({ selectedRequest, alert }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleInstallationClick = async (environment: Environment) => {
    setLoading(true);
    const [data, err] = await getInstallation(selectedRequest.id as number, environment);
    setLoading(false);
    return data;
  };

  const handleCopyClick = async (env: Environment) => {
    const inst = await handleInstallationClick(env);
    copyTextToClipboard(prettyJSON(inst));
    const variant = inst ? 'success' : 'danger';
    const content = inst ? 'Installation copied to clipboard' : 'Failed to download installation';
    alert.show({
      variant,
      fadeOut: 10000,
      closable: true,
      content,
    });
  };

  const handleDownloadClick = async (env: Environment) => {
    const inst = await handleInstallationClick(env);
    downloadText(prettyJSON(inst), `${selectedRequest.projectName}-installation-${env}.json`);
  };

  if (loading)
    return (
      <AlignCenter>
        <TopMargin />
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
              <Grid.Row collapse="992" gutter={[]} align="center">
                <Grid.Col span={1}>
                  <LeftTitle>{env.display}</LeftTitle>
                </Grid.Col>
                <Grid.Col span={3}>
                  <Button size="medium" variant="grey" onClick={() => handleCopyClick(env.name)}>
                    Copy
                  </Button>
                  &nbsp;
                  <Button size="medium" variant="grey" onClick={() => handleDownloadClick(env.name)}>
                    Download
                  </Button>
                  &nbsp;&nbsp;
                  <FontAwesomeIcon color="green" icon={faCheckCircle} title="Ready" />
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

export default withBottomAlert(InstallationPanel);
