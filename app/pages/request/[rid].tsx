import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import FormTemplate from 'form-components/FormTemplate';
import ResponsiveContainer, { defaultRules } from 'components/ResponsiveContainer';
import { getRequest } from 'services/request';
import PageLoader from 'components/PageLoader';
import SolutionNavigator from 'page-partials/new-request/SolutionNavigator';

const requestPageRules = defaultRules.map((rule) => (rule.width === 1127 ? { ...rule, marginTop: 20 } : rule));

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
      const [data] = await getRequest(parseInt(rid as string));
      setRequest(data as Request | null);
      setLoading(false);
    };
    getData();
  }, [rid]);

  return (
    <ResponsiveContainer rules={requestPageRules}>
      {loading ? <PageLoader /> : <FormTemplate currentUser={currentUser || {}} request={request} />}
    </ResponsiveContainer>
  );
}

export default Request;
