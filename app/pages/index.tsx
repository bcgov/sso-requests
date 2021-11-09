import React from 'react';
import Head from 'next/head';
import styled from 'styled-components';
import Grid from '@button-inc/bcgov-theme/Grid';
import Link from '@button-inc/bcgov-theme/Link';
import DefaultButton from '@button-inc/bcgov-theme/Button';
import ResponsiveContainer, { defaultRules } from 'components/ResponsiveContainer';
import { PageProps } from 'interfaces/props';
import main from 'svg/main';
import Accordion from 'components/Accordion';
import { LANDING_HEADER_FONT, LARGE_BUTTON_FONT_SIZE } from 'styles/theme';

interface PanelProps {
  marginLeft?: boolean;
  marginRight?: boolean;
}

const Panel = styled.div<PanelProps>`
  max-width: 450px;
  ${(props) => props.marginLeft && 'margin-left: auto;'}
  ${(props) => props.marginRight && 'margin-right: auto;'}
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  @media only screen and (max-width: 800) {
    margin-left: 0;
    margin-right: 0;
  }
`;

const JumbotronH1 = styled.h1`
  font-size: 3rem;
`;

const JumbotronP = styled.p`
  font-size: 1.5rem;
`;

const Paragraph = styled.p`
  font-size: 1.2rem;
  padding-left: 3.5rem;
  margin: 0;
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: row;
`;

const HorizontalRule = styled.hr`
  margin: 30px 0;
`;

const Header = styled.h2`
  font-size: ${LANDING_HEADER_FONT};
`;

const Button = styled(DefaultButton)`
  font-size: ${LARGE_BUTTON_FONT_SIZE};
`;

