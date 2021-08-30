import React, { useState } from 'react';
import styled from 'styled-components';
import { noop } from 'lodash';
import Input from '@button-inc/bcgov-theme/Input';
import Button from '@button-inc/bcgov-theme/Button';
import Dropdown from '@button-inc/bcgov-theme/Dropdown';
import Grid from '@button-inc/bcgov-theme/Grid';
import Pagination from 'react-bootstrap/Pagination';
import StyledTable from 'html-components/Table';

const StyledPagination = styled(Pagination)`
  margin: 0 !important;
  & li {
    margin: 0 !important;
  }
`;

interface FilterItem {
  value: string | number;
  text: string;
}

interface Props {
  headers: string[];
  children: React.ReactNode;
  filterItems?: FilterItem[];
  filterItems2?: FilterItem[];
  pageLimits?: FilterItem[];
  searchKey?: string;
  page?: number;
  limit?: number;
  rowCount?: number;
  filter?: string;
  filter2?: string;
  onSearch?: (val: string) => void;
  onFilter?: (val: any) => void;
  onFilter2?: (val: any) => void;
  onLimit?: (val: number) => void;
  onPage?: (val: number) => void;
}

const generateOptions = (items: FilterItem[], selected?: string | number) => (
  <>
    {items.map((item) => (
      <option key={item.value} value={item.value} selected={item.value === selected}>
        {item.text}
      </option>
    ))}
  </>
);

const PaginationItems = ({ rowCount, limit, page, onPage }: any) => {
  const pageCount = (rowCount - 1) / limit + 1;

  const items = [];
  for (let number = 1; number <= pageCount; number++) {
    items.push(
      <Pagination.Item key={number} active={number === page} onClick={() => onPage(number)}>
        {number}
      </Pagination.Item>,
    );
  }

  return <>{items}</>;
};

function Table({
  headers,
  children,
  onSearch = noop,
  onFilter = noop,
  onFilter2 = noop,
  onLimit = noop,
  onPage = noop,
  filterItems,
  filterItems2,
  pageLimits,
  searchKey = '',
  page = 1,
  limit = 10,
  rowCount = 10,
  filter = '',
  filter2 = '',
}: Props) {
  const [_searchKey, setSearchKey] = useState(searchKey);

  const handleSearchKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKey(event.target.value);
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
      <Grid cols={12}>
        <Grid.Row collapse="992" gutter={[]} align="center">
          <Grid.Col span={5}>
            <Input
              type="text"
              size="small"
              placeholder="Search..."
              style={{ display: 'inline-block' }}
              value={_searchKey}
              onChange={handleSearchKeyChange}
            />
            <Button type="button" size="small" onClick={handleSearchSubmit}>
              Search
            </Button>
          </Grid.Col>
          <Grid.Col span={7} style={{ textAlign: 'right' }}>
            {filterItems && (
              <>
                <span>Status: </span>
                <Dropdown style={{ display: 'inline-block', width: '160px' }} onChange={handleFilterChange}>
                  {generateOptions(filterItems, filter)}
                </Dropdown>
              </>
            )}
            &nbsp;&nbsp;
            {filterItems2 && (
              <>
                <Dropdown style={{ display: 'inline-block', width: '160px' }} onChange={handleFilterChange2}>
                  {generateOptions(filterItems2, filter2)}
                </Dropdown>
              </>
            )}
          </Grid.Col>
        </Grid.Row>
      </Grid>

      <StyledTable>
        <thead>
          <tr>
            {headers.map((header, index) => {
              return <th key={index}>{header}</th>;
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
                <PaginationItems rowCount={rowCount} limit={limit} page={page} onPage={onPage} />
              </StyledPagination>
            </Grid.Col>
            <Grid.Col span={4} style={{ textAlign: 'right' }}>
              <Dropdown style={{ display: 'inline-block', width: '160px' }} onChange={handlePageLimitChange}>
                {generateOptions(pageLimits, limit)}
              </Dropdown>
            </Grid.Col>
          </Grid.Row>
        </Grid>
      )}
    </>
  );
}

export default Table;
