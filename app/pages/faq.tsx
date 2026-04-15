import Head from 'next/head';
import ResponsiveContainer, { defaultRules } from 'components/ResponsiveContainer';
import GithubDiscussions from '@app/components/GithubDiscussions';
import { Col, Row } from 'react-bootstrap';

export default function FAQ() {
  return (
    <>
      <Head>
        <meta name="description" content="The request process workflow tool for the RedHat SSO Dev Exchange service" />
      </Head>
      <ResponsiveContainer rules={defaultRules}>
        <Row>
          <Row>
            <Col>
              <GithubDiscussions />
              {/* <FaqItems /> */}
            </Col>
          </Row>
        </Row>
      </ResponsiveContainer>
    </>
  );
}
