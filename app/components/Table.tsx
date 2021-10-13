import React, { useState } from 'react';
import styled from 'styled-components';
import { noop } from 'lodash';
import Input from '@button-inc/bcgov-theme/Input';
import Button from '@button-inc/bcgov-theme/Button';
import Dropdown from '@button-inc/bcgov-theme/Dropdown';
import Grid from '@button-inc/bcgov-theme/Grid';
import Pagination from 'react-bootstrap/Pagination';
import StyledTable from 'html-components/Table';
import SectionHeader from 'components/SectionHeader';

const StyledPagination = styled(Pagination)`
  margin: 0 !important;
  & li {
    margin: 0 !important;
  }
`;

const PageInfo = styled.span`
  padding-left: 5px;
  line-height: 40px;
`;

interface Header {
  name: string;
  style?: any;
}

interface FilterItem {
  value: string | number;
  text: string;
}

interface Props {
  headers: Header[];
  children: React.ReactNode;
  filterItems?: FilterItem[];
  filterItems2?: FilterItem[];
  pageLimits?: FilterItem[];
  searchKey?: string;
  searchPlaceholder?: string;
  page?: number;
  limit?: number;
  rowCount?: number;
  filter?: string;
  filter2?: string;
  onSearch?: (val: string) => void;
  onEnter?: (val: string) => void;
  onFilter?: (val: any) => void;
  onFilter2?: (val: any) => void;
  onLimit?: (val: number) => void;
  onPage?: (val: number) => void;
  onPrev?: (val: number) => void;
  onNext?: (val: number) => void;
}

const generateOptions = (items: FilterItem[]) => (
  <>
    {items.map((item) => (
      <option key={item.value} value={item.value}>
        {item.text}
      </option>
    ))}
  </>
);

const PaginationItemsDetail = ({ rowCount, limit, page, onPage, onPrev, onNext }: any) => {
  const pageCount = parseInt(String((rowCount - 1) / limit + 1));

  const items = [
    <Pagination.Item key="prev" disabled={page === 1} onClick={() => onPrev()}>
      Previous
    </Pagination.Item>,
  ];

  for (let number = 1; number <= pageCount; number++) {
    items.push(
      <Pagination.Item key={number} active={number === page} onClick={() => onPage(number)}>
        {number}
      </Pagination.Item>,
    );

    if (pageCount === number) {
      items.push(
        <Pagination.Item key="next" disabled={page === number} onClick={() => onNext()}>
          Next
        </Pagination.Item>,
      );
    }
  }

  return <>{items}</>;
};

const PaginationItems = ({ rowCount, limit, page, onPrev, onNext }: any) => {
  const pageCount = parseInt(String((rowCount - 1) / limit + 1));
  const startNum = parseInt(String((page - 1) * limit + 1));
  let endNum = startNum + limit - 1;
  if (endNum > rowCount) endNum = rowCount;

  return (
    <>
      <Pagination.Item key="prev" disabled={page === 1} onClick={() => onPrev(page - 1)}>
        Previous
      </Pagination.Item>
      <Pagination.Item key="next" disabled={page === pageCount} onClick={() => onNext(page + 1)}>
        Next
      </Pagination.Item>
      <PageInfo>{`${startNum}-${endNum} of ${rowCount}`}</PageInfo>
    </>
  );
};

function Table({
  headers,
  children,
  onSearch = noop,
  onEnter = noop,
  onFilter = noop,
  onFilter2 = noop,
  onLimit = noop,
  onPage,
  onPrev = noop,
  onNext = noop,
  filterItems,
  filterItems2,
  pageLimits,
  searchKey = '',
  searchPlaceholder = 'Search...',
  page = 1,
  limit = 10,
  rowCount = 10,
  filter = '',
  filter2 = '',
}: Props) {
  console.log('page', page);
  const [_searchKey, setSearchKey] = useState(searchKey);

  const handleSearchKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKey(event.target.value);
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onEnter(_searchKey);
    }
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFilter(event.target.value);
  };

  const handleFilterChange2 = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFilter2(event.target.value);
  };

  const handlePageLimitChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onLimit(Number(event.target.value));
  };

  const handleSearchSubmit = () => {
    onSearch(_searchKey);
  };

  return (
    <>
      <SectionHeader>
        <Grid cols={12}>
          <Grid.Row collapse="992" gutter={[]} align="center">
            <Grid.Col span={5}>
              <Input
                type="text"
                size="small"
                placeholder={searchPlaceholder}
                style={{ display: 'inline-block' }}
                value={_searchKey}
                onChange={handleSearchKeyChange}
                onKeyUp={handleKeyUp}
              />
              <Button type="button" size="small" onClick={handleSearchSubmit}>
                Search
              </Button>
            </Grid.Col>
            <Grid.Col span={7} style={{ textAlign: 'right' }}>
              {filterItems && (
                <>
                  <span>Status: </span>
                  <Dropdown
                    style={{ display: 'inline-block', width: '160px' }}
                    value={filter}
                    onChange={handleFilterChange}
                  >
                    {generateOptions(filterItems)}
                  </Dropdown>
                </>
              )}
              &nbsp;&nbsp;
              {filterItems2 && (
                <>
                  <Dropdown
                    style={{ display: 'inline-block', width: '160px' }}
                    value={filter2}
                    onChange={handleFilterChange2}
                  >
                    {generateOptions(filterItems2)}
                  </Dropdown>
                </>
              )}
            </Grid.Col>
          </Grid.Row>
        </Grid>
      </SectionHeader>

      <StyledTable>
        <thead>
          <tr>
            {headers.map((header, index) => {
              return (
                <th key={index} style={header.style || {}}>
                  {header.name}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </StyledTable>
      {pageLimits && (
        <Grid cols={12}>
          <Grid.Row collapse="992" gutter={[]} align="center">
            <Grid.Col span={8}>
              <StyledPagination>
                {onPage ? (
                  <PaginationItemsDetail rowCount={rowCount} limit={limit} page={page} onPage={onPage} />
                ) : (
                  <PaginationItems rowCount={rowCount} limit={limit} page={page} onPrev={onPrev} onNext={onNext} />
                )}
              </StyledPagination>
            </Grid.Col>
            <Grid.Col span={4} style={{ textAlign: 'right' }}>
              <Dropdown
                style={{ display: 'inline-block', width: '160px' }}
                value={String(limit)}
                onChange={handlePageLimitChange}
              >
                {generateOptions(pageLimits)}
              </Dropdown>
            </Grid.Col>
          </Grid.Row>
        </Grid>
      )}
    </>
  );
}

export default Table;
