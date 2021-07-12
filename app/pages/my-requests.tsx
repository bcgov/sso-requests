import React, { useState, useEffect, useContext } from 'react';
import Button from '@button-inc/bcgov-theme/Button';
import styles from 'styles/request.module.css';
import { getRequests } from 'services/request';
import { getInstallation } from 'services/keycloak';
import { Request } from 'interfaces/Request';

function RequestsPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [requests, setRequests] = useState<Request[]>([]);

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      const data = await getRequests();
      setRequests(data || []);
      setLoading(false);
    };

    getData();
  }, []);

  const handleClick = async (request: Request) => {
    const installation = await getInstallation(request.id);
    console.log(installation);
  };

  if (loading) return 'loading...';

  return (
    <main className={styles.container}>
      <table>
        <thead>
          <tr>
            <th>Project Name</th>
            <th>Identity Providers</th>
            <th>Environments</th>
            <th>Submission Time</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => {
            return (
              <tr key={request.id}>
                <td>{request.projectName}</td>
                <td>{request.identityProviders.join(', ')}</td>
                <td>{request.environments.join(', ')}</td>
                <td>{request.createdAt}</td>
                <td>
                  <Button size="small" onClick={() => handleClick(request)}>
                    Download Installation
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}

export default RequestsPage;
