import React from 'react';
import styled from 'styled-components';
import MyDashboardLayout from 'page-partials/my-dashboard/Layout';
import { formatWikiURL } from '@app/utils/text';

const Container = styled.div`
  background-color: #e4f2fe;
  padding: 2.2rem;
  font-size: 1.6rem;

  h1 {
    font-size: 2.1rem;
    color: #000;
  }

  a {
    color: #0139ff;
  }
`;

function MyIntegrations() {
  return (
    <MyDashboardLayout tab="s2g">
      <Container>
        <h1>Keycloak Upgrade from Silver to Gold</h1>
        <p>
          At this time, Silver realms are being retired on January 30, 2023*.
          <br />
          Projects on these realms will no longer be supported by the SSO team.
        </p>
        <p>To learn more about our upgrade:</p>
        <ul>
          <li>
            Visit out{' '}
            <a href={formatWikiURL()} target="_blank" rel="noreferrer" title="Wiki">
              wiki
            </a>{' '}
            and our{' '}
            <a href={formatWikiURL()} target="_blank" rel="noreferrer" title="How to Docs">
              How to Docs
            </a>
          </li>
          <li>
            Complete our{' '}
            <a
              href="https://docs.google.com/forms/d/1MMPeMB0A2076xkXIZRaErAwZe9QDsSwSAWqe-uvm3ys"
              target="_blank"
              rel="noreferrer"
              title="Change Impact Assessment"
            >
              Change Impact Assessment
            </a>{' '}
            (if you have not completed yet)
          </li>
          <li>
            <a href="mailto:bcgov.sso@gov.bc.ca" title="Pathfinder SSO">
              Contact the SSO Pathfinder team
            </a>{' '}
            if you have any questions
          </li>
        </ul>
      </Container>
    </MyDashboardLayout>
  );
}

export default MyIntegrations;
