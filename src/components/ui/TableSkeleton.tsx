'use client';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

const TableSkeleton = ({ rows = 5, cols = 6 }: TableSkeletonProps) => {
  const bg = 'bg-[#E8DDD0]';
  const rowBg = 'bg-[rgba(215,183,151,0.05)]';

  return (
    <div className={`rounded-xl border overflow-hidden border-[#C4B5A5]`}>
      {/* Header skeleton */}
      <div className={`flex items-center gap-2 px-4 py-2.5 bg-[rgba(215,183,151,0.2)]`}>
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className={`h-3 rounded animate-pulse ${bg}`}
            style={{ width: i === 0 ? '120px' : '80px' }}
          />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className={`flex items-center gap-2 px-4 py-2 border-t border-[#E8DDD0] ${r % 2 === 0 ? '' : rowBg}`}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className={`h-3 rounded animate-pulse ${bg}`}
              style={{
                width: c === 0 ? '100px' : `${60 + Math.random() * 40}px`,
                animationDelay: `${(r * cols + c) * 50}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default TableSkeleton;
