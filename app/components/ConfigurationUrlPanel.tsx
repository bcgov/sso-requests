import React, { useContext, useState } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import Form from 'form-components/GovForm';
import redirectUrisSchema from 'schemas/redirect-uris';
import { RequestsContext } from 'pages/my-requests';
import { RequestReducerState } from 'reducers/requestReducer';
import { getRedirectUrlPropertyNameByEnv } from 'utils/helpers';
import { customValidate } from 'utils/shared/customValidate';
import ArrayFieldTemplate from 'form-components/ArrayFieldTemplate';
import { updateRequest } from 'services/request';
import FormButtons from 'form-components/FormButtons';
import { Request } from 'interfaces/Request';
import { $setEditingRequest, $updateRequest } from 'dispatchers/requestDispatcher';
import { environments } from 'utils/constants';

const TopMargin = styled.div`
  height: var(--field-top-spacing);
`;

const LeftTitle = styled.span`
  color: #000;
  font-size: 1.1rem;
`;

interface Props {
  selectedRequest: Request;
}

const ConfigurationUrlPanel = ({ selectedRequest }: Props) => {
  const router = useRouter();
  const [request, setRequest] = useState<Request>(selectedRequest);
  const [loading, setLoading] = useState<boolean>(false);
  const { state, dispatch } = useContext(RequestsContext);
  const { editingRequest } = state as RequestReducerState;

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
    } else {
      setRequest(selectedRequest);
    }

    setLoading(false);
    dispatch($setEditingRequest(false));
  };

  return (
    <>
      {editingRequest ? (
        <Form
          schema={redirectUrisSchema}
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
