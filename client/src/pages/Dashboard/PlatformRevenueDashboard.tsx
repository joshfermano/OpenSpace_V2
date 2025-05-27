import { useState, useEffect } from 'react';
import { FiDollarSign, FiUsers, FiPieChart, FiLoader } from 'react-icons/fi';
import { adminEarningsApi } from '../../services/adminEarningsApi';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const PlatformRevenueDashboard = () => {
  const { isAuthenticated, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [revenueData, setRevenueData] = useState<any>({
    summary: { totalFees: 0, totalBookings: 0, avgFee: 0 },
    byPaymentMethod: [],
    monthlyTrend: [],
  });
  const [error, setError] = useState<string | null>(null);

  // If not authenticated or not admin, redirect to home
  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    async function fetchRevenueData() {
      setIsLoading(true);
      try {
        const response = await adminEarningsApi.getPlatformRevenueSummary(
          period
        );

        if (response.success) {
          setRevenueData(response.data);
        } else {
          setError(response.message || 'Failed to load revenue data');
        }
      } catch (err) {
        console.error('Error fetching revenue data:', err);
        setError('Failed to load revenue data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchRevenueData();
  }, [period]);

  // Format monetary value
  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Get month name from month number (1-12)
  const getMonthName = (monthNumber: number) => {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months[monthNumber - 1];
  };

  // Prepare monthly trend data for chart display
  const chartData =
    revenueData.monthlyTrend?.map((item: any) => ({
      name: getMonthName(item.month),
      revenue: item.revenue,
    })) || [];

  // Prepare payment method data for chart display
  const paymentMethodChartData =
    revenueData.byPaymentMethod?.map((item: any) => ({
      name:
        item._id === 'property'
          ? 'Pay at Property'
          : item._id === 'card'
          ? 'Credit Card'
          : item._id === 'gcash'
          ? 'GCash'
          : item._id === 'maya'
          ? 'Maya'
          : item._id,
      value: item.totalFees,
    })) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-darkBlue flex items-center justify-center">
        <div className="text-center">
          <FiLoader
            size={40}
            className="animate-spin mx-auto text-blue-600 dark:text-blue-400 mb-4"
          />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Loading revenue data...
          </h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-darkBlue p-8">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <div className="text-red-600 dark:text-red-400 text-xl font-semibold mb-2">
            Error Loading Data
          </div>
          <p className="text-red-500 dark:text-red-300">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-700 transition-colors">
            Retry
          </button>
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
                Platform Revenue
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-light/80 mt-1">
                Overview of all platform earnings and financial metrics
              </p>
            </div>

            {/* Period Filter - Mobile Responsive */}
            <div className="flex flex-wrap sm:flex-nowrap bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-1">
              <button
                onClick={() => setPeriod('today')}
                className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                  period === 'today'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}>
                Today
              </button>
              <button
                onClick={() => setPeriod('week')}
                className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                  period === 'week'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}>
                Week
              </button>
              <button
                onClick={() => setPeriod('month')}
                className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                  period === 'month'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}>
                Month
              </button>
              <button
                onClick={() => setPeriod('year')}
                className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                  period === 'year'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}>
                Year
              </button>
              <button
                onClick={() => setPeriod('all')}
                className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                  period === 'all'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}>
                All Time
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">
                    Total Revenue
                  </p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate">
                    {formatCurrency(revenueData.summary.totalFees)}
                  </p>
                </div>
                <div className="p-2 sm:p-2.5 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
                  <FiDollarSign
                    className="text-green-600 dark:text-green-400"
                    size={18}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 sm:mt-3">
                {period === 'today'
                  ? "Today's earnings"
                  : period === 'week'
                  ? "This week's earnings"
                  : period === 'month'
                  ? "This month's earnings"
                  : period === 'year'
                  ? "This year's earnings"
                  : 'Lifetime earnings'}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">
                    Total Bookings
                  </p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {revenueData.summary.totalBookings.toLocaleString()}
                  </p>
                </div>
                <div className="p-2 sm:p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                  <FiUsers
                    className="text-blue-600 dark:text-blue-400"
                    size={18}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 sm:mt-3">
                {period === 'today'
                  ? 'Bookings made today'
                  : period === 'week'
                  ? 'Bookings this week'
                  : period === 'month'
                  ? 'Bookings this month'
                  : period === 'year'
                  ? 'Bookings this year'
                  : 'Total bookings'}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200 sm:col-span-2 lg:col-span-1">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">
                    Average Platform Fee
                  </p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate">
                    {formatCurrency(revenueData.summary.avgFee)}
                  </p>
                </div>
                <div className="p-2 sm:p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-shrink-0">
                  <FiPieChart
                    className="text-purple-600 dark:text-purple-400"
                    size={18}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 sm:mt-3">
                Average fee per booking
              </p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* Monthly Trend Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
                Monthly Revenue Trend
              </h2>
              <div className="h-64 sm:h-72">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{
                        top: 5,
                        right: window.innerWidth < 640 ? 10 : 30,
                        left: window.innerWidth < 640 ? 10 : 20,
                        bottom: 5,
                      }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
                        interval={window.innerWidth < 640 ? 1 : 0}
                        angle={window.innerWidth < 640 ? -45 : 0}
                        textAnchor={window.innerWidth < 640 ? 'end' : 'middle'}
                      />
                      <YAxis
                        tickFormatter={(value) =>
                          window.innerWidth < 640
                            ? `₱${value / 1000}k`
                            : `₱${value / 1000}k`
                        }
                        tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
                      />
                      <Tooltip
                        formatter={(value) => [
                          `${formatCurrency(Number(value))}`,
                          'Revenue',
                        ]}
                        labelFormatter={(label) => `Month: ${label}`}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                        }}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="#3B82F6"
                        name="Revenue"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400 text-center text-sm">
                      No monthly trend data available
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Methods Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
                Revenue by Payment Method
              </h2>
              <div className="h-64 sm:h-72">
                {paymentMethodChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={paymentMethodChartData}
                      layout="vertical"
                      margin={{
                        top: 5,
                        right: window.innerWidth < 640 ? 10 : 30,
                        left: window.innerWidth < 640 ? 60 : 20,
                        bottom: 5,
                      }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        opacity={0.1}
                        horizontal={true}
                        vertical={false}
                      />
                      <XAxis
                        type="number"
                        tickFormatter={(value) =>
                          window.innerWidth < 640
                            ? `₱${value / 1000}k`
                            : `₱${value / 1000}k`
                        }
                        tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
                        width={window.innerWidth < 640 ? 80 : 100}
                      />
                      <Tooltip
                        formatter={(value) => [
                          `${formatCurrency(Number(value))}`,
                          'Revenue',
                        ]}
                        labelFormatter={(label) => `Payment Method: ${label}`}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                        }}
                      />
                      <Bar
                        dataKey="value"
                        fill="#10B981"
                        name="Revenue"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400 text-center text-sm">
                      No payment method data available
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
              Payment Method Breakdown
            </h2>
            {revenueData.byPaymentMethod &&
            revenueData.byPaymentMethod.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {revenueData.byPaymentMethod.map(
                  (method: any, index: number) => (
                    <div
                      key={index}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200/50 dark:border-gray-600/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base leading-tight">
                          {method._id === 'property'
                            ? 'Pay at Property'
                            : method._id === 'card'
                            ? 'Credit Card'
                            : method._id === 'gcash'
                            ? 'GCash'
                            : method._id === 'maya'
                            ? 'Maya'
                            : method._id}
                        </h3>
                      </div>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                        {formatCurrency(method.totalFees)}
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs sm:text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Bookings
                          </span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {method.count.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs sm:text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Avg per booking
                          </span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {formatCurrency(method.totalFees / method.count)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-10">
                <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                  No payment method data available for the selected period
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformRevenueDashboard;
