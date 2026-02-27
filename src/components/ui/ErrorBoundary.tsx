'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    this.props.onError?.(error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-[#1A1A1A] rounded-2xl shadow-2xl border border-[#2E2E2E] overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-8 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white font-['Montserrat'] mb-2">
                Đã xảy ra lỗi
              </h1>
              <p className="text-red-200 text-sm">
                Ứng dụng gặp sự cố không mong muốn
              </p>
            </div>

            <div className="p-6">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-red-950/40 border border-red-800/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Bug className="w-4 h-4 text-red-400" />
                    <span className="font-semibold text-red-300 text-sm font-['Montserrat']">
                      Debug Info
                    </span>
                  </div>
                  <p className="text-red-400 text-sm font-['JetBrains_Mono'] break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-red-500 text-xs cursor-pointer hover:text-red-400">
                        Component Stack
                      </summary>
                      <pre className="mt-2 text-xs text-red-400 overflow-auto max-h-32 bg-red-950/30 p-2 rounded font-['JetBrains_Mono']">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={this.handleReset}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#2A9E6A] hover:bg-[#238c5c] text-white rounded-xl font-semibold font-['Montserrat'] text-sm transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Thử lại
                </button>

                <button
                  onClick={this.handleReload}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#2E2E2E] hover:bg-[#3a3a3a] text-[#F2F2F2] rounded-xl font-semibold font-['Montserrat'] text-sm transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tải lại trang
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-[#2E2E2E] hover:bg-[#1e1e1e] text-[#999] rounded-xl font-semibold font-['Montserrat'] text-sm transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Về trang chủ
                </button>
              </div>

              <p className="mt-6 text-center text-xs text-[#666]">
                Nếu lỗi tiếp tục xảy ra, vui lòng liên hệ bộ phận hỗ trợ
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
