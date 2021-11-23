import React, { useContext, useState } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import Form from 'form-components/GovForm';
import getRedirectUrisSchema from 'schemas/redirect-uris';
import { RequestsContext } from 'pages/my-requests';
import { RequestReducerState } from 'reducers/requestReducer';
import { getRedirectUrlPropertyNameByEnv, parseError, getRequestedEnvironments } from 'utils/helpers';
import { customValidate } from 'utils/shared/customValidate';
import ArrayFieldTemplate from 'form-components/ArrayFieldTemplate';
import { updateRequest } from 'services/request';
import FormButtons from 'form-components/FormButtons';
import { Request } from 'interfaces/Request';
import { EnvironmentOption } from 'interfaces/form';
import { $setEditingRequest, $updateRequest } from 'dispatchers/requestDispatcher';
import { withBottomAlert } from 'layout/BottomAlert';
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
  const router = useRouter();
  const [request, setRequest] = useState<Request>(selectedRequest);
  const [updatingRequest, setUpdatingRequest] = useState<boolean>(false);
  const [activeEnv, setActiveEnv] = useState<EnvironmentOption | null>(null);
  const { state, dispatch } = useContext(RequestsContext);
  const { editingRequest } = state as RequestReducerState;
  const requestedEnvironments = getRequestedEnvironments(selectedRequest);
  const schema = getRedirectUrisSchema(requestedEnvironments);

  const handleCancel = () => {
    dispatch($setEditingRequest(false));
  };

  const handleSubmit = async (event: any) => {
    const newRequest = {
      ...event.formData,
      id: selectedRequest.id,
    };

    setUpdatingRequest(true);
    setRequest(newRequest);

    const [data, err] = await updateRequest(newRequest, true);

    if (!err) {
      dispatch($updateRequest(data));
      setRequest(data as Request);
      router.push({
        pathname: '/my-requests',
        query: { id: selectedRequest.id, mode: 'edit' },
      });
      dispatch($setEditingRequest(false));
    } else {
      setRequest(selectedRequest);
      alert.show({
        variant: 'info',
        fadeOut: 10000,
        closable: true,
        content: parseError(err).message,
      });
    }

    setUpdatingRequest(false);
  };

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
      {editingRequest ? (
        <Form
          schema={schema}
          ArrayFieldTemplate={ArrayFieldTemplate}
          formData={request}
          disabled={updatingRequest}
          onSubmit={handleSubmit}
          liveValidate={true}
          validate={customValidate}
        >
          <FormButtons
            formSubmission={true}
            show={true}
            loading={updatingRequest || false}
            text={{ continue: 'Submit', back: 'Cancel' }}
            handleBackClick={handleCancel}
          />
        </Form>
      ) : (
        <>
          <TopMargin />
          {getRequestedEnvironments(selectedRequest).map((env) => {
            const redirectUris = selectedRequest[getRedirectUrlPropertyNameByEnv(env.name)] || [];

            return (
              <React.Fragment key={env.name}>
                <LeftTitle>{env.display}</LeftTitle>
                <ul>
                  {redirectUris.length > 0 ? (
                    redirectUris.map((url) => (
                      <li key={url} className="url">
                        {url}
                      </li>
                    ))
                  ) : (
                    <li>No valid redirect URIs</li>
                  )}
                </ul>
                {!selectedRequest.publicAccess && (
                  <>
                    <Button type="button" onClick={() => openModal(env)}>
                      {`Change your client secret`}
                    </Button>
                  </>
                )}
                <br />
                <br />
              </React.Fragment>
            );
          })}
        </>
      )}
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

export default withBottomAlert(ConfigurationUrlPanel);
