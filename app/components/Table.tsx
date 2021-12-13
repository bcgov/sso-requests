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
import { MultiSelect } from 'react-multi-select-component';
import { TextBlock } from 'react-placeholder/lib/placeholders';
import ReactPlaceholder from 'react-placeholder';
import 'react-placeholder/lib/reactPlaceholder.css';
import { TABLE_ROW_HEIGHT, TABLE_ROW_SPACING } from 'styles/theme';
import { Option } from 'interfaces/Request';

const StyledMultiSelect = styled(MultiSelect)`
  .dropdown-container {
    border: 1.8px solid black !important;
  }
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

const FiltersContainer = styled.div<{ itemsLength: number }>`
  display: grid;
  grid-template-columns:
    ${(props) => `repeat(${props.itemsLength}, 1fr);`}
    &> * {
    margin-right: 10px;
  }
`;

interface Header {
  name: string;
  style?: any;
}

interface FilterItem {
  value: string | number;
  text: string;
}

interface Filter {
  value?: string | Option[];
  multiselect?: boolean;
  onChange?: Function;
  options: Option[];
  label: string;
}

interface Props {
  headers: Header[];
  children: React.ReactNode;
  pageLimits?: FilterItem[];
  searchKey?: string;
  searchPlaceholder?: string;
  page?: number;
  limit?: number;
  rowCount?: number;
  filters: Filter[];
  onSearch?: (val: string) => void;
  onEnter?: (val: string) => void;
  onFilter?: (val: any) => void;
  onFilter2?: (val: any) => void;
  onLimit?: (val: number) => void;
  onPage?: (val: number) => void;
  onPrev?: (val: number) => void;
  onNext?: (val: number) => void;
  loading?: boolean;
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
  filters = [] as Filter[],
  onLimit = noop,
  onPage,
  onPrev = noop,
  onNext = noop,
  pageLimits,
  searchKey = '',
  searchPlaceholder = 'Search...',
  page = 1,
  limit = 10,
  rowCount = 10,
  loading,
}: Props) {
  const [_searchKey, setSearchKey] = useState(searchKey);

  const handleSearchKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKey(event.target.value);
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onEnter(_searchKey);
    }
  };

  const handlePageLimitChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onLimit(Number(event.target.value));
  };

  const handleSearchSubmit = () => {
    onSearch(_searchKey);
  };

  let rowSpaces = rowCount || limit;
  if (rowCount > limit) rowSpaces = limit;

  const awesomePlaceholder = (
    <td colSpan={100}>
      <div
        style={{
          height: `${rowSpaces * (TABLE_ROW_HEIGHT + TABLE_ROW_SPACING) - TABLE_ROW_SPACING}px`,
          paddingTop: '10px',
        }}
      >
        <TextBlock rows={rowSpaces * 2} color="#CCC" />
      </div>
    </td>
  );

  return (
    <>
      <SectionHeader>
        <Grid cols={12}>
          <Grid.Row collapse="1160" gutter={[]} align="center">
            <Grid.Col span={4}>
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
            <Grid.Col span={8} style={{ textAlign: 'right' }}>
              <FiltersContainer itemsLength={filters.length}>
                {filters.map((filter) => (
                  <>
                    {filter.multiselect ? (
                      <Label>
                        {filter.label}
                        <StyledMultiSelect
                          className="multiselect"
                          options={filter.options}
                          value={Array.isArray(filter.value) ? filter.value : []}
                          onChange={filter.onChange}
                          labelledBy="Select"
                          hasSelectAll={false}
                        />
                      </Label>
                    ) : (
                      <Label>
                        {filter.label}
                        <Dropdown
                          onChange={filter.onChange}
                          value={typeof filter.value === 'string' ? filter.value : ''}
                        >
                          {filter.options.map((option) => (
                            <option
                              value={option.value}
                              key={Array.isArray(option.value) ? JSON.stringify(option.value) : option.value}
                            >
                              {option.label}
                            </option>
                          ))}
                        </Dropdown>
                      </Label>
                    )}
                  </>
                ))}
              </FiltersContainer>
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
        <tbody>
          <ReactPlaceholder ready={!loading || false} showLoadingAnimation customPlaceholder={awesomePlaceholder}>
            {children}
          </ReactPlaceholder>
        </tbody>
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
