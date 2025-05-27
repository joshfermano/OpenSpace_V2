import React from 'react';
import { FiEye, FiCheckCircle, FiXCircle, FiUser } from 'react-icons/fi';

// Types
interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  idType: string;
  submissionDate: string;
  status: string;
  documentUrl: string;
  imageUrl: string | null;
  businessDocument?: {
    certificateType: string;
    certificateNumber: string;
    certificateImage: string;
    uploadDate: Date;
  };
}

interface StatusConfig {
  label: string;
  color: string;
}

interface VerificationRequestsProps {
  requests: VerificationRequest[];
  statusConfig: Record<string, StatusConfig>;
  onViewDocument: (url: string, userName: string) => void;
  onApproveRequest: (requestId: string, userId: string) => void;
  onRejectRequest: (requestId: string, userId: string) => void;
  onImageError: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

const VerificationRequests: React.FC<VerificationRequestsProps> = ({
  requests,
  statusConfig,
  onViewDocument,
  onApproveRequest,
  onRejectRequest,
  onImageError,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
      {/* Mobile Cards View */}
      <div className="block sm:hidden">
        <div className="p-4 space-y-4">
          {requests.length > 0 ? (
            requests.map((request) => (
              <div
                key={request.id}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 h-10 w-10 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      {request.imageUrl ? (
                        <img
                          className="h-10 w-10 rounded-full object-cover"
                          src={
                            request.imageUrl.startsWith('http')
                              ? request.imageUrl
                              : `${import.meta.env.VITE_API_URL || ''}${
                                  request.imageUrl
                                }`
                          }
                          alt={request.userName}
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
                        {request.userName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {request.userEmail}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        statusConfig[request.status]?.color
                      }`}>
                      {statusConfig[request.status]?.label}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <div className="flex justify-between">
                    <span className="font-medium">ID Type:</span>
                    <span className="text-gray-900 dark:text-white">
                      {request.idType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Submitted:</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(request.submissionDate).toLocaleDateString(
                        'en-US',
                        {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        }
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      let formattedUrl;
                      if (request.documentUrl.startsWith('http')) {
                        formattedUrl = request.documentUrl;
                      } else if (request.documentUrl.startsWith('data:')) {
                        formattedUrl = request.documentUrl;
                      } else {
                        formattedUrl = `${import.meta.env.VITE_API_URL || ''}${
                          request.documentUrl
                        }`;
                      }
                      onViewDocument(formattedUrl, request.userName);
                    }}
                    className="flex-1 flex items-center justify-center text-xs py-2 px-3 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                    <FiEye className="mr-1" size={16} />
                    View Document
                  </button>
                  {request.status === 'pending' && (
                    <>
                      <button
                        onClick={() =>
                          onApproveRequest(request.id, request.userId)
                        }
                        className="flex-1 flex items-center justify-center py-2 px-3 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors text-xs">
                        <FiCheckCircle className="mr-1" size={16} />
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          onRejectRequest(request.id, request.userId)
                        }
                        className="flex-1 flex items-center justify-center py-2 px-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-xs">
                        <FiXCircle className="mr-1" size={16} />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-light text-sm">
              No verification requests found
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
                ID Type
              </th>
              <th
                scope="col"
                className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Submitted
              </th>
              <th
                scope="col"
                className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th
                scope="col"
                className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {requests.length > 0 ? (
              requests.map((request) => (
                <tr
                  key={request.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-300">
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 sm:h-10 w-8 sm:w-10 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        {request.imageUrl ? (
                          <img
                            className="h-8 sm:h-10 w-8 sm:w-10 rounded-full object-cover"
                            src={
                              request.imageUrl.startsWith('http')
                                ? request.imageUrl
                                : `${import.meta.env.VITE_API_URL || ''}${
                                    request.imageUrl
                                  }`
                            }
                            alt={request.userName}
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
                          {request.userName}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                          {request.userEmail}
                        </div>
                        {/* Show additional info on smaller screens */}
                        <div className="lg:hidden mt-1 space-y-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                statusConfig[request.status]?.color
                              }`}>
                              {statusConfig[request.status]?.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {request.idType}
                    </div>
                    {/* Show submission date on small screens */}
                    <div className="md:hidden text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(request.submissionDate).toLocaleDateString(
                        'en-US',
                        {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        }
                      )}
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {new Date(request.submissionDate).toLocaleDateString(
                        'en-US',
                        {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        }
                      )}
                    </div>
                  </td>
                  <td className="hidden lg:table-cell px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        statusConfig[request.status]?.color
                      }`}>
                      {statusConfig[request.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-1 sm:space-x-2">
                      <button
                        onClick={() => {
                          let formattedUrl;
                          if (request.documentUrl.startsWith('http')) {
                            formattedUrl = request.documentUrl;
                          } else if (request.documentUrl.startsWith('data:')) {
                            formattedUrl = request.documentUrl;
                          } else {
                            formattedUrl = `${
                              import.meta.env.VITE_API_URL || ''
                            }${request.documentUrl}`;
                          }
                          onViewDocument(formattedUrl, request.userName);
                        }}
                        className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        title="View Document">
                        <FiEye size={16} />
                      </button>
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() =>
                              onApproveRequest(request.id, request.userId)
                            }
                            className="p-1.5 rounded-lg text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                            title="Approve">
                            <FiCheckCircle size={16} />
                          </button>
                          <button
                            onClick={() =>
                              onRejectRequest(request.id, request.userId)
                            }
                            className="p-1.5 rounded-lg text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            title="Reject">
                            <FiXCircle size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 sm:px-6 py-8 sm:py-10 text-center text-gray-500 dark:text-gray-400 text-sm">
                  No verification requests found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VerificationRequests;
