import React, { useContext } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import Form from 'form-components/GovForm';
import redirectUrisSchema from 'schemas/redirect-uris';
import { RequestsContext } from 'pages/my-requests';
import { RequestReducerState } from 'reducers/requestReducer';
import { getRedirectUrlPropertyNameByEnv } from 'utils/helpers';
import ArrayFieldTemplate from 'form-components/ArrayFieldTemplate';
import { updateRequest } from 'services/request';
import FormButtons from 'form-components/FormButtons';
import { Request } from 'interfaces/Request';
import { $setEditingRequest, $setUpdatingUrls, $updateRequest } from 'dispatchers/requestDispatcher';
import { environments } from 'utils/constants';

const TopMargin = styled.div`
  height: var(--field-top-spacing);
`;

const LeftTitle = styled.span`
  color: #000;
  font-size: 1.1rem;
`;

const ConfigurationUrlPanel = () => {
  const router = useRouter();
  const { state, dispatch } = useContext(RequestsContext);
  const { editingRequest, selectedRequest: sRequest, updatingUrls } = state as RequestReducerState;

  const selectedRequest = (sRequest || {}) as Request;

  const handleCancel = () => {
    dispatch($setEditingRequest(false));
  };

  const handleSubmit = async (event: any) => {
    dispatch($setUpdatingUrls(true));

    const [data, err] = await updateRequest(
      {
        ...event.formData,
        id: selectedRequest.id,
      },
      true,
    );

    if (!err) {
      dispatch($updateRequest(data));
      router.push({
        pathname: '/my-requests',
        query: { id: selectedRequest.id, mode: 'edit' },
      });
    }

    dispatch($setUpdatingUrls(false));
    dispatch($setEditingRequest(false));
  };

  return (
    <>
      {editingRequest ? (
        <Form
          schema={redirectUrisSchema}
          ArrayFieldTemplate={ArrayFieldTemplate}
          formData={selectedRequest}
          disabled={updatingUrls}
          onSubmit={handleSubmit}
        >
          <FormButtons
            show={true}
            loading={updatingUrls || false}
            text={{ continue: 'Submit', back: 'Cancel' }}
            handleBackClick={handleCancel}
          />
        </Form>
      ) : (
        <>
          <TopMargin />
          {environments.map((env) => {
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
              </React.Fragment>
            );
          })}
        </>
      )}
    </>
  );
};

export default ConfigurationUrlPanel;
