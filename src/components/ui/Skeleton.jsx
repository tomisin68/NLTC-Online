/* Shimmer skeleton loaders */

export function SkeletonText({ width = '100%', height = 14, style = {} }) {
  return <div className="skeleton skeleton-text" style={{ width, height, ...style }} />;
}

export function SkeletonCircle({ size = 40 }) {
  return <div className="skeleton skeleton-circle" style={{ width: size, height: size, flexShrink: 0 }} />;
}

export function SkeletonBlock({ width = '100%', height = 80, radius = 'var(--r-md)' }) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius }} />;
}

export function SkeletonStatCard() {
  return (
    <div className="stat-card skeleton-card" style={{ gap: 10, display: 'flex', flexDirection: 'column' }}>
      <SkeletonCircle size={34} />
      <SkeletonText width="60%" height={28} />
      <SkeletonText width="80%" height={12} />
    </div>
  );
}

export function SkeletonVideoCard() {
  return (
    <div className="skeleton-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SkeletonBlock height={140} />
      <SkeletonText width="80%" />
      <SkeletonText width="50%" height={12} />
    </div>
  );
}

export function SkeletonListItem({ lines = 2 }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <SkeletonCircle size={38} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonText key={i} width={i === 0 ? '70%' : '50%'} height={i === 0 ? 14 : 11} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, padding: '11px 12px', borderBottom: '1px solid var(--border)' }}>
          {Array.from({ length: cols }).map((__, c) => (
            <SkeletonText key={c} width={c === 0 ? '85%' : '60%'} height={13} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonAchievements() {
  return (
    <div className="ach-grid">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="skeleton-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px' }}>
          <SkeletonCircle size={32} />
          <SkeletonText width="70%" height={11} />
          <SkeletonText width="100%" height={3} style={{ borderRadius: 2 }} />
        </div>
      ))}
    </div>
  );
}
