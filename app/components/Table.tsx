import { Table as StyledTable, SearchBar } from '@bcgov-sso/common-react-components';
import React, { ReactElement, useEffect, useState } from 'react';
import { useTable, usePagination, useFilters, useGlobalFilter, Column, useSortBy, Row, Cell } from 'react-table';
import Grid from '@button-inc/bcgov-theme/Grid';
import Pagination from 'react-bootstrap/Pagination';
import styled from 'styled-components';
import Select from 'react-select';
import SectionHeader from './SectionHeader';
import { faSortDown, faSortUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Option } from 'interfaces/Request';
import noop from 'lodash.noop';
import InfoOverlay from './InfoOverlay';
import ReactPlaceholder from 'react-placeholder/lib';
import { TextBlock } from 'react-placeholder/lib/placeholders';
import { TABLE_ROW_HEIGHT_MINI, TABLE_ROW_SPACING } from 'styles/theme';
import InfiniteScroll from 'react-infinite-scroller';

const InfScroll = InfiniteScroll as unknown as (a: any) => JSX.Element;

const PaginationIcon = styled(FontAwesomeIcon)`
  color: '#000';
`;

const StyledPagination = styled(Pagination)`
  margin: 0 !important;
  & li {
    margin: 0 !important;
  }
`;

const Label = styled.label`
  cursor: pointer;
  font-weight: bold;
  & * {
    font-weight: normal;
  }
`;

const PageInfo = styled.li`
  padding-left: 5px;
  line-height: 40px;
`;

const StyledSelect = styled(Select)`
  width: 150px;
  display: inline-block;
`;

const FiltersContainer = styled.div<{ itemsLength: number }>`
  display: grid;
  grid-template-columns:
    ${(props) => `repeat(${props.itemsLength}, 1fr);`}
    &> * {
    margin-right: 10px;
    white-space: nowrap;
  }
`;

function SelectColumnFilter({ setFilter, options, setValue, gotoPage, defaultValue }: any) {
  return (
    <div data-testid="multi-select-col-filter">
      <Select
        className="basic-multi-select"
        classNamePrefix="select"
        defaultValue={defaultValue}
        onChange={(val) => {
          setFilter('status', val);
          setValue(val);
          gotoPage(0);
        }}
        options={options}
        isMulti
      ></Select>
    </div>
  );
}

export interface TableFilter {
  key?: string;
  value?: string | Option[];
  multiselect?: boolean;
  onChange?: Function;
  options: Option[];
  defaultValue?: string | Option;
  label?: string;
}

export interface PaginationItemsDetailProps {
  pageOptions: number[];
  canPreviousPage: boolean;
  canNextPage: boolean;
  previousPage: () => void;
  nextPage: () => void;
  pageIndex: number;
}

const PaginationItemsDetail = ({
  canPreviousPage,
  previousPage,
  canNextPage,
  nextPage,
  pageOptions = [],
  pageIndex,
}: PaginationItemsDetailProps) => {
  return (
    <>
      <Pagination.Item
        key="prev"
        disabled={!canPreviousPage}
        onClick={() => {
          previousPage();
        }}
      >
        Previous
      </Pagination.Item>
      <Pagination.Item
        key="next"
        disabled={!canNextPage}
        onClick={() => {
          nextPage();
        }}
      >
        Next
      </Pagination.Item>
      <PageInfo>{`${pageIndex + 1} of ${pageOptions.length}`}</PageInfo>
    </>
  );
};

const getColumnSortedIcon = (isSorted: boolean, isSortedDesc: boolean | undefined) => {
  if (isSorted) {
    return <PaginationIcon icon={isSortedDesc ? faSortDown : faSortUp} size="sm" />;
  }
  return null;
};

interface Props {
  variant?: string;
  headers: Column[];
  data: any;
  activateRow?: (row: Row) => void;
  loadMoreItem?: any;
  hasMoreItem?: boolean;
  searchKey?: string;
  searchPlaceholder?: string;
  searchTooltip?: string;
  colfilters: TableFilter[];
  searchLocation?: 'left' | 'right';
  totalColSpan?: number;
  searchColSpan?: number;
  filterColSpan?: number;
  showFilters?: boolean;
  showContent?: boolean;
  headerAlign?: string;
  headerGutter?: number[];
  loading?: boolean;
  loader?: any;
  onPage?: (val: number) => void;
  rowCount?: number;
  onEnter?: (val: string) => void;
  onSearch?: (val: string) => void;
  pageLimits?: number[];
  onLimit?: (val: number) => void;
  limit?: number;
  noDataFoundElement?: ReactElement;
  pagination?: boolean;
  rowSelectorKey?: string;
  readOnly?: boolean;
  /**
   * Pass in this prop if you want to control the selected row from the parent component. It should equal the rowSelectorKey's value in the active row. Leave undefined to control selected state internally. */
  activeSelector?: string | number;
}

