import styled from 'styled-components';
import Loader from 'react-loader-spinner';
import Form from 'form-components/GovForm';
import getSchema from 'schemas/urls';
import 'react-loader-spinner/dist/loader/css/react-spinner-loader.css';
import { RequestsContext } from 'pages/my-requests';
import { useContext, useEffect, useState } from 'react';
import { RequestReducerState } from 'reducers/requestReducer';
import { getRequestUrls, getPropertyName } from 'utils/helpers';
import ArrayFieldTemplate from 'form-components/SmallArrayFieldTemplate';
import { updateRequest } from 'services/request';
import FormButtons from 'form-components/FormButtons';
import { Request } from 'interfaces/Request';

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

const Panel = () => {
  const { state, dispatch } = useContext(RequestsContext);
  const {
    editingRequest,
    requests,
    selectedRequest: sRequest,
    loadingInstallation,
    installation,
    env,
    updatingUrls,
  } = state as RequestReducerState;

  const selectedRequest = (sRequest || {}) as Request;

  const redirectUrls = getRequestUrls(selectedRequest, env);

  console.log(selectedRequest, redirectUrls);

  const [schema, setSchema] = useState({});

  const handleCancel = () => {
    dispatch({ type: 'setEditingRequest', payload: false });
  };

  const handleSubmit = async (e: any, schema: any) => {
    const { validRedirectUrls = {} } = selectedRequest;
    const { dev: devRedirectUrls, test: testRedirectUrls, prod: prodRedirectUrls } = validRedirectUrls;
    dispatch({ type: 'setUpdatingUrls', payload: true });
    dispatch({ type: 'updateRequest', payload: { id: selectedRequest.id, urls: e.formData[getPropertyName(env)] } });
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
    const validRedirectUrls = getRequestUrls(selectedRequest, env);
    setSchema(getSchema(env, validRedirectUrls));
  }, [env, requests, selectedRequest, updatingUrls]);

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
            <StyledList>{redirectUrls && redirectUrls.map((url: any) => <li key={url}>{url}</li>)}</StyledList>
          </div>
        )}
        {(loadingInstallation || installation) && (
          <JsonContainer>
            <p>JSON Client</p>
            {loadingInstallation && <Loader type="Grid" color="#000" height={50} width={50} visible />}
            {installation && JSON.stringify(installation)}
          </JsonContainer>
        )}
      </Container>
    </>
  );
};

export default Panel;
