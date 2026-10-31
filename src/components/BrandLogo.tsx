import React from 'react';

export interface BrandLogoProps {
  className?: string;
  fill?: string;
  width?: number | string;
  height?: number | string;
  'aria-label'?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  fill = '#321C04',
  width = 40,
  height = 40,
  'aria-label': ariaLabel = 'Drift logo',
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 256 256"
      fill="none"
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <path
        d="M 256 256 L 178 256 C 150.386 256 128 233.614 128 206 L 128 256 L 0 256 L 0 192 C 0 156.654 28.654 128 64 128 C 99.346 128 128 156.654 128 192 L 128 128 L 256 128 Z M 78 0 C 105.614 0 128 22.386 128 50 L 128 0 L 256 0 L 256 64 C 256 99.346 227.346 128 192 128 C 156.654 128 128 99.346 128 64 L 128 128 L 0 128 L 0 0 Z"
        fill={fill}
      />
    </svg>
  );
};
