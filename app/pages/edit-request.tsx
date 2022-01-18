import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import FormTemplate from 'form-components/FormTemplate';
import ResponsiveContainer, { defaultRules } from 'components/ResponsiveContainer';
import { getRequest } from 'services/request';
import PageLoader from 'components/PageLoader';
import { LoggedInUser } from 'interfaces/team';

const requestPageRules = defaultRules.map((rule) => (rule.width === 1127 ? { ...rule, marginTop: 20 } : rule));

interface Props {
  currentUser: LoggedInUser;
}

function Request({ currentUser }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [request, setRequest] = useState<Request | null>(null);
  const { id } = router.query;

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      const [data, err] = await getRequest(parseInt(id as string));
      if (err) await router.push('/admin-dashboard');
      else setRequest(data as Request | null);
      setLoading(false);
    };
    getData();
  }, [id]);

  if (!currentUser.isAdmin) {
    router.push('/');
    return null;
  }

  return (
    <ResponsiveContainer rules={requestPageRules}>
      {loading ? <PageLoader /> : <FormTemplate currentUser={currentUser || {}} request={request} />}
    </ResponsiveContainer>
  );
}

export default Request;
