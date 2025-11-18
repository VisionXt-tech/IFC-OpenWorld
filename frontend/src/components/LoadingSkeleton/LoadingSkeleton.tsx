import './LoadingSkeleton.css';

/**
 * Loading Skeleton Components
 *
 * Provides skeleton screens for better perceived performance
 * while content is loading.
 */

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

/**
 * Basic skeleton element
 */
export function Skeleton({ width = '100%', height = '20px', borderRadius = '4px', className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
      }}
    />
  );
}

/**
 * Skeleton for building card
 */
export function BuildingCardSkeleton() {
  return (
    <div className="building-card-skeleton">
      <Skeleton height="24px" width="80%" className="mb-2" />
      <Skeleton height="16px" width="60%" className="mb-1" />
      <Skeleton height="16px" width="50%" className="mb-1" />
      <Skeleton height="16px" width="40%" />
    </div>
  );
}

/**
 * Skeleton for info panel
 */
export function InfoPanelSkeleton() {
  return (
    <div className="info-panel-skeleton">
      <div className="skeleton-header">
        <Skeleton height="32px" width="70%" className="mb-3" />
      </div>

      <div className="skeleton-section">
        <Skeleton height="20px" width="40%" className="mb-2" />
        <Skeleton height="16px" width="90%" className="mb-1" />
        <Skeleton height="16px" width="85%" className="mb-1" />
        <Skeleton height="16px" width="80%" className="mb-3" />
      </div>

      <div className="skeleton-section">
        <Skeleton height="20px" width="50%" className="mb-2" />
        <Skeleton height="16px" width="95%" className="mb-1" />
        <Skeleton height="16px" width="88%" className="mb-1" />
        <Skeleton height="16px" width="92%" />
      </div>
    </div>
  );
}

/**
 * Skeleton for upload zone
 */
export function UploadZoneSkeleton() {
  return (
    <div className="upload-zone-skeleton">
      <Skeleton height="100px" borderRadius="8px" className="mb-2" />
      <Skeleton height="20px" width="60%" className="mx-auto mb-1" />
      <Skeleton height="16px" width="40%" className="mx-auto" />
    </div>
  );
}

/**
 * Skeleton for globe (initial loading)
 */
export function GlobeSkeleton() {
  return (
    <div className="globe-skeleton">
      <div className="globe-skeleton-spinner">
        <div className="spinner-orbit"></div>
        <div className="spinner-orbit"></div>
        <div className="spinner-orbit"></div>
        <div className="spinner-text">Loading 3D Globe...</div>
      </div>
    </div>
  );
}

/**
 * Skeleton for building list
 */
export function BuildingListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="building-list-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <BuildingCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for table row
 */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="table-row-skeleton">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i}>
          <Skeleton height="16px" width={`${60 + Math.random() * 30}%`} />
        </td>
      ))}
    </tr>
  );
}

/**
 * Pulsing text skeleton (for single line text)
 */
export function TextSkeleton({ lines = 1, width = '100%' }: { lines?: number; width?: string }) {
  return (
    <div className="text-skeleton">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="16px"
          width={i === lines - 1 && lines > 1 ? '80%' : width}
          className="mb-1"
        />
      ))}
    </div>
  );
}

/**
 * Circle skeleton (for avatars, icons)
 */
export function CircleSkeleton({ size = '40px' }: { size?: string }) {
  return <Skeleton width={size} height={size} borderRadius="50%" />;
}
