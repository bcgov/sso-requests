import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import FormTemplate from 'form-components/FormTemplate';
import ResponsiveContainer, { defaultRules } from 'components/ResponsiveContainer';
import { getRequest } from 'services/request';
import Loader from 'react-loader-spinner';
import styled from 'styled-components';
import { ClientRequest } from 'interfaces/Request';

const requestPageRules = defaultRules.map((rule) => (rule.width === 1127 ? { ...rule, marginTop: 20 } : rule));

const LoaderContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;

  & p {
    margin-top: 10px;
  }
`;

interface Props {
  currentUser: {
    email?: string;
  };
  request: ClientRequest;
  setRequest: Function;
}

function Request({ currentUser, request, setRequest }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const { rid } = router.query;

  useEffect(() => {
    if (router.query.newForm) return;
    const getData = async () => {
      setLoading(true);
      const data = await getRequest(parseInt(rid as string));
      setRequest(data as Request | null);
      setLoading(false);
    };
    getData();
  }, [rid]);

  return (
    <ResponsiveContainer rules={requestPageRules}>
      {loading ? (
        <LoaderContainer>
          <Loader type="Grid" color="#000" height={45} width={45} visible />
          <p>Loading information...</p>
        </LoaderContainer>
      ) : (
        <FormTemplate currentUser={currentUser || {}} request={request} setRequest={setRequest} />
      )}
    </ResponsiveContainer>
  );
}

export default Request;
