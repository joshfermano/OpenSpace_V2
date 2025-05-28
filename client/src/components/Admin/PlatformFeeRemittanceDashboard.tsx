import { useState, useEffect } from 'react';
import {
  FiDollarSign,
  FiClock,
  FiAlertTriangle,
  FiCheck,
  FiLoader,
  FiCalendar,
  FiInfo,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiTrendingUp,
  FiUser,
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  platformFeeRemittanceApi,
  type PlatformFeeRemittance as PlatformFeeRemittanceType,
  RemittanceSummary,
} from '../../services/platformFeeRemittanceApi';
import { toast } from 'react-toastify';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const PlatformFeeRemittanceDashboard = () => {
  const { isAuthenticated, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [remittances, setRemittances] = useState<PlatformFeeRemittanceType[]>(
    []
  );
  const [summary, setSummary] = useState<RemittanceSummary>({
    outstanding: { amount: 0, count: 0 },
    paid: { amount: 0, count: 0 },
    overdue: { amount: 0, count: 0 },
  });
  const [statistics, setStatistics] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [period, setPeriod] = useState('month');
  const [isMarkingOverdue, setIsMarkingOverdue] = useState(false);

  // Redirect if not authenticated or not admin
  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    fetchRemittances();
  }, [statusFilter, currentPage]);

  useEffect(() => {
    fetchStatistics();
  }, [period]);

  const fetchRemittances = async () => {
    setIsLoading(true);
    try {
      const response = await platformFeeRemittanceApi.getAllRemittances({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page: currentPage,
        limit: 20,
      });

      if (response.success) {
        setRemittances(response.data.remittances);
        setSummary(response.data.summary);
        setTotalPages(response.data.pagination.pages);
      } else {
        toast.error(response.message || 'Failed to load remittances');
      }
    } catch (error) {
      console.error('Error fetching remittances:', error);
      toast.error('Failed to load remittances');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await platformFeeRemittanceApi.getPlatformFeeStatistics(
        period
      );
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleMarkOverdue = async () => {
    setIsMarkingOverdue(true);
    try {
      const response = await platformFeeRemittanceApi.markOverdueRemittances();
      if (response.success) {
        toast.success(`Marked ${response.data.updated} remittances as overdue`);
        fetchRemittances();
        fetchStatistics();
      } else {
        toast.error(response.message || 'Failed to mark overdue remittances');
      }
    } catch (error) {
      console.error('Error marking overdue remittances:', error);
      toast.error('Failed to mark overdue remittances');
    } finally {
      setIsMarkingOverdue(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'outstanding':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
      case 'paid':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      case 'overdue':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'outstanding':
        return <FiClock className="mr-1" />;
      case 'paid':
        return <FiCheck className="mr-1" />;
      case 'overdue':
        return <FiAlertTriangle className="mr-1" />;
      default:
        return <FiInfo className="mr-1" />;
    }
  };

  // Prepare chart data
  const pieChartData = [
    {
      name: 'Outstanding',
      value: summary.outstanding.amount,
      color: '#EAB308',
    },
    { name: 'Paid', value: summary.paid.amount, color: '#22C55E' },
    { name: 'Overdue', value: summary.overdue.amount, color: '#EF4444' },
  ].filter((item) => item.value > 0);

  const monthlyTrendData =
    statistics?.monthlyTrend?.map((item: any) => ({
      month: `${item._id.month}/${item._id.year}`,
      collected: item.totalCollected,
      count: item.count,
    })) || [];

  if (isLoading && remittances.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-darkBlue flex items-center justify-center">
        <div className="text-center">
          <FiLoader
            size={40}
            className="animate-spin mx-auto text-blue-600 dark:text-blue-400 mb-4"
          />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Loading remittances...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkBlue">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-light">
                Platform Fee Remittances (Admin)
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-light/80 mt-1">
                Monitor and manage platform fee collections from hosts
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleMarkOverdue}
                disabled={isMarkingOverdue}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center transition-colors disabled:opacity-50">
                {isMarkingOverdue ? (
                  <FiLoader className="animate-spin mr-2" size={16} />
                ) : (
                  <FiRefreshCw className="mr-2" size={16} />
                )}
                Mark Overdue
              </button>
            </div>
          </div>

          {/* Period Filter */}
          <div className="flex flex-wrap sm:flex-nowrap bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-1">
            {['today', 'week', 'month', 'year', 'all'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                  period === p
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">
                    Total Outstanding
                  </p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                    {formatCurrency(summary.outstanding.amount)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {summary.outstanding.count} payment
                    {summary.outstanding.count !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="p-2 sm:p-2.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex-shrink-0">
                  <FiClock
                    className="text-yellow-600 dark:text-yellow-400"
                    size={18}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">
                    Overdue Amount
                  </p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                    {formatCurrency(summary.overdue.amount)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {summary.overdue.count} overdue payment
                    {summary.overdue.count !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="p-2 sm:p-2.5 bg-red-100 dark:bg-red-900/30 rounded-lg flex-shrink-0">
                  <FiAlertTriangle
                    className="text-red-600 dark:text-red-400"
                    size={18}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">
                    Total Collected
                  </p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {formatCurrency(summary.paid.amount)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {summary.paid.count} payment
                    {summary.paid.count !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="p-2 sm:p-2.5 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
                  <FiCheck
                    className="text-green-600 dark:text-green-400"
                    size={18}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">
                    Collection Rate
                  </p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {statistics?.collectionRate
                      ? `${statistics.collectionRate.toFixed(1)}%`
                      : '0%'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Payment success rate
                  </p>
                </div>
                <div className="p-2 sm:p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                  <FiTrendingUp
                    className="text-blue-600 dark:text-blue-400"
                    size={18}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* Monthly Collection Trend */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
                Monthly Collection Trend
              </h2>
              <div className="h-64 sm:h-72">
                {monthlyTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis
                        tickFormatter={(value) => `₱${value / 1000}k`}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value) => [
                          `${formatCurrency(Number(value))}`,
                          'Collected',
                        ]}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Bar
                        dataKey="collected"
                        fill="#22C55E"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400 text-center text-sm">
                      No collection data available
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
                Remittance Status Distribution
              </h2>
              <div className="h-64 sm:h-72">
                {pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }>
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400 text-center text-sm">
                      No distribution data available
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6">
            <div className="flex flex-wrap gap-2">
              {['all', 'outstanding', 'overdue', 'paid'].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    statusFilter === status
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Remittances List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50">
            {remittances.length === 0 ? (
              <div className="p-8 text-center">
                <FiDollarSign
                  size={48}
                  className="mx-auto text-gray-400 mb-4"
                />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No remittances found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {statusFilter === 'all'
                    ? 'No platform fee remittances in the system yet.'
                    : `No ${statusFilter} remittances found.`}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {remittances.map((remittance) => (
                  <div
                    key={remittance._id}
                    className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {remittance.booking?.room?.title ||
                              'Room Unavailable'}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              remittance.status
                            )}`}>
                            {getStatusIcon(remittance.status)}
                            {remittance.status.charAt(0).toUpperCase() +
                              remittance.status.slice(1)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <FiUser size={12} />
                            <span className="truncate">
                              {(remittance as any).host?.firstName}{' '}
                              {(remittance as any).host?.lastName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FiCalendar size={12} />
                            <span>
                              {formatDate(remittance.booking.checkIn)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FiDollarSign size={12} />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {formatCurrency(remittance.platformFeeAmount)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FiClock size={12} />
                            <span>Due: {formatDate(remittance.dueDate)}</span>
                          </div>
                        </div>

                        {remittance.paymentDetails &&
                          remittance.status === 'paid' && (
                            <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs">
                              <p className="text-green-700 dark:text-green-300">
                                ✓ Paid on{' '}
                                {formatDate(
                                  remittance.paymentDetails.paymentDate!
                                )}{' '}
                                via {remittance.paymentMethod}
                              </p>
                            </div>
                          )}

                        {remittance.status === 'overdue' && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs">
                            <p className="text-red-700 dark:text-red-300">
                              ⚠ Overdue since{' '}
                              {formatDate(
                                remittance.overdueDate || remittance.dueDate
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing{' '}
                  <span className="font-medium">
                    {(currentPage - 1) * 20 + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * 20, remittances.length)}
                  </span>{' '}
                  of <span className="font-medium">{remittances.length}</span>{' '}
                  remittances
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="relative inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <FiChevronLeft className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">Previous</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}>
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="relative inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <span className="mr-1 hidden sm:inline">Next</span>
                    <FiChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlatformFeeRemittanceDashboard;
