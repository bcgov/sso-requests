import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { isNil } from 'lodash';
import FormTemplate from 'form-components/FormTemplate';
import ResponsiveContainer, { defaultRules } from 'components/ResponsiveContainer';
import { withTopAlert, TopAlert } from 'layout/TopAlert';
import { getRequest } from 'services/request';
import { Integration } from 'interfaces/Request';
import { LoggedInUser } from 'interfaces/team';
import PageLoader from 'components/PageLoader';

const requestPageRules = defaultRules.map((rule) => (rule.width === 1127 ? { ...rule, marginTop: 20 } : rule));

interface Props {
  session: LoggedInUser;
  enable_gold: boolean;
  alert: TopAlert;
}

function RequestEdit({ session, enable_gold, alert }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [request, setRequest] = useState<Integration | null>(null);
  const { rid } = router.query;

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      const [data] = await getRequest(rid as string);
      if (isNil(data)) {
        setRequest(null);
      } else {
        if (enable_gold && data.serviceType !== 'gold') {
          alert.show({
            variant: 'info',
            closable: true,
            children: (
              <span>
                You are editing a project that is in a Silver realm, which will be retired on Jan. 30 2023*. Please{' '}
                <a
                  href="https://chat.developer.gov.bc.ca/channel/sso"
                  target="_blank"
                  rel="noreferrer"
                  title="SSO Team"
                  className="strong"
                >
                  contact the SSO team
                </a>{' '}
                to upgrade to Gold.
              </span>
            ),
          });
        }
        setRequest(data);
      }
      setLoading(false);
    };
    getData();

    return () => {
      alert.hide();
    };
  }, [rid]);

  return (
    <ResponsiveContainer rules={requestPageRules}>
      {loading ? <PageLoader /> : <FormTemplate currentUser={session || {}} request={request} />}
    </ResponsiveContainer>
  );
}

export default withTopAlert(RequestEdit);
