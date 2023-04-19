import React, { useState, forwardRef, useEffect } from 'react';
import { faEye, faDownload } from '@fortawesome/free-solid-svg-icons';
import Table from 'components/TableNew';
import { ActionButton, ActionButtonContainer } from 'components/ActionButtons';
import { ModalRef } from 'components/GenericModal';
import { searchIdirUsers, importIdirUser, IdirUser } from 'services/bceid-webservice';

const idpOptions = [{ value: 'idir', label: 'IDIR' }];

const propertyOptions = [
  { value: 'firstName', label: 'First Name', allowed: ['idir'] },
  { value: 'lastName', label: 'Last Name', allowed: ['idir'] },
  { value: 'email', label: 'Email', allowed: ['idir', 'bceidbasic', 'bceidbusiness'] },
  { value: 'userId', label: 'Username', allowed: ['idir', 'bceidbasic', 'bceidbusiness'] },
  { value: 'guid', label: 'IDP GUID', allowed: ['bceidbasic', 'bceidbusiness'] },
];

interface ModalCurrentRef {
  current: ModalRef;
}

interface Props {
  key: string;
  idp: string;
  property: string;
  search: string;
  parentModalRef: ModalCurrentRef;
  infoModalRef: ModalCurrentRef;
}

function IdimLookup({ key, idp, property, search, infoModalRef, parentModalRef }: Props, ref: any) {
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<IdirUser[]>([]);
  const [selectedIdp, setSelectedIdp] = useState<string>('');
  const [selectedProperty, setSelectedProperty] = useState<string>(property);
  const [searchKey, setSearchKey] = useState<string>(search);

  useEffect(() => {
    setSelectedIdp(idp);
  }, [idp]);

  useEffect(() => {
    console.log(selectedIdp);
  }, [selectedIdp]);

  useEffect(() => {
    if (!selectedIdp) return;

    const currentPropertyOption = propertyOptions.find((v) => v.value === selectedProperty);
    const isCurrentPropertyAllowed = currentPropertyOption?.allowed.includes(selectedIdp);

    if (!isCurrentPropertyAllowed) {
      const firstAllowedProperty = propertyOptions.find((v) => v.allowed.includes(selectedIdp));
      setSelectedProperty(firstAllowedProperty?.value || '');
      setSearchKey('');
    } else {
      handleSearch(searchKey, selectedProperty);
    }
  }, [selectedIdp]);

  const handleSearch = async (searchKey: string, field = selectedProperty) => {
    console.log(field);

    if (searchKey.length < 2) return;

    setLoading(true);
    setRows([]);
    setSearched(true);

    const [data, err] = await searchIdirUsers({
      field,
      search: searchKey,
    });

    if (data) setRows(data);
    setLoading(false);
  };

  const handleImport = async (data: IdirUser) => {
    await importIdirUser({ guid: data.guid, userId: data.userId });
    parentModalRef.current.close({ idp: selectedIdp, guid: data.guid });
  };

  return (
    <Table
      searchPlaceholder="Enter search criteria"
      variant="mini"
      headers={[
        {
          accessor: 'firstName',
          Header: 'First name',
        },
        {
          accessor: 'lastName',
          Header: 'Last Name',
        },
        {
          accessor: 'email',
          Header: 'Email',
        },
        {
          accessor: 'idirUsername',
          Header: 'IDIR username',
        },
        {
          accessor: 'actions',
          Header: '',
          disableSortBy: true,
        },
      ]}
      rowSelectorKey={'guid'}
      data={rows.map((row) => {
        return {
          guid: row.guid,
          firstName: row.individualIdentity.name.firstname,
          lastName: row.individualIdentity.name.surname,
          email: row.contact.email,
          idirUsername: row.userId,
          actions: (
            <ActionButtonContainer>
              <ActionButton
                icon={faEye}
                role="button"
                aria-label="view"
                onClick={() => {
                  infoModalRef.current.open({
                    guid: row.guid,
                    attributes: {
                      username: row.userId,
                      displayName: row.displayName,
                      firstName: row.individualIdentity.name.firstname,
                      middleName: row.individualIdentity.name.middleName,
                      lastName: row.individualIdentity.name.surname,
                      initials: row.individualIdentity.name.initials,
                      email: row.contact.email,
                      telephone: row.contact.telephone,
                      company: row.internalIdentity.company,
                      department: row.internalIdentity.department,
                      title: row.internalIdentity.title,
                    },
                    _hash: parentModalRef.current.getId(),
                  });
                }}
                title="View"
                size="lg"
              />
              <ActionButton
                icon={faDownload}
                role="button"
                aria-label="import"
                onClick={() => handleImport(row)}
                title="Import"
                size="lg"
              />
            </ActionButtonContainer>
          ),
        };
      })}
      colfilters={[
        {
          value: selectedIdp,
          multiselect: false,
          onChange: setSelectedIdp,
          options: idpOptions,
        },
        {
          value: selectedProperty,
          multiselect: false,
          onChange: setSelectedProperty,
          options: propertyOptions.filter((v) => v.allowed.includes(selectedIdp)),
        },
      ]}
      showFilters={true}
      loading={loading}
      totalColSpan={20}
      searchColSpan={10}
      headerAlign={'bottom'}
      headerGutter={[5, 0]}
      searchKey={searchKey}
      searchLocation={'right'}
      onSearch={handleSearch}
      onEnter={handleSearch}
      noDataFoundMessage={
        'The user you searched for does not exist. Please try again, by entering the full search criteria.'
      }
    ></Table>
  );
}

export default forwardRef(IdimLookup);
