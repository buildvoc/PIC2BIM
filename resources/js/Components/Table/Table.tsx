import { Link, usePage } from '@inertiajs/react';
import get from 'lodash/get';
import { ChevronRight } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDown, faArrowUp, faSearch, faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import TextInput from '@/Components/Form/TextInput';
import { useState } from 'react';

interface TableProps<T> {
  columns: {
    name: string;
    label: string;
    colSpan?: number;
    sorting?: boolean;
    renderCell?: (row: T) => React.ReactNode;
  }[];
  rows: T[];
  sortColumn?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (columnName: string, sortOrder: 'asc' | 'desc') => void;
  onSearch?: (search : string) => void;
  onReset?: () => void;
  isSearchable ?: boolean;
  search : string;
}


export default function Table<T>({
   columns = [],
   rows = [],
   sortColumn, sortOrder, onSort, onSearch, isSearchable, search, onReset
 }: TableProps<T>) {

  const [searchValue, setSearchValue] = useState(search || '');
  const handleSort = (columnName: string, order : 'asc' | 'desc') => {
    if (onSort) {
      onSort(columnName, order);
    }
  };
  const handleSearch = (q : string) => {
    if (onSearch) {
      onSearch(q);
    }
  };
  function handleReset (){
    if (onReset) {
      onReset();
    }
  }



  return (
    <div className="overflow-x-auto rounded shadow">
      { isSearchable &&
        <div className='flex ml-2 mb-1 items-center'>
          <div>
            <TextInput
                name="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                style={{ background: 'transparent', color: 'white' }}
            />
          </div>
          <div className=''>
            <button type='button' onClick={() => handleSearch(searchValue)}>
              <FontAwesomeIcon  className={'ml-4 text-indigo-600 dark:text-indigo-400'} icon={faSearch}></FontAwesomeIcon>
            </button> 
          </div>
          <div className='ml-8 text-indigo-600 dark:text-indigo-400'>
            <button type='button' onClick={handleReset}>
              <FontAwesomeIcon  className={''} icon={faCircleXmark}></FontAwesomeIcon>
              <span className='ml-1'>Cancel Sorting</span>
            </button> 
          </div>
          
        </div>
      }
      <table className="w-full whitespace-nowrap">
        <thead>
        <tr className="font-bold text-left text-gray-700 dark:text-gray-300">
          {columns?.map(column => (
            <th
              key={column.label}
              colSpan={column.colSpan ?? 1}
              className="px-6 pt-5 pb-4"
            >
                <span className='flex flex-row'>
                  <span>{column.label}</span>
                  { column.sorting &&
                      <span>
                        <button onClick={() => handleSort(column.name, 'asc')} type='button'>
                          <FontAwesomeIcon className={sortColumn == column.name && sortOrder == 'asc' ? 'ml-2 text-indigo-600 dark:text-indigo-400' : 'ml-2'} icon={faArrowUp}></FontAwesomeIcon>
                        </button>
                        <button onClick={() => handleSort(column.name, 'desc')} type='button'>
                          <FontAwesomeIcon  className={sortColumn == column.name && sortOrder == 'desc' ? 'ml-[1px] text-indigo-600 dark:text-indigo-400' : 'ml-[1px]'} icon={faArrowDown}></FontAwesomeIcon>
                        </button>
                      </span>
                  }
                </span>
            </th>
          ))}
        </tr>
        </thead>
        <tbody>
        {/* Empty state */}
        {rows?.length === 0 && (
          <tr>
            <td
              className="px-6 py-24 border-t text-center"
              colSpan={columns.length}
            >
              No data found.
            </td>
          </tr>
        )}
        {rows?.map((row, index) => {
          return (
            <tr
              key={index}
              className=" focus-within:bg-gray-100  dark:focus-within:bg-gray-600"
            >
              {columns.map(column => {
                return (
                  <td key={column.name} className="border-t">
                    <span
                      tabIndex={-1}
                      className="flex items-center px-6 py-4 text-gray-700 dark:text-gray-300 focus:outline-none"
                    >
                      {column.renderCell?.(row) ??
                        get(row, column.name) ??
                        'N/A'
                      }
                    </span>
                  </td>
                );
              })}
            </tr>
          );
        })}
        </tbody>
      </table>
    </div>
  );
}
