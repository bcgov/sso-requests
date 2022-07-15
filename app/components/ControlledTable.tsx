import React, { useState, useMemo, memo } from 'react';
import styled from 'styled-components';
import Table, { TableHeader, TableFilterItem, TableFilter } from 'components/Table';

const RightAlign = styled.div`
  text-align: center;
`;

const DEFAULT_PAGE_LIMITS: TableFilterItem[] = [
  { value: 5, text: '5 per page' },
  { value: 10, text: '10 per page' },
  { value: 15, text: '15 per page' },
  { value: 30, text: '30 per page' },
  { value: 50, text: '50 per page' },
  { value: 100, text: '100 per page' },
];

interface Props {
  variant?: string;
  headers: TableHeader[];
  children: (v: any) => React.ReactNode;
  pagination?: boolean;
  pageLimits?: TableFilterItem[];
  searchKey?: string;
  searchPlaceholder?: string;
  filters?: TableFilter[];
  searchLocation?: 'left' | 'right';
  totalColSpan?: number;
  searchColSpan?: number;
  filterColSpan?: number;
  showFilters?: boolean;
  showContent?: boolean;
  headerAlign?: string;
  headerGutter?: number[];
  onSearch?: (val: string) => void;
  onEnter?: (val: string) => void;
  onFilter?: (val: any) => void;
  onFilter2?: (val: any) => void;
  loading?: boolean;
  rows?: any[];
  rowPlaceholder?: string;
}

function ControlledTable({
  variant,
  headers,
  children = () => <></>,
  pagination = true,
  pageLimits = DEFAULT_PAGE_LIMITS,
  searchKey,
  searchPlaceholder,
  filters = [],
  searchLocation,
  totalColSpan,
  searchColSpan,
  filterColSpan,
  showFilters = true,
  showContent = true,
  headerAlign,
  headerGutter,
  onSearch,
  onEnter,
  loading,
  rows = [],
  rowPlaceholder = 'No records found.',
}: Props) {
  const [limit, setLimit] = useState<TableFilterItem>(pageLimits[0]);
  const [page, setPage] = useState<number>(1);

  const pageRows = useMemo(() => {
    const count = limit.value as number;
    const start = (page - 1) * count;
    return rows.slice(start, start + count);
  }, [rows, page, limit]);

  const handleLimit = (val: number) => {
    setPage(1);
    setLimit(pageLimits.find((v) => v.value === val) || pageLimits[0]);
  };

  const handlePrev = (val: number) => {
    setPage(val);
  };

  const handleNext = (val: number) => {
    setPage(val);
  };

  return (
    <Table
      variant={variant}
      headers={headers}
      pagination={pagination}
      pageLimits={pageLimits}
      searchKey={searchKey}
      searchPlaceholder={searchPlaceholder}
      filters={filters}
      page={page}
      limit={limit.value as number}
      rowCount={rows.length}
      onSearch={onSearch}
      onEnter={onEnter}
      loading={loading}
      onLimit={handleLimit}
      onPrev={handlePrev}
      onNext={handleNext}
      searchLocation={searchLocation}
      totalColSpan={totalColSpan}
      searchColSpan={searchColSpan}
      filterColSpan={filterColSpan}
      showFilters={showFilters}
      showContent={showContent}
      headerAlign={headerAlign}
      headerGutter={headerGutter}
    >
      {rows.length > 0 ? (
        pageRows.map(children)
      ) : (
        <tr>
          <td colSpan={headers.length}>
            <RightAlign>{rowPlaceholder}</RightAlign>
          </td>
        </tr>
      )}
    </Table>
  );
}

export default memo(ControlledTable);
