import { useState, useEffect } from 'react';
import { FiUsers, FiFileText, FiHome, FiLock } from 'react-icons/fi';
import { FiMapPin, FiUser } from 'react-icons/fi';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { adminApi } from '../../services/adminApi';
import DashboardSummary from '../../components/Admin/DashboardSummary';
import UserManagement from '../../components/Admin/UserManagement';
import VerificationRequests from '../../components/Admin/VerificationRequests';
import RoomApprovals from '../../components/Admin/RoomApprovals';
import BannedUsers from '../../components/Admin/BannedUsers';
import AdminModal from '../../components/Admin/AdminModal';
import { getImageUrl } from '../../utils/imageUtils';

type ActionType =
  | 'approveRoom'
  | 'rejectRoom'
  | 'approveVerification'
  | 'rejectVerification'
  | 'banUser'
  | 'deleteUser';

interface Action {
  type: ActionType;
  id: string;
  userName?: string;
}

interface PreviewData {
  type: 'room' | 'document';
  data?: any;
  url?: string;
  userName?: string;
}

// Status configurations
const userStatusConfig = {
  active: {
    label: 'Active',
    color:
      'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  },
  verified: {
    label: 'Verified',
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  },
  banned: {
    label: 'Banned',
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  },
};

const verificationStatusConfig = {
  approved: {
    label: 'Approved',
    color:
      'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  },
  pending: {
    label: 'Pending',
    color:
      'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  },
  not_submitted: {
    label: 'Not Submitted',
    color: 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400',
  },
};

const AdminDashboard = () => {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const [activeTab, setActiveTab] = useState<
    'rooms' | 'verifications' | 'users' | 'banned'
  >('rooms');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [confirmAction, setConfirmAction] = useState<Action | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Data states
  const [users, setUsers] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [filteredVerifications, setFilteredVerifications] = useState<any[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<any[]>([]);

  // Pagination states
  const [usersPagination, setUsersPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
  });
  const [verificationsPagination, setVerificationsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
  });
  const [roomsPagination, setRoomsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
  });

  // Dashboard summary
  const [summaryData, setSummaryData] = useState({
    totalUsers: 0,
    verifiedUsers: 0,
    bannedUsers: 0,
    pendingVerifications: 0,
    totalSpaces: 0,
    hostCount: 0,
  });

  // Pagination handlers
  const handleUsersPageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= usersPagination.totalPages) {
      setUsersPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleVerificationsPageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= verificationsPagination.totalPages) {
      setVerificationsPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };
  const handleRoomsPageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= roomsPagination.totalPages) {
      setRoomsPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  // Pagination component
  const renderPagination = (
    currentPage: number,
    totalPages: number,
    onPageChange: (page: number) => void
  ) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-center mt-6 gap-2 pb-4">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white disabled:opacity-50 transition-colors hover:bg-gray-200 dark:hover:bg-gray-600">
          Previous
        </button>
        <span className="px-4 py-2 text-gray-700 dark:text-white">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white disabled:opacity-50 transition-colors hover:bg-gray-200 dark:hover:bg-gray-600">
          Next
        </button>
      </div>
    );
  };

  // Fetch functions with pagination
  const fetchUsers = async (page = 1) => {
    try {
      console.log('Fetching users for page:', page);
      const usersResponse = await adminApi.getUsers(page, 10);
      if (usersResponse.success) {
        const formattedUsers = usersResponse.data.map((user: any) => ({
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
          status: user.active === false ? 'banned' : 'active',
          joinDate: user.createdAt,
          verificationStatus:
            user.identificationDocument?.verificationStatus || 'not_submitted',
          idType: user.identificationDocument?.idType || '',
          documentUrl: user.identificationDocument?.idImage || '',
          imageUrl: user.profileImage,
          rooms: user.rooms?.length || 0,
        }));

        setUsers(formattedUsers);
        setFilteredUsers(formattedUsers);
        setUsersPagination({
          currentPage: usersResponse.currentPage || page,
          totalPages: usersResponse.totalPages || 1,
          totalCount: usersResponse.count || formattedUsers.length,
        });
        console.log(
          'Users loaded:',
          formattedUsers.length,
          'Total pages:',
          usersResponse.totalPages
        );
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchVerifications = async (page = 1) => {
    try {
      console.log('Fetching verifications for page:', page);
      const verificationsResponse = await adminApi.getPendingIdVerifications();
      if (verificationsResponse.success) {
        const formattedVerifications = verificationsResponse.data
          .filter((verification: any) => verification.role !== 'admin')
          .map((verification: any) => ({
            id: verification._id,
            userId: verification._id,
            userName: `${verification.firstName} ${verification.lastName}`,
            userEmail: verification.email,
            idType: verification.identificationDocument?.idType || 'Unknown',
            submissionDate:
              verification.identificationDocument?.uploadDate ||
              new Date().toISOString(),
            status:
              verification.identificationDocument?.verificationStatus ||
              'pending',
            documentUrl: verification.identificationDocument?.idImage || '',
            imageUrl: verification.profileImage,
          }));

        setVerifications(formattedVerifications);
        setFilteredVerifications(formattedVerifications);
        // Note: getPendingIdVerifications doesn't support pagination yet, so we'll use simple pagination
        const itemsPerPage = 10;
        const totalPages = Math.ceil(
          formattedVerifications.length / itemsPerPage
        );
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedData = formattedVerifications.slice(
          startIndex,
          endIndex
        );

        setFilteredVerifications(paginatedData);
        setVerificationsPagination({
          currentPage: page,
          totalPages: totalPages,
          totalCount: formattedVerifications.length,
        });
        console.log('Verifications loaded:', formattedVerifications.length);
      }
    } catch (error) {
      console.error('Error fetching verifications:', error);
    }
  };

  const fetchRooms = async (page = 1) => {
    try {
      console.log('Fetching rooms for page:', page);
      const response = await adminApi.getPendingRoomApprovals();
      if (response.success) {
        const roomsData = response.data || [];
        setRooms(roomsData);

        // Simple pagination for rooms since API might not support it yet
        const itemsPerPage = 10;
        const totalPages = Math.ceil(roomsData.length / itemsPerPage);
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedData = roomsData.slice(startIndex, endIndex);

        setFilteredRooms(paginatedData);
        setRoomsPagination({
          currentPage: page,
          totalPages: totalPages,
          totalCount: roomsData.length,
        });
        console.log('Rooms loaded:', roomsData.length);
      } else {
        console.error(
          'Failed to fetch pending room approvals:',
          response.message
        );
      }
    } catch (error) {
      console.error('Error fetching pending room approvals:', error);
    }
  };

  useEffect(() => {
    fetchRooms(roomsPagination.currentPage);
  }, [roomsPagination.currentPage]);

  useEffect(() => {
    fetchUsers(usersPagination.currentPage);
  }, [usersPagination.currentPage]);

  useEffect(() => {
    fetchVerifications(verificationsPagination.currentPage);
  }, [verificationsPagination.currentPage]);

  // Fetch data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Fetch dashboard summary
        console.log('Fetching dashboard summary...');
        const summaryResponse = await adminApi.getDashboardSummary();
        console.log('Dashboard summary response:', summaryResponse);

        if (summaryResponse.success && summaryResponse.data) {
          const data = summaryResponse.data;
          setSummaryData({
            totalUsers: data.totalUsers || 0,
            verifiedUsers: data.verifiedUsers || 0,
            bannedUsers: data.bannedUsers || 0,
            pendingVerifications: data.pendingVerifications || 0,
            totalSpaces: data.totalSpaces || 0,
            hostCount: data.hostCount || 0,
          });
          console.log('Dashboard summary updated successfully:', data);
        } else {
          console.error(
            'Failed to load dashboard summary:',
            summaryResponse.message
          );
        }

        // Initial data fetch for all tabs
        await fetchUsers(1);
        await fetchVerifications(1);
        await fetchRooms(1);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
      setFilteredVerifications(verifications);
      setFilteredRooms(rooms);
      return;
    }

    const search = searchTerm.toLowerCase();

    switch (activeTab) {
      case 'rooms':
        setFilteredRooms(
          rooms.filter(
            (room) =>
              room.name?.toLowerCase().includes(search) ||
              room.location?.toLowerCase().includes(search) ||
              room.category?.toLowerCase().includes(search)
          )
        );
        break;
      case 'verifications':
        setFilteredVerifications(
          verifications.filter(
            (request) =>
              request.userName?.toLowerCase().includes(search) ||
              request.userEmail?.toLowerCase().includes(search)
          )
        );
        break;
      case 'users':
        setFilteredUsers(
          users.filter(
            (user) =>
              user.name?.toLowerCase().includes(search) ||
              user.email?.toLowerCase().includes(search) ||
              user.role?.toLowerCase().includes(search)
          )
        );
        break;
    }
  }, [searchTerm, activeTab, users, verifications, rooms]);

  const tabs = [
    { id: 'rooms' as const, label: 'Room Approvals', icon: FiHome },
    { id: 'verifications' as const, label: 'Verifications', icon: FiFileText },
    { id: 'users' as const, label: 'Users', icon: FiUsers },
    { id: 'banned' as const, label: 'Banned Users', icon: FiLock },
  ];

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
    const parent = e.currentTarget.parentElement;
    if (parent) {
      const iconDiv = document.createElement('div');
      iconDiv.className = 'h-full w-full flex items-center justify-center';
      parent.appendChild(iconDiv);
      iconDiv.innerHTML =
        '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>';
    }
  };

  const handleApproveRoom = async (roomId: string) => {
    try {
      const response = await adminApi.approveRoom(roomId, true);
      if (response.success) {
        // Update your state to reflect the approval
        setRooms(rooms.filter((room) => room._id !== roomId));
      }
    } catch (error) {
      console.error('Error approving room:', error);
    }
  };

  const handleRejectRoom = async (roomId: string) => {
    try {
      const response = await adminApi.approveRoom(roomId, false);
      if (response.success) {
        // Update your state to reflect the rejection
        setRooms(rooms.filter((room) => room._id !== roomId));
      }
    } catch (error) {
      console.error('Error rejecting room:', error);
    }
  };

  const handleConfirmAction = async (action: Action) => {
    try {
      switch (action.type) {
        case 'approveRoom':
          // Handle room approval
          const approveResponse = await adminApi.approveRoom(action.id, true);
          if (approveResponse.success) {
            setRooms((prevRooms) =>
              prevRooms.map((room) =>
                room.id === action.id ? { ...room, status: 'approved' } : room
              )
            );
            setFilteredRooms((prevRooms) =>
              prevRooms.map((room) =>
                room.id === action.id ? { ...room, status: 'approved' } : room
              )
            );
          }
          break;
        case 'rejectRoom':
          // Handle room rejection
          const rejectResponse = await adminApi.approveRoom(
            action.id,
            false,
            'Does not meet platform standards'
          );
          if (rejectResponse.success) {
            setRooms((prevRooms) =>
              prevRooms.map((room) =>
                room.id === action.id ? { ...room, status: 'rejected' } : room
              )
            );
            setFilteredRooms((prevRooms) =>
              prevRooms.map((room) =>
                room.id === action.id ? { ...room, status: 'rejected' } : room
              )
            );
          }
          break;
        case 'approveVerification':
          // Handle verification approval
          const verifyResponse = await adminApi.verifyUserIdDocument(
            action.id,
            {
              isApproved: true,
            }
          );
          if (verifyResponse.success) {
            setVerifications((prevVerifications) =>
              prevVerifications.map((v) =>
                v.userId === action.id ? { ...v, status: 'approved' } : v
              )
            );
            setFilteredVerifications((prevVerifications) =>
              prevVerifications.map((v) =>
                v.userId === action.id ? { ...v, status: 'approved' } : v
              )
            );
          }
          break;
        case 'rejectVerification':
          // Handle verification rejection
          const rejectVerifyResponse = await adminApi.verifyUserIdDocument(
            action.id,
            {
              isApproved: false,
              rejectionReason:
                'Document does not meet verification requirements',
            }
          );
          if (rejectVerifyResponse.success) {
            setVerifications((prevVerifications) =>
              prevVerifications.map((v) =>
                v.userId === action.id ? { ...v, status: 'rejected' } : v
              )
            );
            setFilteredVerifications((prevVerifications) =>
              prevVerifications.map((v) =>
                v.userId === action.id ? { ...v, status: 'rejected' } : v
              )
            );
          }
          break;
        case 'banUser':
          // Handle user ban
          const banResponse = await adminApi.banUser(action.id);
          if (banResponse.success) {
            setUsers((prevUsers) =>
              prevUsers.map((user) =>
                user.id === action.id ? { ...user, status: 'banned' } : user
              )
            );
            setFilteredUsers((prevUsers) =>
              prevUsers.map((user) =>
                user.id === action.id ? { ...user, status: 'banned' } : user
              )
            );
          }
          break;
        case 'deleteUser':
          // Handle user deletion
          const deleteResponse = await adminApi.deleteUser(action.id);
          if (deleteResponse.success) {
            setUsers((prevUsers) =>
              prevUsers.filter((user) => user.id !== action.id)
            );
            setFilteredUsers((prevUsers) =>
              prevUsers.filter((user) => user.id !== action.id)
            );
          }
          break;
      }
    } catch (error) {
      console.error(`Error handling action ${action.type}:`, error);
    } finally {
      setConfirmAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-darkBlue flex items-center justify-center">
        <div className="animate-pulse text-xl text-gray-600 dark:text-gray-300">
          Loading admin dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkBlue">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-light">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-light/80 mt-1">
                Manage spaces, users, and verification requests
              </p>
            </div>

            <div>
              <Link
                to="/admin/revenue"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                View Revenue Dashboard
              </Link>
            </div>
          </div>

          {/* Summary Cards */}
          <DashboardSummary {...summaryData} />

          {/* Tabs Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-3 text-xs md:text-sm font-medium transition-colors
                  ${
                    activeTab === tab.id
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}>
                <tab.icon className="mr-2" size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          {activeTab !== 'banned' && (
            <div className="relative">
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 
                  bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 
                  focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
              />
            </div>
          )}

          {/* Content Area */}
          <div className="mt-6">
            {' '}
            {activeTab === 'rooms' && (
              <>
                <RoomApprovals
                  rooms={filteredRooms}
                  onViewRoom={(room) => {
                    console.log('Room data received:', room); // Debug log
                    setPreviewData({
                      type: 'room',
                      data: room,
                    });
                  }}
                  onApproveRoom={handleApproveRoom}
                  onRejectRoom={handleRejectRoom}
                  onImageError={handleImageError}
                />
                {renderPagination(
                  roomsPagination.currentPage,
                  roomsPagination.totalPages,
                  handleRoomsPageChange
                )}
              </>
            )}{' '}
            {activeTab === 'verifications' && (
              <>
                <VerificationRequests
                  requests={filteredVerifications}
                  statusConfig={verificationStatusConfig}
                  onViewDocument={(url, userName) => {
                    console.log('Viewing verification document with URL:', url);
                    setPreviewData({ type: 'document', url, userName });
                  }}
                  onApproveRequest={(_, userId) =>
                    setConfirmAction({
                      type: 'approveVerification',
                      id: userId,
                    })
                  }
                  onRejectRequest={(_, userId) =>
                    setConfirmAction({
                      type: 'rejectVerification',
                      id: userId,
                    })
                  }
                  onImageError={handleImageError}
                />
                {renderPagination(
                  verificationsPagination.currentPage,
                  verificationsPagination.totalPages,
                  handleVerificationsPageChange
                )}
              </>
            )}{' '}
            {activeTab === 'users' && (
              <>
                <UserManagement
                  users={filteredUsers}
                  statusConfig={userStatusConfig}
                  verificationConfig={verificationStatusConfig}
                  onViewDocument={(url, userName) => {
                    console.log('Viewing document with URL:', url);
                    setPreviewData({ type: 'document', url, userName });
                  }}
                  onBanUser={(userId, userName) =>
                    setConfirmAction({ type: 'banUser', id: userId, userName })
                  }
                  onDeleteUser={(userId, userName) =>
                    setConfirmAction({
                      type: 'deleteUser',
                      id: userId,
                      userName,
                    })
                  }
                  onImageError={handleImageError}
                />
                {renderPagination(
                  usersPagination.currentPage,
                  usersPagination.totalPages,
                  handleUsersPageChange
                )}
              </>
            )}
            {activeTab === 'banned' && <BannedUsers />}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <AdminModal
        isOpen={!!previewData}
        title={
          previewData?.type === 'room'
            ? previewData.data?.title || 'Space Details'
            : `ID Document - ${previewData?.userName}`
        }
        onClose={() => setPreviewData(null)}
        footerContent={
          previewData?.type === 'room' &&
          previewData.data && (
            <div className="flex w-full justify-end">
              <button
                onClick={() => setPreviewData(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                Close
              </button>
            </div>
          )
        }>
        {previewData?.type === 'room' && previewData.data ? (
          <div className="space-y-6 max-h-[650px] overflow-y-auto">
            {/* Hero image with status badge */}
            <div className="relative rounded-xl overflow-hidden h-64 bg-gray-100 dark:bg-gray-800">
              {previewData.data.images && previewData.data.images.length > 0 ? (
                <img
                  src={getImageUrl(previewData.data.images[0])}
                  alt={previewData.data.title || 'Room preview'}
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <FiHome className="text-gray-400" size={48} />
                </div>
              )}
              <div
                className={`absolute top-3 right-3 px-3 py-1 rounded-full text-sm font-medium tracking-wide
                  ${
                    previewData.data.status === 'pending'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      : previewData.data.status === 'approved'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                  }`}>
                {previewData.data.status?.charAt(0).toUpperCase() +
                  previewData.data.status?.slice(1) || 'Unknown'}
              </div>
            </div>

            {/* Basic info */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {previewData.data.title}
              </h2>
              <div className="flex items-center mt-1 text-sm text-gray-500 dark:text-gray-400">
                <FiMapPin className="mr-1" size={14} />
                <span>
                  {previewData.data.location
                    ? `${previewData.data.location.city}, ${previewData.data.location.state}`
                    : 'Location unavailable'}
                </span>
              </div>
            </div>

            {/* Key details in a clean grid */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
                  Type
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {previewData.data.type === 'conference'
                    ? 'Conference Room'
                    : previewData.data.type === 'event'
                    ? 'Events Place'
                    : previewData.data.type === 'stay'
                    ? 'Room Stay'
                    : previewData.data.type || 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
                  Price
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  ₱
                  {Number(
                    previewData.data.price?.basePrice || 0
                  ).toLocaleString()}
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {previewData.data.type === 'conference'
                      ? ' / hour'
                      : ' / night'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
                  Capacity
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {previewData.data.capacity?.maxGuests || 0} people
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
                  Created
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {previewData.data.createdAt
                    ? new Date(previewData.data.createdAt).toLocaleDateString(
                        'en-US',
                        {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }
                      )
                    : 'Unknown'}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-3">
                {previewData.data.description || 'No description provided'}
              </p>
            </div>

            {/* Amenities tags */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amenities
              </h3>
              <div className="flex flex-wrap gap-2">
                {previewData.data.amenities &&
                previewData.data.amenities.length > 0 ? (
                  previewData.data.amenities
                    .slice(0, 8)
                    .map((amenity: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 
                         text-xs rounded-full">
                        {amenity}
                      </span>
                    ))
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    No amenities listed
                  </span>
                )}
                {previewData.data.amenities &&
                  previewData.data.amenities.length > 8 && (
                    <span
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 
                   text-xs rounded-full">
                      +{previewData.data.amenities.length - 8} more
                    </span>
                  )}
              </div>
            </div>

            {/* Host info - compact version */}
            <div className="flex items-center pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mr-3">
                {previewData.data.host?.profileImage ? (
                  <img
                    src={getImageUrl(previewData.data.host.profileImage)}
                    alt="Host"
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <FiUser size={14} />
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900 dark:text-white">
                  {previewData.data.host
                    ? `${previewData.data.host.firstName || ''} ${
                        previewData.data.host.lastName || ''
                      }`
                    : 'Unknown Host'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Host</p>
              </div>
            </div>

            {/* More images - thumbnails */}
            {previewData.data.images && previewData.data.images.length > 1 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  More Photos
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {previewData.data.images
                    .slice(1, 5)
                    .map((url: string, index: number) => (
                      <div
                        key={index + 1}
                        className="aspect-square rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <img
                          src={url}
                          alt={`Room preview ${index + 2}`}
                          className="w-full h-full object-cover"
                          onError={handleImageError}
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : previewData?.type === 'document' && previewData.url ? (
          <div className="flex flex-col items-center">
            <img
              src={previewData.url}
              alt="Verification document"
              className="max-w-full max-h-[70vh] object-contain"
              onError={handleImageError}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-40">
            <p className="text-gray-500 dark:text-gray-400">
              No preview data available
            </p>
          </div>
        )}
      </AdminModal>

      {/* Confirmation Modal */}
      <AdminModal
        isOpen={!!confirmAction}
        title={
          confirmAction?.type === 'approveRoom'
            ? 'Approve Room Listing'
            : confirmAction?.type === 'rejectRoom'
            ? 'Reject Room Listing'
            : confirmAction?.type === 'approveVerification'
            ? 'Approve Verification'
            : confirmAction?.type === 'rejectVerification'
            ? 'Reject Verification'
            : confirmAction?.type === 'banUser'
            ? 'Ban User'
            : confirmAction?.type === 'deleteUser'
            ? 'Delete User'
            : ''
        }
        onClose={() => setConfirmAction(null)}
        footerContent={
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setConfirmAction(null)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-light 
          rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
              Cancel
            </button>
            <button
              onClick={() =>
                confirmAction && handleConfirmAction(confirmAction)
              }
              className={`px-4 py-2 text-white dark:text-light rounded-lg transition-colors ${
                [
                  'rejectRoom',
                  'rejectVerification',
                  'banUser',
                  'deleteUser',
                ].includes(confirmAction?.type || '')
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-green-500 hover:bg-green-600'
              }`}>
              Confirm
            </button>
          </div>
        }>
        {confirmAction?.type === 'approveRoom'
          ? 'Are you sure you want to approve this room listing? It will be visible to all users.'
          : confirmAction?.type === 'rejectRoom'
          ? 'Are you sure you want to reject this room listing? The host will be notified.'
          : confirmAction?.type === 'approveVerification'
          ? 'Are you sure you want to approve this verification request? The user will be marked as verified.'
          : confirmAction?.type === 'rejectVerification'
          ? 'Are you sure you want to reject this verification request? The user will need to submit new documents.'
          : confirmAction?.type === 'banUser'
          ? `Are you sure you want to ban ${confirmAction.userName}? They will no longer be able to access the platform.`
          : confirmAction?.type === 'deleteUser'
          ? `Are you sure you want to permanently delete ${confirmAction.userName}? This action cannot be undone.`
          : null}
      </AdminModal>
    </div>
  );
};

export default AdminDashboard;
