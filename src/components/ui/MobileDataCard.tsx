'use client';

export default function MobileDataCard({
  title,
  subtitle,
  status,
  statusColor,
  metrics = [],
  actions = [],
  onClick,
  children,
}: any) {
  const statusColors: any = {
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    critical: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    neutral: 'bg-gray-100 text-gray-600',
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-4 transition-all duration-200 ${
        onClick ? 'cursor-pointer active:scale-[0.98]' : ''
      } bg-white border-gray-200 hover:border-gray-300 shadow-sm`}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold font-['Montserrat'] truncate text-gray-900`}>
            {title}
          </h4>
          {subtitle && (
            <p className={`text-xs mt-0.5 truncate text-gray-500`}>
              {subtitle}
            </p>
          )}
        </div>
        {status && (
          <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
            statusColors[statusColor] || statusColors.neutral
          }`}>
            {status}
          </span>
        )}
      </div>

      {/* Metrics Row */}
      {metrics.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {metrics.map((metric: any, i: any) => (
            <div key={i}>
              <div className={`text-[11px] text-gray-500`}>
                {metric.label}
              </div>
              <div className={`text-sm font-semibold font-['JetBrains_Mono'] ${
                metric.color || 'text-gray-900'
              }`}>
                {metric.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom children */}
      {children}

      {/* Actions Row */}
      {actions.length > 0 && (
        <div className={`mt-3 pt-3 flex gap-2 border-t border-gray-100`}>
          {actions.map((action: any, i: any) => (
            <button
              key={i}
              onClick={(e: any) => { e.stopPropagation(); action.onClick?.(); }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold font-['Montserrat'] transition-colors ${
                action.primary
                  ? 'bg-dafc-gold text-[#0A0A0A] active:bg-dafc-gold-dark'
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
