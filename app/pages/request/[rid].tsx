import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import FormTemplate from 'form-components/FormTemplate';
import ResponsiveContainer, { defaultRules } from 'components/ResponsiveContainer';
import { getRequest } from 'services/request';
import Loader from 'react-loader-spinner';
import styled from 'styled-components';

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
}

function Request({ currentUser }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [request, setRequest] = useState<Request | null>(null);
  const { rid } = router.query;

  useEffect(() => {
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
        <FormTemplate currentUser={currentUser || {}} request={request} />
      )}
    </ResponsiveContainer>
  );
}

export default Request;
