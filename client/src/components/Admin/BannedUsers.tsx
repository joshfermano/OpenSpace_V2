import { useState, useEffect } from 'react';
import {
  FiRefreshCcw,
  FiTrash2,
  FiUser,
  FiCalendar,
  FiAlertCircle,
  FiSearch,
} from 'react-icons/fi';
import { adminApi } from '../../services/adminApi';
import AdminModal from './AdminModal';

interface BannedUser {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  banReason?: string;
  role: string;
  joinDate: string;
}

const BannedUsers = () => {
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [filteredBannedUsers, setFilteredBannedUsers] = useState<BannedUser[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'unban' | 'delete';
    userId: string;
    userName: string;
  } | null>(null);
  const [selectedUser, setSelectedUser] = useState<BannedUser | null>(null);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);

  const fetchBannedUsers = async (page = 1) => {
    setLoading(true);
    try {
      const response = await adminApi.getBannedUsers(page);

      if (response.success) {
        const formattedUsers = response.data.map(
          (user: {
            _id: string;
            firstName: string;
            lastName: string;
            email: string;
            profileImage?: string;
            banReason?: string;
            role: string;
            createdAt: string;
          }) => ({
            id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            profileImage: user.profileImage,
            banReason: user.banReason,
            role: user.role,
            joinDate: new Date(user.createdAt).toLocaleDateString(),
          })
        );

        setBannedUsers(formattedUsers);
        setFilteredBannedUsers(formattedUsers);
        setTotalPages(response.totalPages || 1);
        setCurrentPage(response.currentPage || 1);
      } else {
        setError(response.message || 'Error fetching banned users');
      }
    } catch (err) {
      setError('Failed to fetch banned users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBannedUsers(currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredBannedUsers(bannedUsers);
      return;
    }

    const filtered = bannedUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.banReason &&
          user.banReason.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setFilteredBannedUsers(filtered);
  }, [searchTerm, bannedUsers]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleUnbanUser = async (userId: string, userName: string) => {
    setConfirmAction({
      type: 'unban',
      userId,
      userName,
    });
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    setConfirmAction({
      type: 'delete',
      userId,
      userName,
    });
  };

  const executeAction = async () => {
    if (!confirmAction) return;

    try {
      if (confirmAction.type === 'unban') {
        const response = await adminApi.unbanUser(confirmAction.userId);
        if (response.success) {
          fetchBannedUsers(currentPage);
        } else {
          setError(response.message || 'Failed to unban user');
        }
      } else if (confirmAction.type === 'delete') {
        const response = await adminApi.deleteUser(confirmAction.userId);
        if (response.success) {
          fetchBannedUsers(currentPage);
        } else {
          setError(response.message || 'Failed to delete user');
        }
      }
    } catch (err) {
      setError('Action failed');
      console.error(err);
    } finally {
      setConfirmAction(null);
    }
  };

  const viewUserDetails = (user: BannedUser) => {
    setSelectedUser(user);
    setShowUserDetailsModal(true);
  };

  const renderPagination = () => {
    return (
      <div className="flex flex-col sm:flex-row justify-center items-center mt-4 sm:mt-6 gap-3 p-4">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white disabled:opacity-50 transition-colors hover:bg-gray-200 dark:hover:bg-gray-600 text-sm">
          Previous
        </button>
        <span className="px-4 py-2 text-gray-700 dark:text-white text-sm font-medium">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white disabled:opacity-50 transition-colors hover:bg-gray-200 dark:hover:bg-gray-600 text-sm">
          Next
        </button>
      </div>
    );
  };

  if (loading && bannedUsers.length === 0) {
    return (
      <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm p-6">
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-gray-500 dark:text-gray-400">
            Loading banned users...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white flex items-center flex-wrap gap-2">
              <FiAlertCircle className="text-red-500 flex-shrink-0" size={20} />
              <span>Banned Users</span>
              <span className="px-2.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs font-medium rounded-full">
                {filteredBannedUsers.length}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage users who have been banned from the platform
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" size={16} />
              </div>
              <input
                type="text"
                placeholder="Search banned users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 
                  bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 
                  focus:ring-blue-500 focus:border-transparent outline-none transition-colors text-sm"
              />
            </div>
            <button
              onClick={() => fetchBannedUsers(currentPage)}
              className="flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors whitespace-nowrap text-sm">
              <FiRefreshCcw className="mr-2" size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 mx-6 mt-4 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg flex items-center">
          <FiAlertCircle className="mr-2" size={16} />
          {error}
        </div>
      )}

      {/* Mobile Cards View */}
      <div className="block sm:hidden">
        <div className="p-4 space-y-4">
          {filteredBannedUsers.length > 0 ? (
            filteredBannedUsers.map((user) => (
              <div
                key={user.id}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                onClick={() => viewUserDetails(user)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      {user.profileImage ? (
                        <img
                          src={
                            user.profileImage.startsWith('http')
                              ? user.profileImage
                              : `${import.meta.env.VITE_API_URL || ''}${
                                  user.profileImage
                                }`
                          }
                          alt={user.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML =
                              '<div class="h-full w-full flex items-center justify-center"><svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>';
                          }}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-400">
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
                  <div
                    className="flex flex-col items-end space-y-2"
                    onClick={(e) => e.stopPropagation()}>
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : user.role === 'host'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                      {user.role}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUnbanUser(user.id, user.name)}
                        className="p-1.5 rounded-lg text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        title="Unban User">
                        <FiRefreshCcw size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        className="p-1.5 rounded-lg text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        title="Delete User">
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <FiCalendar className="mr-1 flex-shrink-0" size={12} />
                    <span>Joined: {user.joinDate}</span>
                  </div>
                  <div className="flex items-start">
                    <FiAlertCircle
                      className="text-red-500 mr-1 flex-shrink-0 mt-0.5"
                      size={12}
                    />
                    <span className="line-clamp-2">
                      {user.banReason || 'No reason provided'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              {searchTerm
                ? 'No users found matching your search criteria'
                : 'No banned users found'}
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
                Ban Reason
              </th>
              <th
                scope="col"
                className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredBannedUsers.length > 0 ? (
              filteredBannedUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                  onClick={() => viewUserDetails(user)}>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 sm:h-10 w-8 sm:w-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        {user.profileImage ? (
                          <img
                            src={
                              user.profileImage.startsWith('http')
                                ? user.profileImage
                                : `${import.meta.env.VITE_API_URL || ''}${
                                    user.profileImage
                                  }`
                            }
                            alt={user.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement!.innerHTML =
                                '<div class="h-full w-full flex items-center justify-center"><svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="20" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>';
                            }}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-gray-400">
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
                    <div className="text-sm text-gray-900 dark:text-white flex items-center">
                      <FiCalendar className="mr-1 flex-shrink-0" size={14} />
                      <span>{user.joinDate}</span>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center max-w-xs">
                      <FiAlertCircle
                        className="text-red-500 mr-1 flex-shrink-0"
                        size={14}
                      />
                      <span className="truncate">
                        {user.banReason || 'No reason provided'}
                      </span>
                    </div>
                  </td>
                  <td
                    className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                    onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end space-x-1 sm:space-x-2">
                      <button
                        onClick={() => handleUnbanUser(user.id, user.name)}
                        className="p-1.5 rounded-lg text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        title="Unban User">
                        <FiRefreshCcw size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        className="p-1.5 rounded-lg text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        title="Delete User">
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 sm:px-6 py-8 sm:py-10 text-center text-gray-500 dark:text-gray-400 text-sm">
                  {searchTerm
                    ? 'No users found matching your search criteria'
                    : 'No banned users found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {bannedUsers.length > 0 && renderPagination()}

      {/* Confirmation Modal */}
      <AdminModal
        isOpen={!!confirmAction}
        title={confirmAction?.type === 'unban' ? 'Unban User' : 'Delete User'}
        onClose={() => setConfirmAction(null)}
        footerContent={
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setConfirmAction(null)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white 
                rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
              Cancel
            </button>
            <button
              onClick={executeAction}
              className={`px-4 py-2 text-white rounded-lg transition-colors ${
                confirmAction?.type === 'delete'
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-green-500 hover:bg-green-600'
              }`}>
              Confirm
            </button>
          </div>
        }>
        {confirmAction?.type === 'unban'
          ? `Are you sure you want to unban ${confirmAction?.userName}? They will regain access to the platform.`
          : `Are you sure you want to permanently delete ${confirmAction?.userName}? This action cannot be undone.`}
      </AdminModal>

      {/* User Details Modal */}
      <AdminModal
        isOpen={showUserDetailsModal}
        title="Banned User Details"
        onClose={() => setShowUserDetailsModal(false)}
        footerContent={
          <div className="flex justify-between w-full">
            <button
              onClick={() => {
                setShowUserDetailsModal(false);
                handleDeleteUser(
                  selectedUser?.id || '',
                  selectedUser?.name || ''
                );
              }}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
              Delete Permanently
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setShowUserDetailsModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                Close
              </button>
              <button
                onClick={() => {
                  setShowUserDetailsModal(false);
                  handleUnbanUser(
                    selectedUser?.id || '',
                    selectedUser?.name || ''
                  );
                }}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors">
                Unban User
              </button>
            </div>
          </div>
        }>
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                {selectedUser.profileImage ? (
                  <img
                    src={
                      selectedUser.profileImage.startsWith('http')
                        ? selectedUser.profileImage
                        : `${import.meta.env.VITE_API_URL || ''}${
                            selectedUser.profileImage
                          }`
                    }
                    alt={selectedUser.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-400">
                    <FiUser size={42} />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedUser.name}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-1">
                  {selectedUser.email}
                </p>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300`}>
                    Banned
                  </span>
                  <span
                    className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      selectedUser.role === 'admin'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        : selectedUser.role === 'host'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                    {selectedUser.role}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">
                  Account Created
                </p>
                <p className="font-medium text-gray-900 dark:text-white flex items-center">
                  <FiCalendar className="mr-2" size={16} />
                  {selectedUser.joinDate}
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">
                  Role
                </p>
                <p className="font-medium text-gray-900 dark:text-white flex items-center">
                  <FiUser className="mr-2" size={16} />
                  {selectedUser.role.charAt(0).toUpperCase() +
                    selectedUser.role.slice(1)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                <FiAlertCircle className="text-red-500 mr-2" size={18} />
                Ban Reason
              </h4>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg">
                {selectedUser.banReason ||
                  'No specific reason was provided when this user was banned.'}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                Actions
              </h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setShowUserDetailsModal(false);
                    handleUnbanUser(selectedUser.id, selectedUser.name);
                  }}
                  className="flex-1 flex items-center justify-center py-2.5 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors">
                  <FiRefreshCcw className="mr-2" size={16} />
                  Restore User Access
                </button>
                <button
                  onClick={() => {
                    setShowUserDetailsModal(false);
                    handleDeleteUser(selectedUser.id, selectedUser.name);
                  }}
                  className="flex-1 flex items-center justify-center py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
                  <FiTrash2 className="mr-2" size={16} />
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
};

export default BannedUsers;
