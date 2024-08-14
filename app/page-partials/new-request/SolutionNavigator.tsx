import React, { useState } from 'react';
import styled from 'styled-components';
import noop from 'lodash/noop';
import CenteredModal from 'components/CenteredModal';
import RadioButton from '@button-inc/bcgov-theme/RadioButton';
import Link from '@button-inc/bcgov-theme/Link';

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
    <CenteredModal
      id={id}
      openModal={open}
      handleClose={handleCancel}
      onConfirm={handleClose}
      confirmText="Save and Close"
      title="Choosing between Public and Confidential Client types"
      content={
        <>
          <fieldset>
            <legend>Which type of application are you using?</legend>
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
          </fieldset>

          {type === 'server' && (
            <fieldset>
              <br />
              <legend>Does the framework require a client secret, or have an option for a secret?</legend>
              <Radio name="secret" label="Yes" checked={secret === true} onChange={() => setSecret(true)} />
              <Radio name="secret" label="No" checked={secret === false} onChange={() => setSecret(false)} />
            </fieldset>
          )}

          {complete && (
            <>
              <br />
              <>
                {useSecret ? (
                  <>
                    <h4>Recommendation: Confidential Client</h4>
                    <p>
                      With a confidential client, the back-end component securely stores an application secret that
                      allows it to communicate with the KeyCloak server to facilitate the OIDC authentication process.
                    </p>
                  </>
                ) : (
                  <>
                    <h4>Recommendation: Public Client</h4>
                    <p>
                      Public clients do not use back-end secrets, but use a secure OAuth flow called PKCE, or Proof Key
                      for Code Exchange. Based on your responses, the public client may better support your
                      application's architecture.
                    </p>
                  </>
                )}
              </>
              <>
                <p>
                  To learn more about the difference between confidential and public clients, and to understand PKCEs
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
        </>
      }
    ></CenteredModal>
  );
}

export default SolutionNavigator;
