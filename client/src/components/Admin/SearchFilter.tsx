import React from 'react';
import { FiSearch, FiFilter } from 'react-icons/fi';

interface SearchFiltersProps {
  activeTab: string;
  searchTerm: string;
  statusFilter: string;
  roleFilter: string;
  verificationFilter: string;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onRoleFilterChange: (value: string) => void;
  onVerificationFilterChange: (value: string) => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  activeTab,
  searchTerm,
  statusFilter,
  roleFilter,
  verificationFilter,
  onSearchChange,
  onStatusFilterChange,
  onRoleFilterChange,
  onVerificationFilterChange,
}) => {
  return (
    <div className="mb-4 sm:mb-6 space-y-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FiSearch className="text-gray-400" size={16} />
        </div>
        <input
          type="text"
          placeholder={
            activeTab === 'users'
              ? 'Search users...'
              : 'Search verification requests...'
          }
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 
            bg-white dark:bg-gray-900 text-gray-900 dark:text-light focus:ring-2 focus:ring-blue-500 
            focus:border-transparent outline-none transition-colors text-sm"
        />
      </div>

      {activeTab === 'users' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="w-full pl-8 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 
                bg-white dark:bg-gray-900 text-gray-900 dark:text-light focus:ring-2 focus:ring-blue-500 
                focus:border-transparent outline-none transition-colors appearance-none text-sm">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="verified">Verified</option>
              <option value="banned">Banned</option>
            </select>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiFilter className="text-gray-400" size={16} />
            </div>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => onRoleFilterChange(e.target.value)}
              className="w-full pl-8 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 
                bg-white dark:bg-gray-900 text-gray-900 dark:text-light focus:ring-2 focus:ring-blue-500 
                focus:border-transparent outline-none transition-colors appearance-none text-sm">
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="host">Host</option>
            </select>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiFilter className="text-gray-400" size={16} />
            </div>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          <div className="relative">
            <select
              value={verificationFilter}
              onChange={(e) => onVerificationFilterChange(e.target.value)}
              className="w-full pl-8 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 
                bg-white dark:bg-gray-900 text-gray-900 dark:text-light focus:ring-2 focus:ring-blue-500 
                focus:border-transparent outline-none transition-colors appearance-none text-sm">
              <option value="all">All Verification</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="not_submitted">Not Submitted</option>
            </select>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiFilter className="text-gray-400" size={16} />
            </div>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
