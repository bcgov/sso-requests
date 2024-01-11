import React from 'react';
import Link from '@button-inc/bcgov-theme/Link';
import { Accordion } from '@bcgov-sso/common-react-components';
import { docusaurusURL, wikiURL } from '@app/utils/constants';

interface Props {
  children?: React.ReactNode;
}

export default function FaqItems({ children }: Props) {
  return (
    <>
      <h2>Frequently Asked Questions</h2>
      <Accordion>
        {children ? children : <></>}
        <Accordion.Panel title="Q. Which Identity Provider Should I Use?">
          <p>
            <ul>
              <li>
                Use <strong>IDIR</strong> when only <strong>government</strong> employees will be logging into your
                application
              </li>
              <li>
                Use <strong>IDIR & BCeID</strong> when <strong>both government</strong> employees and the{' '}
                <strong>general public</strong> will be logging into your application. We support both Business and
                Basic BCeIDs. To learn more about the different types of BCeIDs visit the{' '}
                <Link external href="https://www.bceid.ca/aboutbceid/">
                  Types of BCeID page
                </Link>
              </li>
              <li>
                To learn more about which identity provider to use, review the{' '}
                <Link external href={`${wikiURL}/SSO-Onboarding`}>
                  SSO Onboarding section
                </Link>{' '}
                in our Knowledge base
              </li>
            </ul>
            Setup times:
            <ul>
              <li>
                For <strong>IDIR</strong>: it will only take 30 minutes to configure your dev, test, and production
                environments
              </li>
              <li>
                For <strong>IDIR & BCeID</strong>: it will take 30 minutes to configure the dev and test environments.
                The production environment requires IDIM approvals and may take longer. To learn more, contact the{' '}
                <Link href="mailto:IDIM.Consulting@gov.bc.ca">BCeID team</Link>.
              </li>
            </ul>
          </p>
        </Accordion.Panel>
        <Accordion.Panel title="Q. Which Information Do I Need to Get Started?">
          <p>
            Before starting the integration request, make sure you have this information ready:
            <br />
            <br />
            <ul>
              <li>
                <Link href="#q-which-identity-provider-should-i-use">
                  A decision around which identity provider you would like to use
                </Link>
              </li>
              <li>Your project name</li>
              <li>Your redirect URIs for dev, test and prod</li>
              <li>
                <Link href="#q-what-is-the-difference-between-confidential-and-public-client-types">
                  A decision if you want a public or confidential client.
                </Link>{' '}
                To learn more, review the Technical Details under the{' '}
                <Link external href={`${docusaurusURL}/category/integrating-your-application`}>
                  Using Your SSO Client
                </Link>{' '}
                in our SSO Pathfinder Knowledge Base
              </li>
            </ul>
          </p>
        </Accordion.Panel>
        <Accordion.Panel title="Q. What is the difference between confidential and public client types?">
          <p>
            The short answer is that <b>confidential clients</b> can keep a secret while <b>public clients</b> do not
            require a secret.
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
            Yes, you can start with <b>http://localhost</b> and change your redirect URIs.
          </p>
          <p>
            Before going to production, please make sure that your production environment's redirect URIs are properly
            set to your live application's domain.
          </p>
        </Accordion.Panel>
        <Accordion.Panel title="Q. How do I allow dynamic redirect URIs for my integration?">
          <p>
            Wildcards (*) allow dynamical redirect URIs by being added at the end of a URI (e.g., http://host.com/*)
          </p>
          <p>
            For example, <b>http://host.com/*</b> allows redirects to any subdirectories of the <b>http://host.com</b>
          </p>
        </Accordion.Panel>
        <Accordion.Panel title="Q. How can I get all necessary information to set up my integration?">
          <p>
            You can find the information in the <b>Installation JSON</b> downloaded from your dashboard.
          </p>
          <p>
            For additional endpoint information, such as the Authorization URL and Token URL, the{' '}
            <b>Provider Configuration Endpoint</b> can be used.
          </p>
          <Link href={`${docusaurusURL}/integrating-your-application/installation-json`} external>
            Please see the wiki for accessing your provider endpoint information
          </Link>
        </Accordion.Panel>
      </Accordion>
    </>
  );
}