export default function Home({ onLoginClick }: PageProps) {
  return (
    <>
      <Head>
        <meta name="description" content="The request process workflow tool for the RedHat SSO Dev Exchange service" />
        <link rel="icon" href="/bcid-favicon-32x32.png" />
      </Head>
      <ResponsiveContainer rules={defaultRules}>
        <Grid cols={2} gutter={[5, 2]}>
          <Grid.Row collapse="800">
            <Grid.Col>
              <Panel marginRight>
                <JumbotronH1>Pathfinder SSO Vision</JumbotronH1>
                <JumbotronP>
                  Enabling BC Government
                  <br />
                  digital delivery teams
                  <br />
                  to get single sign-on.
                </JumbotronP>
                <ButtonContainer>
                  <Button size="medium" onClick={onLoginClick}>
                    Request SSO Integration
                  </Button>
                </ButtonContainer>
              </Panel>
            </Grid.Col>
            <Grid.Col>
              <Panel marginLeft>
                {main}
                <Paragraph>
                  To learn more about Pathfinder SSO
                  <br />
                  visit the{' '}
                  <Link size="large" href="https://github.com/bcgov/ocp-sso/wiki" external>
                    SSO Pathfinder Knowledge Base
                  </Link>
                </Paragraph>
              </Panel>
            </Grid.Col>
          </Grid.Row>
          <Grid.Row>
            <Grid.Col span="2">
              <HorizontalRule />
              <Header>About</Header>
              <Accordion>
                <Accordion.Panel title="What is Pathfinder's Common Hosted Sign-On (CSS) App?">
                  <ul>
                    <li>We provide a login service that connects your users to your applications</li>
                    <li>
                      Your users can login with government identity providers, such as IDIR and BCeID (coming soon)
                    </li>
                    <li>We provide you with instant access to your development and test environments</li>
                  </ul>
                </Accordion.Panel>
                <Accordion.Panel title="Benefits">
                  <ul>
                    <li>Use our self-service to quickly get setup</li>
                    <li>
                      We set up a &quot;Standard Realm&quot; for you, a space where your application lives. You do not
                      have to do any setup yourself
                    </li>
                    <li>We provide you with a Client ID and secret (for confidential clients)</li>
                    <li>You can easily update and configure URIs</li>
                    <li>We follow single sign on best practices via open ID connect protocol (OIDC)</li>
                  </ul>
                </Accordion.Panel>
                <Accordion.Panel title="Service Levels">
                  <ul>
                    <li>Our service is up and running 24/7</li>
                    <li>
                      We provide business/technical support during regular business hours, from 8:30 am to 4:30 pm,
                      Monday to Friday (except for holidays)
                    </li>
                  </ul>
                </Accordion.Panel>
                <Accordion.Panel title="Additional Technical Information">
                  <p>
                    Please contact us if your project:
                    <ul>
                      <li>Is a critical application</li>
                      <li>Will be experiencing high volume transactions</li>
                      <li>Requires role management, session management, scopes or changes in token times</li>
                    </ul>
                    If you would like to learn more about IM IT Standards,{' '}
                    <Link
                      href="https://github.com/bcgov/ocp-sso/wiki/Useful-References#imit-identity-standards"
                      external
                    >
                      learn more here
                    </Link>
                  </p>
                </Accordion.Panel>
              </Accordion>
              <br />
              <h2>Getting Started</h2>
              <Accordion>
                <Accordion.Panel title="Which Identity Provider Should I Use?">
                  <p>
                    <ul>
                      <li>
                        Use <strong>IDIR</strong> when only <strong>government</strong> employees will be logging into
                        your application
                      </li>
                      <li>
                        Use <strong>IDIR & BCeID</strong> when <strong>both government</strong> employees and the{' '}
                        <strong>general public</strong> will be logging into your application. We support both Business
                        and Basic BCeIDs. To learn more about the different types of BCeIDs visit the{' '}
                        <Link external href="https://www.bceid.ca/aboutbceid/">
                          Types of BCeID page
                        </Link>
                      </li>
                      <li>
                        To learn more about which identity provider to use, review the{' '}
                        <Link external href="https://github.com/bcgov/ocp-sso/wiki/SSO-Onboarding">
                          SSO Onboarding section
                        </Link>{' '}
                        in our Knowledge base
                      </li>
                    </ul>
                    Setup times:
                    <ul>
                      <li>
                        For <strong>IDIR</strong>: it will only take 30 minutes to configure your dev, test, and
                        production environments
                      </li>
                      <li>
                        For <strong>IDIR & BCeID</strong>: it will take 30 minutes to configure the dev and test
                        environments. The production environment requires IDIM approvals and may take longer. To learn
                        more, contact the <Link href="mailto:IDIM.Consulting@gov.bc.ca">BCeID team</Link>.
                      </li>
                    </ul>
                  </p>
                </Accordion.Panel>
                <Accordion.Panel title="Which Information Do I Need to Get Started?">
                  <p>
                    Before starting the integration request, make sure you have this information ready:
                    <br />
                    <br />
                    <ul>
                      <li>A decision around which identity provider you would like to use</li>
                      <li>Your project name</li>
                      <li>Your redirect URIs for dev, test and prod</li>
                      <li>
                        A decision if you want a public of confidential client. To learn more, review the Technical
                        Details under the{' '}
                        <Link external href="https://github.com/bcgov/ocp-sso/wiki/Using-Your-SSO-Client">
                          Using Your SSO Client
                        </Link>{' '}
                        in our SSO Pathfinder Knowledge Base
                      </li>
                    </ul>
                  </p>
                </Accordion.Panel>
              </Accordion>
              <br />
              <h2>Need Help?</h2>
              Message us on{' '}
              <Link href="https://chat.developer.gov.bc.ca/channel/sso" external>
                RocketChat
              </Link>
              <br />
              Send us an{' '}
              <Link href="mailto:bcgov.sso@gov.bc.ca" title="Pathfinder SSO">
                email
              </Link>
              <br />
              Review our{' '}
              <Link href="https://github.com/bcgov/ocp-sso/wiki" external>
                helpful documentation
              </Link>
              <br />
              <br />
            </Grid.Col>
          </Grid.Row>
        </Grid>
      </ResponsiveContainer>
    </>
  );
}
