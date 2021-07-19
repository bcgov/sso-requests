import { useContext, useEffect, useState } from 'react';
import Modal from '@button-inc/bcgov-theme/Modal';
import styled from 'styled-components';
import Loader from 'react-loader-spinner';
import Form from 'form-components/GovForm';
import getSchema from 'schemas/urls';
import { RequestsContext } from 'pages/my-requests';
import { RequestReducerState } from 'reducers/requestReducer';
import { getRequestUrls, getPropertyName } from 'utils/helpers';
import ArrayFieldTemplate from 'form-components/SmallArrayFieldTemplate';
import { updateRequest } from 'services/request';
import FormButtons from 'form-components/FormButtons';
import InstallationModal from './InstallationModal';
import { Request } from 'interfaces/Request';
import type { Environment } from 'interfaces/Environment';

const StyledList = styled.ul`
  list-style-type: none;
  margin: 0;
  & > li {
    border-bottom: 1px solid grey;
  }
`;

const Container = styled.div`
  padding: 10px;
  display: grid;
  grid-template-columns: 1fr 1fr;
`;

const JsonContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const RequestInfoPanel = ({ environment }: { environment: Environment }) => {
  const { state, dispatch } = useContext(RequestsContext);
  const { editingRequest, requests, selectedRequest: sRequest, updatingUrls } = state as RequestReducerState;

  const selectedRequest = (sRequest || {}) as Request;

  const redirectUris = getRequestUrls(selectedRequest, environment);

  console.log(selectedRequest, redirectUris);

  const [schema, setSchema] = useState({});

  const handleCancel = () => {
    dispatch({ type: 'setEditingRequest', payload: false });
  };

  const handleSubmit = async (e: any, schema: any) => {
    const { validRedirectUris } = selectedRequest;
    const { dev: devRedirectUrls, test: testRedirectUrls, prod: prodRedirectUrls } = validRedirectUris;
    dispatch({ type: 'setUpdatingUrls', payload: true });
    dispatch({
      type: 'updateRequest',
      payload: { id: selectedRequest.id, urls: e.formData[getPropertyName(environment)] },
    });

    const result = await updateRequest({
      testRedirectUrls,
      devRedirectUrls,
      prodRedirectUrls,
      ...e.formData,
      id: selectedRequest.id,
    });
    dispatch({ type: 'setUpdatingUrls', payload: false });
    dispatch({ type: 'setEditingRequest', payload: false });
  };

  // TODO: slight ui glitch where panel re-renders with old schema before useEffect runs on submission
  useEffect(() => {
    const validRedirectUris = getRequestUrls(selectedRequest, environment);
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
            <StyledList>{redirectUris && redirectUris.map((url: any) => <li key={url}>{url}</li>)}</StyledList>
          </div>
        )}
        {!editingRequest && selectedRequest.status === 'completed' && (
          <InstallationModal requestId={selectedRequest.id} environment={environment}></InstallationModal>
        )}
      </Container>
    </>
  );
};

export default RequestInfoPanel;
