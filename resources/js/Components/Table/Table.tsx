import { Link } from '@inertiajs/react';
import get from 'lodash/get';
import { ChevronRight } from 'lucide-react';

interface TableProps<T> {
  columns: {
    name: string;
    label: string;
    colSpan?: number;
    renderCell?: (row: T) => React.ReactNode;
  }[];
  rows: T[];
}

export default function Table<T>({
   columns = [],
   rows = []
 }: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded shadow">
      <table className="w-full whitespace-nowrap">
        <thead>
        <tr className="font-bold text-left text-gray-700 dark:text-gray-300">
          {columns?.map(column => (
            <th
              key={column.label}
              colSpan={column.colSpan ?? 1}
              className="px-6 pt-5 pb-4"
            >
              {column.label}
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
