import React from 'react';
import Head from 'next/head';
import styled from 'styled-components';
import Grid from '@button-inc/bcgov-theme/Grid';
import Link from '@button-inc/bcgov-theme/Link';
import DefaultButton from '@button-inc/bcgov-theme/Button';
import ResponsiveContainer, { defaultRules } from 'components/ResponsiveContainer';
import { PageProps } from 'interfaces/props';
import main from 'svg/main';

const Panel = styled.div`
  max-width: 450px;
  margin-bottom: 1rem;
  margin-left: auto;
  margin-right: auto;
`;

const Button = styled(DefaultButton)`
  min-width: 150px;
`;

const PaddedButton = styled(Button)`
  margin-left: 20px;
`;

const JumbotronH1 = styled.h1`
  font-size: 3rem;
`;

const JumbotronP = styled.p`
  font-size: 1.5rem;
`;

const BoldP = styled.p`
  margin-top: 50px;
  font-size: 1.5rem;
  font-weight: bold;
`;

const Paragraph = styled.p`
  font-size: 1.2rem;
  padding-left: 3.5rem;
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: row;
`;

export default function Home({ onLoginClick }: PageProps) {
  return (
    <>
      <Head>
        <title>SSO Requests</title>
        <meta name="description" content="The request process workflow tool for the RedHat SSO Dev Exchange service" />
        <link rel="icon" href="/bcid-favicon-32x32.png" />
      </Head>
      <ResponsiveContainer rules={defaultRules}>
        <Grid cols={2} gutter={[5, 2]}>
          <Grid.Row collapse="800">
            <Grid.Col>
              <Panel>
                <JumbotronH1>Pathfinder SSO Vision</JumbotronH1>
                <JumbotronP>
                  Provide fast, simple
                  <br />
                  and secure access to all BC
                  <br />
                  Gov IDPs.
                </JumbotronP>
                <BoldP>Request SSO Integration</BoldP>
                <ButtonContainer>
                  <Button size="medium" onClick={onLoginClick}>
                    IDIR
                  </Button>
                  <br /> <br />
                  <a
                    href="https://github.com/BCDevOps/devops-requests/issues/new?assignees=nvunnamm&labels=keycloak-client%2C+pending%2C+sso&template=keycloak_standard_client_request.md&title="
                    target="blank"
                  >
                    <PaddedButton>IDIR and BCeID</PaddedButton>
                  </a>
                </ButtonContainer>
              </Panel>
            </Grid.Col>
            <Grid.Col>
              <Panel>
                {main}
                <Paragraph>
                  To learn more about Pathfinder SSO
                  <br />
                  visit the{' '}
                  <Link size="large" href="https://github.com/bcgov/ocp-sso/wiki/SSO-Onboarding" external>
                    Onboarding Guide
                  </Link>
                </Paragraph>
              </Panel>
            </Grid.Col>
          </Grid.Row>
        </Grid>
      </ResponsiveContainer>
    </>
  );
}
