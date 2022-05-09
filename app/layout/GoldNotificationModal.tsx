import React, { useState, useEffect, useContext, ChangeEvent } from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@bcgov-sso/common-react-components';
import CenteredModal from 'components/CenteredModal';
import { getProfile, updateProfile } from 'services/user';
import { SessionContext, SessionContextInterface } from 'pages/_app';

const Content = styled.div`
  font-size: 1.2rem;
  display: flex;

  & > div:first-child {
    color: red;
    font-size: 2rem;
    width: 120px;
  }

  & > div:nth-child(2) {
    & > p:first-child {
      color: red;
      font-weight: bold;
    }
  }
`;

const modalId = 'gold-notification';
const impactAssessmentUrl = 'https://docs.google.com/forms/d/1MMPeMB0A2076xkXIZRaErAwZe9QDsSwSAWqe-uvm3ys';

function GoldNotificationModal(): any {
  const context = useContext<SessionContextInterface | null>(SessionContext);
  const { user, session, enableGold } = context || {};

  const openModal = async () => {
    if (!enableGold || !session || !user) return;

    if (
      !session.isAdmin &&
      !user.hasReadGoldNotification &&
      user.integrations?.find((integration: any) => integration.serviceType === 'silver')
    ) {
      window.location.hash = modalId;
    }
  };

  useEffect(() => {
    if (session && user) openModal();
  }, [user]);

  const handleClose = async () => {
    await updateProfile({ hasReadGoldNotification: true });
    window.location.hash = '#';
  };

  const modalContents = (
    <>
      <Content>
        <div>
          <FontAwesomeIcon icon={faExclamationCircle} size="lg"></FontAwesomeIcon>
        </div>
        <div>
          <p>
            At this time, the Silver realms are being retired on Jan. 30 2023*. Projects on these realms will no longer
            be supported by the SSO team.
          </p>

          <p>
            Please complete a <span className="strong">Change Impact Assessment</span>, for each of your projects in the
            Silver realms.
          </p>
        </div>
      </Content>
      <div className="text-center">
        <Button variant="primary" type="button" onClick={() => window.open(impactAssessmentUrl, '_blank')}>
          Complete Change Impact Assessment
        </Button>
      </div>
    </>
  );

  return (
    <>
      <CenteredModal
        id={modalId}
        content={modalContents}
        showCancel={false}
        showConfirm={false}
        onClose={handleClose}
        icon={faExclamationCircle}
        title="Please upgrade from Silver to Gold"
        closable
      />
    </>
  );
}

export default GoldNotificationModal;
