import React, { useState, useEffect, useContext, ChangeEvent } from 'react';
import styled from 'styled-components';
import Input from '@button-inc/bcgov-theme/Input';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';
import CenteredModal from 'components/CenteredModal';
import { withTopAlert, TopAlert } from 'layout/TopAlert';
import { SessionContext, SessionContextInterface } from 'pages/_app';
import { getProfile, updateProfile } from 'services/user';
import validator from 'validator';

interface Props {
  children: any;
  alert: TopAlert;
}

const Content = styled.div`
  color: #000;
`;

const ErrorMessage = styled.div`
  color: #ff0000;
`;

function UserProfileModal({ children, alert }: Props): any {
  const [emailError, setEmailError] = useState('');
  const context = useContext<SessionContextInterface | null>(SessionContext);
  const session = context?.session;
  if (!session) return null;

  const [addiEmail, setAddiEmail] = useState<string>('');

  const modalId = 'user-profile';

  const showError = (err: any) =>
    alert.show({
      variant: 'danger',
      fadeOut: 2500,
      closable: true,
      content: err,
    });

  const showSuccess = () =>
    alert.show({
      variant: 'success',
      fadeOut: 2500,
      closable: true,
      content: `Your additional email has successfully been updated`,
    });

  const getData = async () => {
    const [data, err] = await getProfile();
    if (err) {
      console.error(err);
      showError(err);
    } else if (data) {
      setAddiEmail(data.additionalEmail || '');
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const handleConfirm = async () => {
    if (addiEmail.length > 0 && !validator.isEmail(addiEmail)) {
      setEmailError('Please provide a valid email address');
      return;
    }

    const [data, err] = await updateProfile({ additionalEmail: addiEmail });
    if (err) {
      console.error(err);
      showError(err);
    } else if (data) {
      showSuccess();
    }

    window.location.hash = '#';
  };

  const openModal = () => (window.location.hash = modalId);

  const handleAddiEmail = (event: ChangeEvent<HTMLInputElement>) => {
    if (validator.isEmail(event.target.value)) {
      setEmailError('');
    }

    setAddiEmail(event.target.value);
  };

  const displayName = `${session?.given_name} ${session?.family_name}`;
  const modalContents = (
    <Content>
      <Input label="Name" fullWidth={true} value={displayName} disabled={true} />
      <br />
      <Input label="Default Email" fullWidth={true} value={session?.email} disabled={true} />
      <br />
      <Input
        type="email"
        label="Additional Email"
        fullWidth={true}
        maxLength="100"
        value={addiEmail}
        onChange={handleAddiEmail}
      />
      {emailError && <ErrorMessage>{emailError}</ErrorMessage>}
    </Content>
  );

  return (
    <>
      {children(modalId, openModal)}
      <CenteredModal
        id={modalId}
        content={modalContents}
        onConfirm={handleConfirm}
        icon={faUserCircle}
        title="My Profile"
        confirmText="Save"
        skipCloseOnConfirm={true}
        closable
      />
    </>
  );
}

export default withTopAlert(UserProfileModal);
