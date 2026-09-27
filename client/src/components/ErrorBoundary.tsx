import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, createRef, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  private errorRegion = createRef<HTMLDivElement>();

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("เกิดข้อผิดพลาดในแอปพลิเคชัน", error, info);
    }
  }

  componentDidUpdate() {
    if (this.state.hasError) this.errorRegion.current?.focus();
  }

  private reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background p-8">
          <div
            ref={this.errorRegion}
            role="alert"
            aria-labelledby="error-title"
            aria-describedby="error-description"
            tabIndex={-1}
            className="flex w-full max-w-2xl flex-col items-center rounded-3xl border border-destructive/30 bg-background p-8 text-center focus:outline-none"
          >
            <AlertTriangle
              size={48}
              className="mb-6 shrink-0 text-destructive"
            />
            <h1 id="error-title" className="mb-4 text-xl font-semibold">
              เกิดข้อผิดพลาดที่ไม่คาดคิด
            </h1>
            <p
              id="error-description"
              className="mb-6 max-w-lg text-sm text-muted-foreground"
            >
              ระบบไม่สามารถแสดงหน้านี้ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง
              หากยังพบปัญหาโปรดติดต่อผู้ดูแลระบบ
            </p>
            {import.meta.env.DEV && this.state.error?.message && (
              <p className="mb-6 max-w-lg break-words text-xs text-muted-foreground">
                ข้อมูลสำหรับผู้พัฒนา: {this.state.error.message}
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={this.reset}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
                )}
              >
                <RotateCcw size={16} />
                ลองใหม่
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg border border-border px-4 py-2 hover:bg-muted"
              >
                โหลดหน้าใหม่
              </button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
