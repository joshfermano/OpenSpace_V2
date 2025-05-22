import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'currentColor',
}) => {
  // Size mapping
  const sizeMap = {
    small: 'w-5 h-5',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  return (
    <div className="flex justify-center items-center p-6 w-full">
      <div
        className={`${sizeMap[size]} animate-spin rounded-full border-4 border-solid border-t-transparent`}
        style={{ borderColor: `${color} transparent transparent transparent` }}
        role="status"
        aria-label="loading">
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};

export default LoadingSpinner;
