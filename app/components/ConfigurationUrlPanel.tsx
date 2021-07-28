import React, { useContext, useEffect, useState } from 'react';
import styled from 'styled-components';
import Form from 'form-components/GovForm';
import redirectUrisSchema from 'schemas/redirect-uris';
import { RequestsContext } from 'pages/my-requests';
import { RequestReducerState } from 'reducers/requestReducer';
import { getRedirectUrlPropertyNameByEnv } from 'utils/helpers';
import ArrayFieldTemplate from 'form-components/ArrayFieldTemplate';
import { updateRequest } from 'services/request';
import FormButtons from 'form-components/FormButtons';
import { ClientRequest } from 'interfaces/Request';
import { $setEditingRequest, $setUpdatingUrls, $updateRequest } from 'dispatchers/requestDispatcher';
import type { Environment } from 'interfaces/types';

const StyledList = styled.ul`
  list-style-type: none;
  margin: 0;
  & > li.url {
    border-bottom: 1px solid grey;
  }
`;

const Container = styled.div`
  padding: 10px;
`;

const Separator = styled.span`
  margin-left: 5px;
  margin-right: 5px;
`;

const PanelTitle = styled.span`
  font-size: 1rem;
  color: #3e3e3e;
`;

const LeftTitle = styled.span`
  color: #777777;
  font-size: 20px;
`;

interface EnvironmentOption {
  name: Environment;
  display: string;
}

const environments: EnvironmentOption[] = [
  {
    name: 'dev',
    display: 'Development',
  },
  {
    name: 'test',
    display: 'Test',
  },
  {
    name: 'prod',
    display: 'Production',
  },
];

const ConfigurationUrlPanel = () => {
  const { state, dispatch } = useContext(RequestsContext);
  const { editingRequest, requests, selectedRequest: sRequest, updatingUrls } = state as RequestReducerState;

  const selectedRequest = (sRequest || {}) as ClientRequest;

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
      dispatch($updateRequest({ ...event.formData, id: selectedRequest.id }));
    }

    dispatch($setUpdatingUrls(false));
    dispatch($setEditingRequest(false));
  };

  return (
    <>
      <Container>
        {editingRequest ? (
          <Form
            schema={redirectUrisSchema}
            ArrayFieldTemplate={ArrayFieldTemplate}
            formData={selectedRequest}
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
            {environments.map((env) => {
              const redirectUris = selectedRequest[getRedirectUrlPropertyNameByEnv(env.name)] || [];

              return (
                <React.Fragment key={env.name}>
                  <LeftTitle>{env.display}</LeftTitle>
                  <StyledList>
                    {redirectUris.length > 0 ? (
                      redirectUris.map((url: any) => (
                        <li key={url} className="url">
                          {url}
                        </li>
                      ))
                    ) : (
                      <li>No valid redirect URIs</li>
                    )}
                  </StyledList>
                  <br />
                </React.Fragment>
              );
            })}
          </>
        )}
      </Container>
    </>
  );
};

export default ConfigurationUrlPanel;
