import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styled from 'styled-components';
import Grid from '@button-inc/bcgov-theme/Grid';
import Card from '@button-inc/bcgov-theme/Card';
import Link from '@button-inc/bcgov-theme/Link';
import Button from '@button-inc/bcgov-theme/Button';
import ResponsiveContainer, { MediaRule } from 'components/ResponsiveContainer';
import { IndexPageProps } from 'interfaces/props';

const mediaRules: MediaRule[] = [
  {
    maxWidth: 767,
  },
  {
    maxWidth: 991,
    width: 723,
  },
  {
    maxWidth: 1199,
    width: 933,
  },
  {
    width: 1127,
  },
];

export default function Home({ currentUser }: IndexPageProps) {
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
      <ResponsiveContainer rules={mediaRules}>
        <Grid cols={3} gutter={[5, 2]}>
          <Grid.Row collapse="800">
            <Grid.Col span={2}>
              <Card title="SSO Request Form">
                Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et
                dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip
                ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
                fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia
                deserunt mollit anim id est laborum.
                <br /> <br />
                <Button size="small">Click Me!</Button>
                <br /> <br />
                <Link href="#link1">
                  Do you have any questions? Click here to <strong>ask</strong>
                </Link>
              </Card>
            </Grid.Col>
            <Grid.Col>
              <Card title="SSO Request Form">
                aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
                dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
                officia deserunt mollit anim id est laborum.
                <br /> <br />
                <ul>
                  <li>
                    <Link href="#link1" content="link1" />
                  </li>
                  <li>
                    <Link href="#link1" content="link2" />
                  </li>
                </ul>
              </Card>
            </Grid.Col>
          </Grid.Row>
        </Grid>
      </ResponsiveContainer>
    </>
  );
}
