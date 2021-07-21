import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styled from 'styled-components';
import Grid from '@button-inc/bcgov-theme/Grid';
import Card from '@button-inc/bcgov-theme/Card';
import Link from '@button-inc/bcgov-theme/Link';
import Button from '@button-inc/bcgov-theme/Button';
import ResponsiveContainer, { MediaRule, defaultRules } from 'components/ResponsiveContainer';
import { PageProps } from 'interfaces/props';
import main from 'svg/main';

const Panel = styled.div`
  max-width: 450px;
  margin-bottom: 1rem;
  margin-left: auto;
  margin-right: auto;
`;

const JumbotronH1 = styled.h1`
  font-size: 3rem;
`;

const JumbotronP = styled.p`
  font-size: 2rem;
`;

const Paragraph = styled.p`
  font-size: 1.2rem;
  padding-left: 3.5rem;
`;

export default function Home({ currentUser, onLoginClick }: PageProps) {
  const router = useRouter();

  if (currentUser) {
    router.push('/my-requests');
    return null;
  }

  return (
    <>
      <Head>
        <title>SSO Requests</title>
        <meta name="description" content="The request process workflow tool for the RedHat SSO Dev Exchange service" />
        <link rel="icon" href="/favicon.ico" />
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
                <h3>Request SSO project:</h3>
                <Button size="medium" onClick={onLoginClick}>
                  IDIR/GitHub
                </Button>
                <br /> <br />
                <Link
                  size="large"
                  href="https://github.com/BCDevOps/devops-requests/issues/new?assignees=nvunnamm&labels=keycloak-client%2C+pending%2C+sso&template=keycloak_standard_client_request.md&title="
                  external
                >
                  or IDIR/GitHub/BCeID
                </Link>
              </Panel>
            </Grid.Col>
            <Grid.Col>
              <Panel>
                {main}
                <Paragraph>
                  To learn more about Pathfinder SSO
                  <br />
                  visit the{' '}
                  <Link size="large" href="https://github.com/bcgov/ocp-sso/wiki" external>
                    User Guide
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
