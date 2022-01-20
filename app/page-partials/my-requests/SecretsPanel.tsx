import React, { useState } from 'react';
import styled from 'styled-components';
import { getRequestedEnvironments } from 'utils/helpers';
import { Request } from 'interfaces/Request';
import { EnvironmentOption } from 'interfaces/form';
import { withTopAlert } from 'layout/TopAlert';
import Button from '@button-inc/bcgov-theme/Button';
import CenteredModal from 'components/CenteredModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { changeClientSecret } from 'services/keycloak';

const TopMargin = styled.div`
  height: var(--field-top-spacing);
`;

const LeftTitle = styled.span`
  color: #000;
  font-size: 1.1rem;
  font-weight: bold;
`;

const PaddedIcon = styled(FontAwesomeIcon)`
  margin-right: 20px;
`;

const StyledP = styled.div`
  margin-bottom: 5px;
  display: flex;
  align-items: center;
`;

const StyledHr = styled.hr`
  background-color: black;
`;

interface Props {
  selectedRequest: Request;
  alert: any;
}

const ConfigurationUrlPanel = ({ selectedRequest, alert }: Props) => {
  const [activeEnv, setActiveEnv] = useState<EnvironmentOption | null>(null);
  const requestedEnvironments = getRequestedEnvironments(selectedRequest);

  const openModal = (env: EnvironmentOption) => {
    setActiveEnv(env);
    window.location.hash = 'confirm-new-secret';
  };

  const handleSecretChange = async () => {
    const [result, err] = await changeClientSecret(selectedRequest.id, activeEnv?.name || null);
    const variant = err ? 'danger' : 'success';
    const content = err ? 'Failed to regenerate secret' : 'Client Secret Successfully Updated';
    alert.show({
      variant,
      fadeOut: 10000,
      closable: true,
      content,
    });
    window.location.hash = '#';
    console.log(result, err);
  };

  const modalContents = (
    <>
      <StyledP>
        <PaddedIcon icon={faExclamationTriangle} color="black" title="Warning" size="2x" />
        <strong>You&apos;re About to Change Your Client Secret for Your {activeEnv?.display} Environment.</strong>{' '}
      </StyledP>
      <StyledHr />
      <ul>
        <li>
          Once you change your secret, your previous secret will no longer be valid for any applications using it.
        </li>
        <li>
          This means you will need to update any applications using this client with the new JSON details before they
          are functional again.
        </li>
      </ul>
    </>
  );

  return (
    <>
      <>
        <TopMargin />
        {requestedEnvironments.map((env) => (
          <React.Fragment key={env.name}>
            <LeftTitle>{env.display}: </LeftTitle>
            {!selectedRequest.publicAccess && (
              <>
                <br />
                <Button type="button" onClick={() => openModal(env)}>
                  {`Change your client secret`}
                </Button>
              </>
            )}
            <br />
            <br />
          </React.Fragment>
        ))}
      </>
      <CenteredModal
        id={`confirm-new-secret`}
        content={modalContents}
        onConfirm={handleSecretChange}
        icon={faExclamationTriangle}
        title="You're About to Change Your Client Secret"
        closable
      />
    </>
  );
};

export default withTopAlert(ConfigurationUrlPanel);
