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
import { $setEditingRequest, $updateRequest } from 'dispatchers/requestDispatcher';
import { withBottomAlert } from 'layout/BottomAlert';
import Button from '@button-inc/bcgov-theme/Button';
import Modal from '@button-inc/bcgov-theme/Modal';
import CenteredModal from 'components/CenteredModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const TopMargin = styled.div`
  height: var(--field-top-spacing);
`;

const LeftTitle = styled.span`
  color: #000;
  font-size: 1.1rem;
`;

const PaddedIcon = styled(FontAwesomeIcon)`
  margin-right: 20px;
`;

const StyledP = styled.p`
  margin-bottom: 5px;
`;

const StyledHr = styled.hr`
  background-color: black;
`;

const CenteredContainer = styled.div`
  text-align: center;
`;

interface Props {
  selectedRequest: Request;
  alert: any;
}

const ConfigurationUrlPanel = ({ selectedRequest, alert }: Props) => {
  const router = useRouter();
  const [request, setRequest] = useState<Request>(selectedRequest);
  const [loading, setLoading] = useState<boolean>(false);
  const { state, dispatch } = useContext(RequestsContext);
  const { editingRequest } = state as RequestReducerState;
  const schema = getRedirectUrisSchema(selectedRequest?.environments as string);

  const handleCancel = () => {
    dispatch($setEditingRequest(false));
  };

  const handleSubmit = async (event: any) => {
    const newRequest = {
      ...event.formData,
      id: selectedRequest.id,
    };

    setLoading(true);
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

    setLoading(false);
  };

  const handleModalClose = () => (window.location.hash = '#');
  const openModal = () => (window.location.hash = 'confirm-new-secret');

  return (
    <>
      {editingRequest ? (
        <Form
          schema={schema}
          ArrayFieldTemplate={ArrayFieldTemplate}
          formData={request}
          disabled={loading}
          onSubmit={handleSubmit}
          liveValidate={true}
          validate={customValidate}
        >
          <FormButtons
            formSubmission={true}
            show={true}
            loading={loading || false}
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
                <br />

                {!selectedRequest.publicAccess && (
                  <>
                    <Button onClick={openModal}>Change your client secret</Button>
                    <CenteredModal id={`confirm-new-secret`}>
                      <Modal.Header>
                        You're About to Change Your Client Secret{' '}
                        <Modal.Close onClick={handleModalClose}>X</Modal.Close>
                      </Modal.Header>
                      <Modal.Content>
                        <StyledP>
                          <PaddedIcon icon={faExclamationTriangle} color="black" title="Warning" size="2x" />
                          <strong>You're About to Change Your Client Secret</strong>{' '}
                        </StyledP>
                        <StyledHr />
                        <ul>
                          <li>
                            Once you change your secret, your previous secret will no longer be valid for any
                            applications using it.
                          </li>
                          <li>
                            This means you will need to update your application with the new JSON details before it is
                            functional again.
                          </li>
                        </ul>
                        <CenteredContainer>
                          <Button>Change Secret</Button>
                        </CenteredContainer>
                      </Modal.Content>
                    </CenteredModal>
                  </>
                )}
              </React.Fragment>
            );
          })}
        </>
      )}
    </>
  );
};

export default withBottomAlert(ConfigurationUrlPanel);
