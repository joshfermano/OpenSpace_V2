import React from 'react';

interface AdminModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footerContent?: React.ReactNode;
}

const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  title,
  onClose,
  children,
  footerContent,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-90"
        onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden z-10 border border-gray-200/50 dark:border-gray-700/50">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
              aria-label="Close modal">
              <svg
                className="w-5 h-5 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-140px)] dark:text-light">
          {children}
        </div>

        {/* Footer */}
        {footerContent && (
          <div className="px-4 sm:px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3 sm:justify-end">
            {footerContent}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminModal;
