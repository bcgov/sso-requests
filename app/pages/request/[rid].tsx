import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { isNil } from 'lodash';
import FormTemplate from 'form-components/FormTemplate';
import ResponsiveContainer, { defaultRules } from 'components/ResponsiveContainer';
import { getRequest } from 'services/request';
import { Request } from 'interfaces/Request';
import PageLoader from 'components/PageLoader';
import SolutionNavigator from 'page-partials/new-request/SolutionNavigator';

const requestPageRules = defaultRules.map((rule) => (rule.width === 1127 ? { ...rule, marginTop: 20 } : rule));

interface Props {
  currentUser: {
    email?: string;
  };
}

function RequestEdit({ currentUser }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [request, setRequest] = useState<Request | null>(null);
  const { rid } = router.query;

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      const [data] = await getRequest(parseInt(rid as string));
      if (isNil(data)) {
        setRequest(null);
      } else {
        if (isNil(data.publicAccess)) data.publicAccess = true;
        setRequest(data);
      }
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

export default RequestEdit;
