import React, { useState, useEffect } from 'react';
import VerticalLayout from 'page-partials/my-dashboard/VerticalLayout';
import OrganizationList from 'page-partials/my-dashboard/OrganizationList';
import OrganizationInfoTabs from 'page-partials/my-dashboard/OrganizationInfoTabs';
import { getOrganizations } from 'services/organization';
import { PageProps } from 'interfaces/props';
import { Organization } from 'interfaces/organization';

function MyOrganizations({ session }: PageProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  const loadOrganizations = async () => {
    setLoading(true);
    const [result, err] = await getOrganizations();
    setHasError(!!err);
    setOrganizations(result || []);
    setLoading(false);
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    if (organizations.length === 0) setOrganization(null);
    else if (!organization || !organizations.find((org) => org.id === organization.id)) {
      setOrganization(organizations[0]);
    }
  }, [organizations]);

  return (
    <VerticalLayout
      tab="organizations"
      leftPanel={() => (
        <OrganizationList
          currentUser={session}
          organizations={organizations}
          loading={loading}
          hasError={hasError}
          setOrganization={setOrganization}
          activeOrganizationId={organization?.id}
          reload={loadOrganizations}
        />
      )}
      rightPanel={() => organization && <OrganizationInfoTabs organization={organization} currentUser={session} />}
    />
  );
}

export default MyOrganizations;
