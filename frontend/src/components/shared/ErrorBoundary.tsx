'use client';

import React, { ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ROADWATCH Component Crash Caught:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center p-6 text-center bg-slate-950/60 border border-red-950 rounded-xl relative overflow-hidden">
          {/* Subtle background red mask */}
          <div className="absolute inset-0 bg-red-950/5 pointer-events-none"></div>
          
          <div className="flex flex-col items-center max-w-sm relative z-10 space-y-4">
            <div className="p-3 bg-red-950/80 border border-red-900/60 rounded-full text-red-400 animate-pulse">
              <AlertOctagon className="w-8 h-8" />
            </div>
            
            <div>
              <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
                GIS Engine Crash
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                The map layer or details panel encountered a spatial render error. This usually happens when coordinates are misaligned.
              </p>
              {this.state.error && (
                <div className="mt-3 p-2 bg-slate-900 border border-border/80 rounded-lg text-left overflow-x-auto max-h-[80px]">
                  <code className="text-[9px] text-red-400 font-mono block whitespace-pre">
                    {this.state.error.message}
                  </code>
                </div>
              )}
            </div>

            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 text-[10px] uppercase font-extrabold tracking-wider bg-red-950/80 border border-red-800/60 hover:bg-red-900/70 text-red-300 px-4 py-2 rounded-xl transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Mapping Frame
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
