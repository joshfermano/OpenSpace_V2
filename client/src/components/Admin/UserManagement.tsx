import React from 'react';
import { FiEye, FiSlash, FiTrash2, FiUser } from 'react-icons/fi';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  role: string;
  status: string;
  rooms: number;
  idType: string | null;
  verificationStatus: string;
  imageUrl: string | null;
  documentUrl?: string;
}

interface StatusConfig {
  label: string;
  color: string;
}

interface UserManagementProps {
  users: User[];
  statusConfig: Record<string, StatusConfig>;
  verificationConfig: Record<string, StatusConfig>;
  onViewDocument: (url: string, userName: string) => void;
  onBanUser: (userId: string, userName: string) => void;
  onDeleteUser: (userId: string, userName: string) => void;
  onImageError: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({
  users,
  statusConfig,
  verificationConfig,
  onViewDocument,
  onBanUser,
  onDeleteUser,
  onImageError,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
      {/* Mobile Cards View */}
      <div className="block sm:hidden">
        <div className="p-4 space-y-4">
          {users.length > 0 ? (
            users.map((user) => (
              <div
                key={user.id}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 h-10 w-10 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      {user.imageUrl ? (
                        <img
                          className="h-10 w-10 rounded-full object-cover"
                          src={
                            user.imageUrl.startsWith('http')
                              ? user.imageUrl
                              : `${import.meta.env.VITE_API_URL || ''}${
                                  user.imageUrl
                                }`
                          }
                          alt={user.name}
                          onError={onImageError}
                        />
                      ) : (
                        <div className="h-10 w-10 flex items-center justify-center text-gray-500">
                          <FiUser size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : user.role === 'host'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                      {user.role}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <div>
                    <span className="font-medium">Joined:</span>
                    <div className="text-gray-900 dark:text-white">
                      {new Date(user.joinDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <div>
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          statusConfig[user.status]?.color
                        }`}>
                        {statusConfig[user.status]?.label}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Verification:</span>
                    <div>
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          verificationConfig[user.verificationStatus]?.color
                        }`}>
                        {verificationConfig[user.verificationStatus]?.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  {user.idType &&
                    user.verificationStatus !== 'not_submitted' &&
                    user.documentUrl && (
                      <button
                        onClick={() => {
                          let formattedUrl;
                          if (
                            user.documentUrl &&
                            user.documentUrl.startsWith('http')
                          ) {
                            formattedUrl = user.documentUrl;
                          } else if (
                            user.documentUrl &&
                            user.documentUrl.startsWith('data:')
                          ) {
                            formattedUrl = user.documentUrl;
                          } else if (user.documentUrl) {
                            formattedUrl = `${
                              import.meta.env.VITE_API_URL || ''
                            }/uploads/verifications/${
                              user.documentUrl.split('/').pop() ||
                              user.documentUrl
                            }`;
                          }
                          if (formattedUrl) {
                            onViewDocument(formattedUrl, user.name);
                          }
                        }}
                        className="flex-1 flex items-center justify-center py-2 px-3 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-sm">
                        <FiEye className="mr-1" size={16} />
                        View ID
                      </button>
                    )}
                  {user.status !== 'banned' && user.role !== 'admin' && (
                    <button
                      onClick={() => onBanUser(user.id, user.name)}
                      className="flex-1 flex items-center justify-center py-2 px-3 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors text-sm">
                      <FiSlash className="mr-1" size={16} />
                      Ban
                    </button>
                  )}
                  {user.role !== 'admin' && (
                    <button
                      onClick={() => onDeleteUser(user.id, user.name)}
                      className="flex-1 flex items-center justify-center py-2 px-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-sm">
                      <FiTrash2 className="mr-1" size={16} />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              No users found
            </div>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th
                scope="col"
                className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                User
              </th>
              <th
                scope="col"
                className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Role
              </th>
              <th
                scope="col"
                className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Joined
              </th>
              <th
                scope="col"
                className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th
                scope="col"
                className="hidden xl:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Verification
              </th>
              <th
                scope="col"
                className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.length > 0 ? (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-300">
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 sm:h-10 w-8 sm:w-10 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        {user.imageUrl ? (
                          <img
                            className="h-8 sm:h-10 w-8 sm:w-10 rounded-full object-cover"
                            src={
                              user.imageUrl.startsWith('http')
                                ? user.imageUrl
                                : `${import.meta.env.VITE_API_URL || ''}${
                                    user.imageUrl
                                  }`
                            }
                            alt={user.name}
                            onError={onImageError}
                          />
                        ) : (
                          <div className="h-8 sm:h-10 w-8 sm:w-10 flex items-center justify-center text-gray-500">
                            <FiUser size={18} />
                          </div>
                        )}
                      </div>
                      <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {user.name}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </div>
                        {/* Show additional info on smaller screens */}
                        <div className="md:hidden mt-1 space-y-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                statusConfig[user.status]?.color
                              }`}>
                              {statusConfig[user.status]?.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : user.role === 'host'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="hidden lg:table-cell px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {new Date(user.joinDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        statusConfig[user.status]?.color
                      }`}>
                      {statusConfig[user.status]?.label}
                    </span>
                  </td>
                  <td className="hidden xl:table-cell px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        verificationConfig[user.verificationStatus]?.color
                      }`}>
                      {verificationConfig[user.verificationStatus]?.label}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-1 sm:space-x-2">
                      {user.idType &&
                        user.verificationStatus !== 'not_submitted' &&
                        user.documentUrl && (
                          <button
                            onClick={() => {
                              let formattedUrl;
                              if (
                                user.documentUrl &&
                                user.documentUrl.startsWith('http')
                              ) {
                                formattedUrl = user.documentUrl;
                              } else if (
                                user.documentUrl &&
                                user.documentUrl.startsWith('data:')
                              ) {
                                formattedUrl = user.documentUrl;
                              } else if (user.documentUrl) {
                                formattedUrl = `${
                                  import.meta.env.VITE_API_URL || ''
                                }/uploads/verifications/${
                                  user.documentUrl.split('/').pop() ||
                                  user.documentUrl
                                }`;
                              }
                              if (formattedUrl) {
                                onViewDocument(formattedUrl, user.name);
                              }
                            }}
                            className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            title="View ID Document">
                            <FiEye size={16} />
                          </button>
                        )}
                      {user.status !== 'banned' && user.role !== 'admin' && (
                        <button
                          onClick={() => onBanUser(user.id, user.name)}
                          className="p-1.5 rounded-lg text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                          title="Ban User">
                          <FiSlash size={16} />
                        </button>
                      )}
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => onDeleteUser(user.id, user.name)}
                          className="p-1.5 rounded-lg text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          title="Delete User">
                          <FiTrash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 sm:px-6 py-8 sm:py-10 text-center text-gray-500 dark:text-gray-400 text-sm">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
