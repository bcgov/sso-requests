import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

function MyDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/my-dashboard/integrations');
  }, []);

  return null;
}

export default MyDashboard;
