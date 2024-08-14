import React, { useState } from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import Grid from '@button-inc/bcgov-theme/Grid';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import { getInstallation } from 'services/keycloak';
import { prettyJSON, copyTextToClipboard, downloadText } from 'utils/text';
import { Integration } from 'interfaces/Request';
import type { Environment } from 'interfaces/types';
import { getRequestedEnvironments } from 'utils/helpers';
import { DEFAULT_FONT_SIZE } from 'styles/theme';
import { withTopAlert, TopAlert } from 'layout/TopAlert';
import { InfoMessage } from 'components/MessageBox';
import { idpMap } from 'helpers/meta';
import Link from '@button-inc/bcgov-theme/Link';
import { docusaurusURL } from '@app/utils/constants';

const AlignCenter = styled.div`
  text-align: center;
`;

const EnvTitle = styled.div`
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

const TopTitle = styled.div`
  font-size: 18px;
  font-weight: bold;
  color: #000;
  border-bottom: 1px solid gray;
`;

interface Props {
  integration: Integration;
  alert: TopAlert;
}

const InstallationPanel = ({ integration, alert }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleInstallationClick = async (environment: Environment) => {
    setLoading(true);
    const [data, error] = await getInstallation(integration.id as number, environment);
    setLoading(false);
    if (error) {
      alert.show({
        variant: 'danger',
        content: 'Failed to download installation',
      });
      return null;
    }
    return data;
  };

  const handleCopyClick = async (env: Environment) => {
    const inst = await handleInstallationClick(env);
    if (inst) {
      copyTextToClipboard(prettyJSON(inst));
    }
  };

  const handleDownloadClick = async (env: Environment) => {
    const inst = await handleInstallationClick(env);
    if (inst) {
      downloadText(prettyJSON(inst), `${integration.projectName}-installation-${env}.json`);
    }
  };

  if (loading)
    return (
      <AlignCenter>
        <TopMargin />
        <SpinnerGrid color="#000" height={45} width={45} wrapperClass="d-block" visible={true} />
      </AlignCenter>
    );

  return (
    <>
      <TopMargin />
      <TopTitle>Installation JSONs</TopTitle>
      <br />
      <Grid cols={3}>
        {getRequestedEnvironments(integration).map((env) => {
          if (integration.authType !== 'service-account' && env.idps.length === 0) return null;
          const idpList = env.idps.length > 0 ? `(${env.idps.map((idp) => idpMap[idp]).join(', ')})` : '';

          return (
            <React.Fragment key={env.name}>
              <Grid.Row collapse="992" gutter={[]} align="center">
                <Grid.Col span={1} style={{ width: '100%', height: '30px' }}>
                  <EnvTitle>
                    {env.display} {idpList}
                  </EnvTitle>
                </Grid.Col>
              </Grid.Row>
              <Grid.Row collapse="992" gutter={[]} align="center">
                <Grid.Col span={3}>
                  <button className="primary" onClick={() => handleCopyClick(env.name)}>
                    Copy
                  </button>
                  &nbsp;
                  <button className="primary" onClick={() => handleDownloadClick(env.name)}>
                    Download
                  </button>
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
      <InfoMessage>
        For more information on how to use these details, or for the public endpoints associated to your client,{' '}
        <Link href={`${docusaurusURL}/integrating-your-application/installation-json`} external>
          click to learn more on our wiki page
        </Link>
        .
      </InfoMessage>
    </>
  );
};

export default withTopAlert(InstallationPanel);
