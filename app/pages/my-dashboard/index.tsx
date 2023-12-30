import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

function MyDashboard() {
  const router = useRouter();

  let url = '/my-dashboard/integrations';

  useEffect(() => {
    if (router.query.integrationFailedMessageModal) {
      url = url + `?integrationFailedMessageModal=${router.query.integrationFailedMessageModal}`;
    }
    router.replace(url);
  }, []);

  return null;
}

export default MyDashboard;
