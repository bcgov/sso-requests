import { useState, forwardRef, useEffect } from 'react';
import { faEye, faDownload } from '@fortawesome/free-solid-svg-icons';
import { ActionButtonContainer } from 'components/ActionButtons';
import { ModalRef } from 'components/GenericModal';
import { searchIdirUsers, importIdirUser, IdirUser } from 'services/bceid-webservice';
import TableNew from '@app/components/TableNew';
import Select from 'react-select';
import { SearchBar } from '@bcgov-sso/common-react-components';
import ActionButton from '@app/components/ActionButton';

const idpOptions = [{ value: 'idir', label: 'IDIR' }];

const propertyOptions = [
  { value: 'givenName', label: 'First Name', allowed: ['idir'] },
  { value: 'surname', label: 'Last Name', allowed: ['idir'] },
  { value: 'mail', label: 'Email', allowed: ['idir', 'bceidbasic', 'bceidbusiness'] },
  { value: 'mailNickname', label: 'Username', allowed: ['idir', 'bceidbasic', 'bceidbusiness'] },
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
  const [selectedIdp, setSelectedIdp] = useState<string>(idp);
  const [selectedProperty, setSelectedProperty] = useState<string>(property);
  const [searchKey, setSearchKey] = useState<string>(search);
  const [importError, setImportError] = useState(false);

  useEffect(() => {
    setSelectedIdp(idp);
  }, [idp]);

  useEffect(() => {
    if (!selectedIdp) return;

    const currentPropertyOption = propertyOptions.find((v) => {
      return v.value === selectedProperty;
    });

    const isCurrentPropertyAllowed = currentPropertyOption?.allowed.includes(selectedIdp);

    if (!isCurrentPropertyAllowed) {
      const firstAllowedProperty = propertyOptions.find((v) => v.allowed.includes(selectedIdp));
      setSelectedProperty(firstAllowedProperty?.value || '');
    }
  }, [selectedIdp, selectedProperty, searchKey]);

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

  const handleImport = async (data: any) => {
    setImportError(false);
    const [_, err] = await importIdirUser({ guid: data?.guid, userId: data?.idirUsername });
    if (err) {
      setImportError(true);
    } else {
      parentModalRef.current.close({ idp: selectedIdp, guid: data.guid });
    }
  };

  return (
    <>
      <div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            {
              key: 'idp',
              value: selectedIdp,
              multiselect: false,
              onChange: setSelectedIdp,
              options: idpOptions,
            },
            {
              key: 'property',
              value: selectedProperty,
              multiselect: false,
              onChange: setSelectedProperty,
              options: propertyOptions.filter((v) => v.allowed.includes(selectedIdp)),
            },
          ].map((filter) => {
            return (
              <div style={{ flex: 1 }} key={filter.key}>
                <Select
                  key={filter.key}
                  value={filter.options.find((option) => option.value === filter.value)}
                  options={filter.options}
                  isMulti={filter.multiselect}
                  placeholder="Select..."
                  onChange={(option: any) => filter.onChange(option ? (option as any).value : '')}
                  isSearchable={true}
                  defaultValue={filter.options[0]}
                />
              </div>
            );
          })}
          <SearchBar
            placeholder="Enter search criteria"
            onChange={(e: any) => setSearchKey(e.target.value)}
            value={searchKey}
            onKeyDown={(e: any) => {
              if (e.key === 'Enter') {
                handleSearch(searchKey);
              }
            }}
          />
          <button
            className="primary"
            type="button"
            onClick={() => handleSearch(searchKey)}
            style={{ padding: '.44rem 1.5rem' }}
          >
            Search
          </button>
        </div>

        <TableNew
          dataTestId="idim-lookup-table"
          variant="mini"
          loading={loading}
          data={rows.map((row) => {
            return {
              guid: row.guid,
              firstName: row.firstName,
              lastName: row.lastName,
              email: row.email,
              idirUsername: row.userId,
            };
          })}
          columns={[
            {
              accessorKey: 'firstName',
              header: 'First name',
            },
            {
              accessorKey: 'lastName',
              header: 'Last Name',
            },
            {
              accessorKey: 'email',
              header: 'Email',
            },
            {
              accessorKey: 'idirUsername',
              header: 'IDIR username',
            },
            {
              accessorKey: 'actions',
              header: '',

              cell: (props) => {
                const row = props.row.original;
                return (
                  <ActionButtonContainer>
                    <ActionButton
                      icon={faEye}
                      role="button"
                      aria-label="view"
                      onClick={() => {
                        infoModalRef.current.open({
                          guid: row.guid,
                          attributes: {
                            username: row.idirUsername,
                            displayName: `${row.firstName} ${row.lastName}`,
                            firstName: row.firstName,
                            lastName: row.lastName,
                            email: row.email,
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
                );
              },
            },
          ]}
          enableGlobalSearch={false}
          noDataFoundMessage={
            searched && (
              <p>The user you searched for does not exist. Please try again, by entering the full search criteria.</p>
            )
          }
          enablePagination={false}
        ></TableNew>
      </div>

      {importError && <p className="text-danger">Failed to import the user. Please try again.</p>}
    </>
  );
}

export default forwardRef(IdimLookup);
