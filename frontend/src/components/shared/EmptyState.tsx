import { Map, AlertCircle, FileSearch, Inbox } from 'lucide-react';

interface EmptyStateProps {
  type: 'unselected' | 'no-search-results' | 'no-data';
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export default function EmptyState({ 
  type, 
  title, 
  description, 
  actionText, 
  onAction 
}: EmptyStateProps) {
  
  const getLayout = () => {
    switch (type) {
      case 'unselected':
        return {
          icon: <Map className="w-7 h-7 text-cyan-400" />,
          title: title || 'Inspection Scope Unselected',
          description: description || 'Choose a highlighted road segment on the interactive map or search the registry to review contractor licenses, municipal budgets, and citizen complaints.'
        };
      case 'no-search-results':
        return {
          icon: <FileSearch className="w-7 h-7 text-amber-400" />,
          title: title || 'No Registry Matches Found',
          description: description || 'We could not find any roads, contractors, or budgets matching those terms. Double check spelling or reset filters.'
        };
      default:
        return {
          icon: <Inbox className="w-7 h-7 text-slate-400" />,
          title: title || 'Registry Section Caching',
          description: description || 'No records are currently logged in this database slice. Local sync queue will publish records once connection is restored.'
        };
    }
  };

  const layout = getLayout();

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-950/20 border border-dashed border-border/50 rounded-xl relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.015),transparent_65%)] pointer-events-none"></div>

      <div className="flex flex-col items-center max-w-[280px] relative z-10 space-y-4">
        <div className="p-3 bg-slate-950 rounded-full border border-border/70 shadow-sm shadow-black/40">
          {layout.icon}
        </div>
        
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            {layout.title}
          </h4>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {layout.description}
          </p>
        </div>

        {actionText && onAction && (
          <button
            onClick={onAction}
            className="text-[9px] uppercase font-extrabold tracking-wider bg-slate-900 border border-border/60 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-400 px-3.5 py-1.5 rounded-lg transition-all"
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
}
