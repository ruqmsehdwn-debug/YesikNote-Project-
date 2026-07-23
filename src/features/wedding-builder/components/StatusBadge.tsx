type StatusTone = 'complete' | 'needs-review' | 'inactive';

type Props = {
  tone: StatusTone;
  children: string;
  className?: string;
};

export function StatusBadge({ tone, children, className = '' }: Props) {
  return (
    <span className={`status-badge ${tone} ${className}`.trim()}>
      {children}
    </span>
  );
}
