import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      "Uncaught error captured by ErrorBoundary:",
      error,
      errorInfo
    );
  }

  render() {
    if (this.state.hasError) {
      const isDev = Boolean(import.meta.env?.DEV);

      return (
        <div className="flex items-center justify-center min-h-dvh p-8 bg-paper">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-4 text-ink">An unexpected error occurred.</h2>

            {isDev && this.state.error?.stack && (
              <div className="p-4 w-full rounded bg-white overflow-auto mb-6">
                <pre className="text-sm text-ink-2 whitespace-break-spaces">
                  {this.state.error.stack}
                </pre>
              </div>
            )}

            {!isDev && (
              <p className="text-sm text-ink-2 mb-6 text-center">
                ระบบเกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองโหลดหน้าใหม่อีกครั้ง
              </p>
            )}

            <button
              onClick={() => window.location.reload()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={16} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
