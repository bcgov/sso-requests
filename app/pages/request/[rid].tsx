import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import FormTemplate from 'form-components/FormTemplate';
import Container from 'components/Container';
import ResponsiveContainer, { MediaRule, defaultRules } from 'components/ResponsiveContainer';
import { getRequest } from 'services/request';

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

  if (loading) return null;

  return (
    <ResponsiveContainer rules={defaultRules}>
      <Container>
        <FormTemplate currentUser={currentUser || {}} request={request} />
      </Container>
    </ResponsiveContainer>
  );
}

export default Request;
