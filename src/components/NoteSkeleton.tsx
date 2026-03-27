import { clsx } from 'clsx';

interface NoteSkeletonProps {
  count?: number;
  className?: string;
}

export const NoteSkeleton: React.FC<NoteSkeletonProps> = ({ 
  count = 6, 
  className = '' 
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={`skeleton-${index}`} 
          className={clsx(
            "rounded-2xl border border-border bg-muted/20 p-4 w-full h-[160px] animate-pulse",
            className
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 overflow-hidden flex-1">
              <div className="w-10 h-10 bg-muted rounded-lg shrink-0" />
              <div className="flex flex-col gap-2 flex-1">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-2 bg-muted/50 rounded w-1/4" />
              </div>
            </div>
            <div className="flex gap-1">
              <div className="w-8 h-8 bg-muted rounded-lg" />
              <div className="w-8 h-8 bg-muted rounded-lg" />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="h-2 bg-muted/50 rounded w-full" />
            <div className="h-2 bg-muted/50 rounded w-5/6" />
            <div className="h-2 bg-muted/50 rounded w-4/6" />
          </div>
        </div>
      ))}
    </>
  );
};

export default NoteSkeleton;