import { Component } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

// ErrorBoundary باید یک کلاس‌کامپوننت باشد — React فقط از طریق متدهای
// چرخه‌حیات کلاس (getDerivedStateFromError/componentDidCatch) اجازه گرفتن
// خطاهای رندر فرزندان را می‌دهد؛ هوک معادلی برای این کار وجود ندارد.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // در محیط واقعی، اینجا می‌توان خطا را به یک سرویس مانیتورینگ (Sentry و...) ارسال کرد
    console.error("خطای گرفته‌شده توسط ErrorBoundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({ error: this.state.error, reset: this.handleReset });
      }

      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-Danger/10 text-Danger">
            <AlertTriangle size={26} />
          </span>
          <div>
            <h2 className="font-Outfit text-lg font-bold text-textPrimary">
              مشکلی در نمایش این بخش پیش آمد
            </h2>
            <p className="mt-1 text-sm text-textSecondary">
              می‌توانید دوباره تلاش کنید یا صفحه را رفرش کنید.
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 rounded-Button bg-gradient-brand px-4 py-2 text-sm font-bold text-white shadow-Glow transition-smooth hover:brightness-110"
          >
            <RotateCcw size={16} />
            تلاش مجدد
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
