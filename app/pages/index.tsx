import React from 'react';
import Head from 'next/head';
import styled from 'styled-components';
import Grid from '@button-inc/bcgov-theme/Grid';
import Link from '@button-inc/bcgov-theme/Link';
import DefaultButton from '@button-inc/bcgov-theme/Button';
import ResponsiveContainer, { defaultRules } from 'components/ResponsiveContainer';
import { PageProps } from 'interfaces/props';
import StandardRealmsSVG from 'svg/StandardRealms';
import { Accordion } from '@bcgov-sso/common-react-components';
import FaqItems from 'page-partials/faq/FaqItems';
import { LANDING_HEADER_FONT, LARGE_BUTTON_FONT_SIZE } from 'styles/theme';
import GithubDiscussions from '@app/components/GithubDiscussions';

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

  @media only screen and (max-width: 800px) {
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

const StandardRealmsSplashContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  column-gap: 0.8em;
  padding: 0.5em;
  border: 1px solid black;
  border-radius: 0.3em;
  margin-top: 1em;

  .splash-image {
    position: relative;
    align-self: start;

    img {
      text-align: left;
      margin: 0;
    }
  }

  .splash-text {
    font-size: 0.9em;
    line-height: 1.1em;
    p {
      font-weight: bold;
      font-size: 1.2em;
      margin: 0.2em 0 0.2em 0;
    }

    ul {
      margin-top: 0;
      margin-bottom: 0;
      li {
        font-family: sans-serif;
        margin: 0;
        font-weight: 400;
      }
    }

    @media only screen and (max-width: 991px) {
      font-size: 0.7em;
    }
    @media only screen and (max-width: 800px) {
      font-size: 0.9em;
    }
  }
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
                <JumbotronH1>Common Hosted Single Sign-On (CSS) Vision</JumbotronH1>
                <JumbotronP>
                  Use our self-service app to integrate
                  <br />
                  with BC government approved login
                  <br />
                  services. Start by requesting an integration.
                </JumbotronP>
                <ButtonContainer>
                  <Button size="medium" data-testid="request-integration" onClick={onLoginClick}>
                    Request SSO Integration
                  </Button>
                </ButtonContainer>
              </Panel>
            </Grid.Col>
            <Grid.Col>
              <Panel marginLeft>
                <StandardRealmsSplashContainer>
                  <div className="splash-image">
                    <StandardRealmsSVG />
                  </div>
                  <div className="splash-text">
                    <p>Included:</p>
                    <ul>
                      <li>Pre-configured realms</li>
                      <li>Access to dev and test &lt; 20 mis. </li>
                      <li>Client IDs and secrets</li>
                      <li>24/7 service availability</li>
                      <li>Service Accounts</li>
                      <li>Roles</li>
                    </ul>
                    <p>Not Included:</p>
                    <ul>
                      <li>Authentication flows</li>
                      <li>Offline sessions</li>
                      <li>Custom scopes</li>
                    </ul>
                  </div>
                </StandardRealmsSplashContainer>
                <Paragraph style={{ paddingLeft: '0px' }}>
                  To learn more about Pathfinder SSO visit the{' '}
                  <Link size="large" href="https://github.com/bcgov/sso-keycloak/wiki" external>
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
                <Accordion.Panel key={'sso'} title="What is Pathfinder's Common Hosted Single Sign-On (CSS) App?">
                  <ul>
                    <li>We provide a login service that connects your users to your applications</li>
                    <li>Your users can login with government identity providers, such as IDIR and BCeID</li>
                    <li>We provide you with instant access to your development and test environments</li>
                  </ul>
                </Accordion.Panel>
                <Accordion.Panel key={'benefits'} title="Benefits">
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
                <Accordion.Panel key={'service-levels'} title="Service Levels">
                  <ul>
                    <li>
                      Our service is available 24/7, except during planned outages within the Kamloops and Calgary data
                      centres. Planned outages are communicated through{' '}
                      <Link external href="https://chat.developer.gov.bc.ca/channel/sso">
                        RocketChat
                      </Link>
                      .
                    </li>
                    <li>
                      Our regular business hours are weekdays from 9:00 am to 5:00 pm Pacific Time, excluding statutory
                      holidays. Client provisioning questions and requests will be reviewed and handled during normal
                      business hours. After hours support is provided by the Pathfinder SSO team, and is only available
                      for service outages and other incidents that impact the service.
                    </li>
                    <li>
                      To learn more about our service uptime monitoring, please visit our{' '}
                      <Link external href="https://github.com/bcgov/sso-keycloak/wiki/Pathfinder-Uptime-Monitoring">
                        uptime page on our wiki
                      </Link>{' '}
                      and join our{' '}
                      <Link external href="https://subscribe.developer.gov.bc.ca/">
                        newsletter
                      </Link>{' '}
                      to receive important updates on the service and any outages.
                    </li>
                  </ul>
                </Accordion.Panel>
                <Accordion.Panel key={'technical-info'} title="Additional Technical Information">
                  <div>
                    Please contact us if your project:
                    <ul>
                      <li>Is a critical application</li>
                      <li>Will be experiencing high volume transactions</li>
                      <li>Requires session management, scopes or changes in token times</li>
                    </ul>
                    If you would like to learn more about IM IT Standards,{' '}
                    <Link
                      href="https://github.com/bcgov/sso-keycloak/wiki/Useful-References#imit-identity-standards"
                      external
                    >
                      learn more here
                    </Link>
                  </div>
                </Accordion.Panel>
              </Accordion>
              <br />
              <GithubDiscussions />
              {/* <FaqItems /> */}
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
              <Link href="https://github.com/bcgov/sso-keycloak/wiki" external>
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
