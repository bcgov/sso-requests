import React from 'react';
import Head from 'next/head';
import Grid from '@button-inc/bcgov-theme/Grid';
import ResponsiveContainer, { defaultRules } from 'components/ResponsiveContainer';
import FaqItems from 'page-partials/faq/FaqItems';

export default function FAQ() {
  return (
    <>
      <Head>
        <meta name="description" content="The request process workflow tool for the RedHat SSO Dev Exchange service" />
        <link rel="icon" href="/bcid-favicon-32x32.png" />
      </Head>
      <ResponsiveContainer rules={defaultRules}>
        <Grid cols={2} gutter={[5, 2]}>
          <Grid.Row>
            <Grid.Col span="2">
              <FaqItems />
            </Grid.Col>
          </Grid.Row>
        </Grid>
      </ResponsiveContainer>
    </>
  );
}
