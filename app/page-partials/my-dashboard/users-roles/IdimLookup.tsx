import React, { useState, forwardRef, useEffect, useImperativeHandle } from 'react';
import { faExclamationCircle, faEye, faDownload, faLock } from '@fortawesome/free-solid-svg-icons';
import Table from 'components/Table';
import { ActionButton, ActionButtonContainer } from 'components/ActionButtons';
import GenericModal, { ModalRef, emptyRef } from 'components/GenericModal';
import { searchIdirUsers, importIdirUser, IdirUser } from 'services/bceid-webservice';

const idpOptions = [
  { value: 'idir', label: 'IDIR' },
  // { value: 'bceidbasic', label: 'BCeID Basic' },
  // { value: 'bceidbusiness', label: 'BCeID Business' },
];

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

  let content = null;
  if (!searched) {
    content = (
      <tr>
        <td colSpan={10} className="text-center">
          You have not searched for any users yet.
        </td>
      </tr>
    );
  } else if (rows.length > 0) {
    content = rows.map((row) => {
      return (
        <tr key={row.guid}>
          <td>{row.individualIdentity.name.firstname}</td>
          <td>{row.individualIdentity.name.surname}</td>
          <td>{row.contact.email}</td>
          <td>{row.userId}</td>
          <td>
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
          </td>
        </tr>
      );
    });
  } else {
    content = (
      <tr>
        <td colSpan={10} className="text-center">
          The user you searched for does not exist. Please try again, by entering the full search criteria.
        </td>
      </tr>
    );
  }

  return (
    <Table
      key={`${key}-${searchKey}`}
      variant="mini"
      searchLocation="right"
      filters={[
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
      headers={[{ label: 'First name' }, { label: 'Last Name' }, { label: 'Email' }, { label: 'IDIR username' }]}
      searchKey={searchKey}
      searchPlaceholder="Enter search criteria"
      onSearch={handleSearch}
      onEnter={handleSearch}
      loading={loading}
      totalColSpan={20}
      searchColSpan={10}
      filterColSpan={10}
    >
      {content}
    </Table>
  );
}

export default forwardRef(IdimLookup);