function Table({
  variant = 'medium',
  headers,
  data,
  activateRow = noop,
  loadMoreItem = noop,
  hasMoreItem = false,
  searchLocation = 'left',
  colfilters = [],
  showFilters = false,
  searchPlaceholder = 'Search...',
  searchTooltip = '',
  totalColSpan = 14,
  headerAlign = 'center',
  headerGutter = [],
  filterColSpan = 10,
  searchColSpan = 4,
  onPage = noop,
  onEnter = noop,
  rowCount = 10,
  searchKey = '',
  onSearch = noop,
  loading,
  loader = <></>,
  onLimit = noop,
  limit = 10,
  noDataFoundElement = <p>No Data Found.</p>,
  pagination = false,
  pageLimits = [5, 10, 15, 30, 50, 100],
  rowSelectorKey = 'id',
  readOnly = false,
  activeSelector,
}: Props) {
  const numOfPages = Math.ceil(rowCount / limit);
  const columns: Column[] = React.useMemo(() => headers, [headers]);
  const rowsData = React.useMemo(() => data, [data]);
  const [selectedRow, setSelectedRow] = useState<any>();
  const [_searchKey, setSearchKey] = useState(searchKey);
  const handleSearchKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKey(event.target.value);
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onEnter(_searchKey);
      gotoPage(0);
    }
  };

  const handleSearchSubmit = () => {
    onSearch(_searchKey);
    gotoPage(0);
    setSelectedRow(undefined);
  };

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    nextPage,
    previousPage,
    state: { pageIndex },
    setFilter,
    gotoPage,
  } = useTable(
    {
      columns,
      data: rowsData,
      initialState: { pageIndex: 0 },
      manualPagination: true,
      pageCount: numOfPages === 0 ? 1 : numOfPages,
      autoResetPage: false,
      autoResetSortBy: false,
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination,
  );

  let rowSpaces = rowCount || limit;
  if (rowCount > limit) rowSpaces = limit;

  const awesomePlaceholder = (
    <tr>
      <td colSpan={100}>
        <div
          style={{
            height: `${rowSpaces * (TABLE_ROW_HEIGHT_MINI + TABLE_ROW_SPACING) - TABLE_ROW_SPACING}px`,
            paddingTop: '10px',
          }}
        >
          <TextBlock rows={rowSpaces * 2} color="#CCC" />
        </div>
      </td>
    </tr>
  );

  const numOfItemsPerPage = () => {
    const options = pageLimits.map((val) => {
      return { value: val, label: `${val} per page` };
    });

    return options;
  };

  const handlePageLimitChange = (val: number) => {
    gotoPage(0);
    onLimit(val);
  };

  const updateSelectedRow = (row: any) => {
    activateRow(row);
    setSelectedRow(row);
  };

  const searchCol = (
    <Grid.Col span={searchColSpan}>
      <Grid cols={12}>
        <Grid.Row gutter={[5, 0]} align="center">
          <Grid.Col span={8}>
            <SearchBar
              type="text"
              size="small"
              maxLength="1000"
              placeholder={searchPlaceholder}
              value={_searchKey}
              onChange={handleSearchKeyChange}
              onKeyUp={handleKeyUp}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            {searchTooltip ? (
              <InfoOverlay content={searchTooltip || 'some text'}>
                <button
                  className="primary"
                  type="button"
                  onClick={handleSearchSubmit}
                  style={{ padding: '.44rem 1.5rem' }}
                >
                  Search
                </button>
              </InfoOverlay>
            ) : (
              <button className="primary short" type="button" onClick={handleSearchSubmit}>
                Search
              </button>
            )}
          </Grid.Col>
        </Grid.Row>
      </Grid>
    </Grid.Col>
  );

  const filterCol = (
    <Grid.Col span={filterColSpan} style={{ textAlign: 'right' }}>
      <FiltersContainer itemsLength={colfilters.length}>
        {colfilters.map((filter: TableFilter) => (
          <Label key={filter.key}>
            {filter.multiselect ? (
              <>
                {filter.label}
                <SelectColumnFilter
                  setFilter={setFilter}
                  defaultValue={filter?.defaultValue}
                  options={filter.options}
                  setValue={filter.onChange}
                  gotoPage={gotoPage}
                />
              </>
            ) : (
              <div data-testid="select-col-filter">
                {filter.label}
                <Select
                  className="basic-single"
                  classNamePrefix="select"
                  //@ts-ignore
                  options={filter.options}
                  onChange={(val: any) => filter.onChange && filter.onChange(val.value)}
                  isSearchable={true}
                  defaultValue={filter.options[0]}
                  value={filter.options.find((op) => op.value === filter.value)}
                />
              </div>
            )}
          </Label>
        ))}
      </FiltersContainer>
    </Grid.Col>
  );

  let leftCol = null;
  let rightCol = null;
  if (searchLocation === 'left') {
    leftCol = searchCol;
    rightCol = filterCol;
  } else {
    leftCol = filterCol;
    rightCol = searchCol;
  }

  useEffect(() => {
    onPage(pageIndex + 1);
    setSelectedRow(undefined);
  }, [pageIndex]);

  return (
    <>
      {showFilters && (
        <SectionHeader>
          <Grid cols={totalColSpan}>
            <Grid.Row collapse="1160" gutter={headerGutter} align={headerAlign}>
              {leftCol}
              {rightCol}
            </Grid.Row>
          </Grid>
        </SectionHeader>
      )}
      <InfScroll loadMore={loadMoreItem} hasMore={hasMoreItem} loader={loader}>
        <StyledTable variant={variant} {...getTableProps()} readOnly={readOnly}>
          <thead>
            {
              // Loop over the header rows
              headerGroups.map((headerGroup) => (
                // Apply the header row props
                <tr {...headerGroup.getHeaderGroupProps()}>
                  {
                    // Loop over the headers in each row
                    headerGroup.headers.map((column) => (
                      // Apply the header cell props
                      <th {...column.getHeaderProps(column.getSortByToggleProps())} key={column.id}>
                        <>
                          {
                            // Render the header
                            column.render('Header')
                          }
                          &nbsp;
                        </>
                        <span>{getColumnSortedIcon(column.isSorted, column.isSortedDesc)}</span>
                      </th>
                    ))
                  }
                </tr>
              ))
            }
          </thead>
          <tbody {...getTableBodyProps()}>
            <ReactPlaceholder ready={!loading || false} showLoadingAnimation customPlaceholder={awesomePlaceholder}>
              {page.length > 0 ? (
                page.map((row: any) => {
                  prepareRow(row);
                  // Use prop if passed from parent. Otherwise use component's internal state.
                  const currentActiveSelector = activeSelector ?? selectedRow?.original[`${rowSelectorKey}`];
                  return (
                    <tr
                      {...row.getRowProps()}
                      className={currentActiveSelector === row?.original[`${rowSelectorKey}`] ? 'active' : ''}
                      key={row?.id}
                      onClick={() => updateSelectedRow(row)}
                    >
                      {row.cells.map((cell: Cell) => {
                        return (
                          <td {...cell.getCellProps()} key={cell.getCellProps().key}>
                            <>{cell.render('Cell')}</>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr key={'no-data-found'}>
                  <td colSpan={10}>{noDataFoundElement}</td>
                </tr>
              )}
            </ReactPlaceholder>
          </tbody>
        </StyledTable>
      </InfScroll>
      {pagination && rowCount > 0 && (
        <Grid cols={12}>
          <Grid.Row collapse="992" gutter={[]} align="center">
            <Grid.Col span={8}>
              <StyledPagination>
                <PaginationItemsDetail
                  canNextPage={canNextPage}
                  nextPage={nextPage}
                  canPreviousPage={canPreviousPage}
                  previousPage={previousPage}
                  pageIndex={pageIndex}
                  pageOptions={pageOptions}
                />
              </StyledPagination>
            </Grid.Col>
            <Grid.Col span={4}>
              <div style={{ textAlign: 'right' }} data-testid="page-select">
                <StyledSelect
                  menuPosition="fixed"
                  defaultValue={pageIndex || numOfItemsPerPage()[0]}
                  options={numOfItemsPerPage()}
                  onChange={(v: any) => handlePageLimitChange(v.value)}
                ></StyledSelect>
              </div>
            </Grid.Col>
          </Grid.Row>
        </Grid>
      )}
    </>
  );
}

export default Table;
