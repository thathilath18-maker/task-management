'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <h2 className="text-xl font-bold text-red-600 mb-4">
                ເກີດຂໍ້ຜິດພາດ!
              </h2>
              <p className="text-gray-600 mb-4">
                {this.state.error?.message}
              </p>
              <Button onClick={() => window.location.reload()}>
                ໂຫຼດໜ້າໃໝ່
              </Button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}