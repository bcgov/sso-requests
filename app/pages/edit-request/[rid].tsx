import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import FormTemplate from 'form-components/FormTemplate';
import ResponsiveContainer, { defaultRules } from 'components/ResponsiveContainer';
import { getRequest } from 'services/request';
import PageLoader from 'components/PageLoader';

const requestPageRules = defaultRules.map((rule) => (rule.width === 1127 ? { ...rule, marginTop: 20 } : rule));

interface Props {
  currentUser: {
    email?: string;
    client_roles?: string[];
  };
}

function Request({ currentUser }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [request, setRequest] = useState<Request | null>(null);
  const { rid } = router.query;
  const isAdmin = currentUser?.client_roles?.includes('sso-admin');

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      const [data, err] = await getRequest(parseInt(rid as string));
      setRequest(data as Request | null);
      setLoading(false);
    };
    getData();
  }, [rid]);

  if (!isAdmin) {
    router.push('/');
    return null;
  }

  return (
    <ResponsiveContainer rules={requestPageRules}>
      {loading ? <PageLoader /> : <FormTemplate currentUser={currentUser || {}} request={request} isAdmin={isAdmin} />}
    </ResponsiveContainer>
  );
}

export default Request;
