import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import noop from 'lodash/noop';
import MiddleModal from 'components/MiddleModal';
import Button from '@button-inc/bcgov-theme/Button';
import RadioButton from '@button-inc/bcgov-theme/RadioButton';
import Modal from '@button-inc/bcgov-theme/Modal';
import Link from '@button-inc/bcgov-theme/Link';

const H2 = styled.h2`
  margin: 0;
`;

const H3Large = styled.h3`
  font-size: 20px;
`;

const JustifyContent = styled.div`
  display: flex;
  justify-content: space-between;
`;

const Radio = styled(RadioButton)`
  margin-bottom: 10px;
`;

interface Props {
  id: string;
  open: boolean;
  onChange?: (val: string) => void;
}

function SolutionNavigator({ id, open, onChange = noop }: Props) {
  const [type, setType] = useState('server');
  const [secret, setSecret] = useState<boolean | null>(null);

  useEffect(() => {
    window.location.hash = open ? id : '#';
  }, [open]);

  const close = () => {
    setType('server');
    setSecret(null);
    window.location.hash = '#';
  };

  const handleCancel = async () => {
    onChange('cancel');
    close();
  };

  const handleClose = async () => {
    onChange(type === 'server' && secret === true ? 'confidential' : 'public');
    close();
  };

  const complete = type !== 'server' || secret !== null;
  const useSecret = complete && type === 'server' && secret === true;

  return (
    <MiddleModal id={id}>
      <Modal.Header>
        <H2>Choosing between Public and Confidential Client types</H2>
      </Modal.Header>
      <Modal.Content>
        <h3>Which type of application are you using?</h3>
        <Radio
          name="type"
          label="Server-side (ex. .Net, Java, PHP)"
          checked={type === 'server'}
          onChange={() => setType('server')}
        />
        <Radio
          name="type"
          label="Javascript (ex. Single Page Application, Hybrid Mobile)"
          checked={type === 'javascript'}
          onChange={() => setType('javascript')}
        />
        <Radio
          name="type"
          label="Other (ex. Embedded devices, Internet of Things (Apple TV)"
          checked={type === 'other'}
          onChange={() => setType('other')}
        />

        {type === 'server' && (
          <>
            <br />
            <h3>Does the framework require a client secret, or have an option for a secret?</h3>
            <Radio name="secret" label="Yes" checked={secret === true} onChange={() => setSecret(true)} />
            <Radio name="secret" label="No" checked={secret === false} onChange={() => setSecret(false)} />
          </>
        )}

        {complete && (
          <>
            <br />
            <>
              {useSecret ? (
                <>
                  <H3Large>Recommendation: Confidential Client</H3Large>
                  <p>
                    Based on your response, we recommend that you use a <strong>confidential client.</strong>{' '}
                    Confidential clients have back-end components that securely store an application's secret and use a
                    secure OAuth flow called PKCE, or Proof Key for Code Exchange.
                  </p>
                </>
              ) : (
                <>
                  <H3Large>Recommendation: Public Client</H3Large>
                  <p>
                    Public clients do not use back-end secrets, but use a secure OAuth flow called PKCE, or Proof Key
                    for Code Exchange. Based on your responses, the public client may better support your application's
                    architecture.
                  </p>
                </>
              )}
            </>
            <>
              <p>
                To learn more about the difference between confidential and public clients, and to understand what PKCEs
                better, visit our{' '}
                <Link
                  external
                  href="https://github.com/bcgov/ocp-sso/wiki/Using-Your-SSO-Client#confidential-vs-private-client"
                >
                  wiki page.
                </Link>
              </p>
            </>
          </>
        )}

        <br />

        <JustifyContent>
          <Button type="submit" variant="primary-inverse" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" onClick={handleClose} disabled={!complete}>
            Save and Close
          </Button>
        </JustifyContent>
      </Modal.Content>
    </MiddleModal>
  );
}

export default SolutionNavigator;
