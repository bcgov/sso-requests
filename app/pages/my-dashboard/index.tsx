import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

function MyDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace({
      pathname: '/my-dashboard/integrations',
      query: router.query,
    });
  }, []);

  return null;
}

export default MyDashboard;
