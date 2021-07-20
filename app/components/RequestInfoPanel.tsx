import { useContext, useEffect, useState } from 'react';
import Modal from '@button-inc/bcgov-theme/Modal';
import styled from 'styled-components';
import Loader from 'react-loader-spinner';
import Form from 'form-components/GovForm';
import getSchema from 'schemas/urls';
import { RequestsContext } from 'pages/my-requests';
import { RequestReducerState } from 'reducers/requestReducer';
import { getPropertyName } from 'utils/helpers';
import ArrayFieldTemplate from 'form-components/SmallArrayFieldTemplate';
import { updateRequest } from 'services/request';
import FormButtons from 'form-components/FormButtons';
import InstallationModal from './InstallationModal';
import { ClientRequest } from 'interfaces/Request';
import type { Environment } from 'interfaces/types';

const StyledList = styled.ul`
  list-style-type: none;
  margin: 0;
  & > li {
    border-bottom: 1px solid grey;
  }
`;

const Container = styled.div`
  padding: 10px;
`;

const RequestInfoPanel = ({ panelEnv, environment }: { panelEnv: Environment; environment: Environment }) => {
  const { state, dispatch } = useContext(RequestsContext);
  const { editingRequest, requests, selectedRequest: sRequest, updatingUrls } = state as RequestReducerState;

  const selectedRequest = (sRequest || {}) as ClientRequest;

  // @ts-ignore
  const redirectUris = selectedRequest[getPropertyName(environment)];
  const [schema, setSchema] = useState({});

  const handleCancel = () => {
    dispatch({ type: 'setEditingRequest', payload: false });
  };

  const handleSubmit = async (e: any, schema: any) => {
    dispatch({ type: 'setUpdatingUrls', payload: true });
    dispatch({
      type: 'updateRequest',
      payload: { ...e.formData, id: selectedRequest.id },
    });

    const result = await updateRequest(
      {
        ...e.formData,
        id: selectedRequest.id,
      },
      selectedRequest
    );
    dispatch({ type: 'setUpdatingUrls', payload: false });
    dispatch({ type: 'setEditingRequest', payload: false });
  };

  // TODO: slight ui glitch where panel re-renders with old schema before useEffect runs on submission
  useEffect(() => {
    // @ts-ignore
    const validRedirectUris = selectedRequest[getPropertyName(environment)];
    const schema = getSchema(environment, validRedirectUris);
    setSchema(getSchema(environment, validRedirectUris));
  }, [environment, requests, selectedRequest, updatingUrls]);

  if (!selectedRequest) return null;

  return (
    <>
      <Container>
        {editingRequest ? (
          <div>
            <p>Urls</p>
            <Form
              schema={schema}
              ArrayFieldTemplate={ArrayFieldTemplate}
              onSubmit={(e: any) => handleSubmit(e, schema)}
            >
              <FormButtons
                show={true}
                loading={updatingUrls || false}
                text={{ continue: 'Submit', back: 'Cancel' }}
                handleBackClick={handleCancel}
              />
            </Form>
          </div>
        ) : (
          <div>
            <p>Urls</p>
            {redirectUris?.length > 0 ? (
              <StyledList>
                {redirectUris.map((url: any) => (
                  <li key={url}>{url}</li>
                ))}
              </StyledList>
            ) : (
              <span>No Urls</span>
            )}

            {selectedRequest.id && selectedRequest.status === 'completed' && (
              <InstallationModal
                requestId={selectedRequest.id}
                panelEnv={panelEnv}
                environment={environment}
              ></InstallationModal>
            )}
          </div>
        )}
      </Container>
    </>
  );
};

export default RequestInfoPanel;
