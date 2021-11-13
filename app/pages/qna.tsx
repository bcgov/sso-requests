import React from 'react';
import Head from 'next/head';
import styled from 'styled-components';
import Grid from '@button-inc/bcgov-theme/Grid';
import Link from '@button-inc/bcgov-theme/Link';
import ResponsiveContainer, { defaultRules } from 'components/ResponsiveContainer';
import Accordion from 'components/Accordion';

export default function QNA() {
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
              <h2>Frequently Asked Questions</h2>
              <Accordion>
                <Accordion.Panel title="Q. What is the difference between confidential and public client types?">
                  <p>
                    The short answer is that <b>confidential clients</b> can keep a secret while <b>public clients</b>{' '}
                    do not require a secret.
                  </p>
                  <h3>Confidential Client</h3>
                  <ul>
                    <li>Server-side applications (e.g., .Net, Java, PHP)</li>
                  </ul>
                  <h3>Public Client</h3>
                  <ul>
                    <li>Javascript applications (e.g., SPA: single page application, Hybrid Mobile apps)</li>
                    <li>Native Mobile apps, Embedded devices, and Internet of Things (e.g., Apple TV)</li>
                    <li>Secured by PKCE (Proof Key for Code Exchange); a secret on the fly</li>
                  </ul>
                </Accordion.Panel>
                <Accordion.Panel title="Q. Can I still create an integration without knowing my redirect URIs?">
                  <p>
                    Yes, you can start with <b>http://localhost</b> and change your redirect URIs anytime later.
                    <br />
                    Before going to production, please make sure that your production environment's redirect URIs are
                    properly set to your live application's domain.
                  </p>
                </Accordion.Panel>
                <Accordion.Panel title="Q. How do I allow dynamic redirect URIs for my integration?">
                  <p>
                    Wildcards (*) allow dynamical redirect URIs by being added at the end of a URI (e.g.,
                    http://host.com/*)
                    <br />
                    <b>http://host.com/*</b> allows redirects to any subdirectories of the <b>http://host.com</b>
                  </p>
                </Accordion.Panel>
                <Accordion.Panel title="Q. How can I get all neccesary information to set up my integration?">
                  <p>
                    You can find the information from the <b>Installation JSON</b> downloaded from your dashboard.
                    <br />
                    And for additional endpoint information such as the Authorization URL and Token URL,{' '}
                    <b>Provider Configuration Endpoint</b> can be used.
                  </p>
                  <Link
                    href="https://github.com/bcgov/ocp-sso/wiki/Using-Your-SSO-Client#setting-up-your-keycloak-client"
                    external
                  >
                    Please see the wiki for accessing your provider endpoint information
                  </Link>
                </Accordion.Panel>
              </Accordion>
            </Grid.Col>
          </Grid.Row>
        </Grid>
      </ResponsiveContainer>
    </>
  );
}
