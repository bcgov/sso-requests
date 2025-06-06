import React from 'react';
import Head from 'next/head';
import styled from 'styled-components';
import Grid from '@button-inc/bcgov-theme/Grid';
import Link from '@button-inc/bcgov-theme/Link';
import ResponsiveContainer, { defaultRules } from 'components/ResponsiveContainer';
import { PageProps } from 'interfaces/props';
import StandardRealmsSVG from 'svg/StandardRealms';
import WhatsNewSVG from '@app/svg/WhatsNewSVG';
import { Accordion } from '@bcgov-sso/common-react-components';
import { docusaurusURL, testimonials, formatWikiURL } from '@app/utils/constants';
import Testimonial from 'components/Testimonial';
import Carousel from 'components/Carousel';
import useWindowDimensions from '@app/hooks/useWindowDimensions';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuoteLeft } from '@fortawesome/free-solid-svg-icons';

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

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: row;
`;

const HorizontalRule = styled.hr`
  margin: 30px 0;
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
    align-self: start;
  }

  .splash-text {
    line-height: 1.1em;
    p {
      font-weight: bold;
      margin: 0.2em 0 0.2em 0;
    }

    ul {
      margin-top: 0;
      margin-bottom: 0;
      li {
        margin: 0;
      }
    }
  }
`;

const WhatsNew = styled.div`
  background: #38598a;
  color: #ffffff;
  margin-bottom: 55px;
  margin-top: 55px;
  padding-bottom: 55px;
  padding-top: 55px;
  weight: 400px;
  a {
    color: #ffffff;
  }
`;

const TopQuoteContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 2em;

  .quote {
    font-weight: bold;
    margin-left: 2em;
  }

  .icon-circle {
    height: 90px;
    width: 90px;
    flex-shrink: 0;
    border-radius: 45px;
    background: #38598a;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }
`;

export default function Home({ onLoginClick }: Readonly<PageProps>) {
  const { width } = useWindowDimensions();
  return (
    <>
      <Head>
        <meta name="description" content="The request process workflow tool for the RedHat SSO Dev Exchange service" />
      </Head>
      <ResponsiveContainer rules={defaultRules}>
        <Grid cols={2} gutter={[5, 2]}>
          <Grid.Row collapse="800">
            <Grid.Col>
              <Panel marginRight>
                <h1>Common Hosted Single Sign-On (CSS) Vision</h1>
                <p className="text-large">
                  Use our self-service app to integrate
                  <br />
                  with BC government approved login
                  <br />
                  services. Start by requesting an integration.
                </p>
                <ButtonContainer>
                  <button className="primary" data-testid="request-integration" onClick={onLoginClick}>
                    Request SSO Integration
                  </button>
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
                    <p className="text-large">Included:</p>
                    <ul>
                      <li>Pre-configured realms</li>
                      <li>Access to dev and test</li>
                      <li>Client IDs and secrets</li>
                      <li>24/7 service availability</li>
                      <li>Service Accounts</li>
                      <li>Roles</li>
                    </ul>
                    <p className="text-large">Not Included:</p>
                    <ul>
                      <li>Authentication flows</li>
                      <li>Offline sessions</li>
                      <li>Custom scopes</li>
                    </ul>
                  </div>
                </StandardRealmsSplashContainer>
                <p style={{ paddingLeft: '0px' }}>
                  To learn more about Pathfinder SSO visit the{' '}
                  <Link href={formatWikiURL()} external>
                    SSO Pathfinder Knowledge Base
                  </Link>
                </p>
              </Panel>
            </Grid.Col>
          </Grid.Row>
        </Grid>
      </ResponsiveContainer>

      <br />

      <WhatsNew>
        <ResponsiveContainer rules={defaultRules} style={{ marginTop: '0px' }}>
          <Grid cols={6} gutter={[5, 2]}>
            <Grid.Row collapse="800">
              <Grid.Col span={1}>
                <WhatsNewSVG />
              </Grid.Col>
              <Grid.Col span={5}>
                <h2>What&apos;s new at SSO?</h2>
                <ul>
                  <li>
                    We&apos;ve updated our wiki into two areas of focus: one for{' '}
                    <Link href={formatWikiURL()} target="_blank" rel="noreferrer" title="Business" external>
                      business
                    </Link>{' '}
                    areas and one for{' '}
                    <Link href={docusaurusURL} target="_blank" rel="noreferrer" title="Business" external>
                      technical
                    </Link>
                    , take a look.
                  </li>
                </ul>
              </Grid.Col>
            </Grid.Row>
          </Grid>
        </ResponsiveContainer>
      </WhatsNew>

      <ResponsiveContainer rules={defaultRules}>
        <Grid cols={2} gutter={[5, 2]}>
          <Grid.Row collapse="800">
            <TopQuoteContainer>
              <div className="icon-circle">
                <FontAwesomeIcon icon={faQuoteLeft} size="4x" />
              </div>
              <div className="quote text-large">
                The service and support has been consistently solid and extremely good.
              </div>
            </TopQuoteContainer>
          </Grid.Row>
          <Grid.Row collapse="800">
            <Carousel viewableItems={width > 1200 ? 3 : 2}>
              {testimonials.map((testimonial) => (
                <Testimonial testimonial={testimonial} key={testimonial.id} />
              ))}
            </Carousel>
          </Grid.Row>
        </Grid>
      </ResponsiveContainer>

      <ResponsiveContainer rules={defaultRules}>
        <Grid cols={2} gutter={[5, 2]}>
          <Grid.Row>
            <Grid.Col span="2">
              <HorizontalRule />
              <h2>About</h2>
              <Accordion>
                <Accordion.Panel key={'sso'} title="What is Pathfinder's Common Hosted Single Sign-On (CSS) App?">
                  <ul>
                    <li>We provide a login service that connects your users to your applications</li>
                    <li>
                      Your users can login with government identity providers, such as IDIR with multi-factor
                      authentication (MFA) and BCeID
                    </li>
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
                      <Link external href={formatWikiURL('Pathfinder-Uptime-Monitoring/')}>
                        uptime page on our wiki
                      </Link>{' '}
                      and join our{' '}
                      <Link external href="https://digital.gov.bc.ca/sso-notifications/">
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
                    <Link href={formatWikiURL('Useful-References#imit-identity-standards')} external>
                      learn more here
                    </Link>
                  </div>
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
              <Link href={formatWikiURL()} external>
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
