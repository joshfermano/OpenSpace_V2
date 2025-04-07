import {
  FiUsers,
  FiHome,
  FiCheckCircle,
  FiAlertCircle,
  FiUserCheck,
  FiUserX,
} from 'react-icons/fi';

interface DashboardSummaryProps {
  totalUsers: number;
  verifiedUsers: number;
  bannedUsers: number;
  pendingVerifications: number;
  totalSpaces: number;
  hostCount: number;
  unverifiedUsers?: number;
}

const DashboardSummary = ({
  totalUsers,
  verifiedUsers,
  bannedUsers,
  pendingVerifications,
  totalSpaces,
  hostCount,
  unverifiedUsers = 0,
}: DashboardSummaryProps) => {
  // Calculate the unverified users if not provided
  const calculatedUnverifiedUsers =
    unverifiedUsers || totalUsers - verifiedUsers - bannedUsers;

  // Summary data
  const summaryCards = [
    {
      title: 'Total Users',
      value: totalUsers,
      icon: FiUsers,
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Verified Users',
      value: verifiedUsers,
      icon: FiUserCheck,
      color:
        'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    },
    {
      title: 'Unverified Users',
      value: calculatedUnverifiedUsers,
      icon: FiAlertCircle,
      color:
        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    },
    {
      title: 'Banned Users',
      value: bannedUsers,
      icon: FiUserX,
      color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    },
    {
      title: 'Pending Verifications',
      value: pendingVerifications,
      icon: FiCheckCircle,
      color:
        'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Total Spaces',
      value: totalSpaces,
      icon: FiHome,
      color:
        'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {summaryCards.map((card, index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {card.title}
              </h3>
              <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
                {card.value.toLocaleString()}
              </p>
            </div>
            <div className={`p-3 rounded-full ${card.color}`}>
              <card.icon size={24} />
            </div>
          </div>

          {/* For hosts, add additional info */}
          {card.title === 'Total Spaces' && (
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium">{hostCount.toLocaleString()}</span>{' '}
              active hosts
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DashboardSummary;
