import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Keep production logging behind an opt-in hook so sensitive UI data is not
    // accidentally sent to third-party services.
    this.props.onError?.(error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main
        className="grid min-h-screen place-items-center bg-Background p-6 text-center"
        dir="rtl"
      >
        <section
          role="alert"
          className="w-full max-w-md rounded-2xl border border-Border bg-Surface p-8 shadow-xl"
        >
          <h1 className="text-xl font-bold text-textPrimary">
            مشکلی پیش آمد
          </h1>
          <p className="mt-2 text-sm text-textSecondary">
            صفحه با خطای غیرمنتظره‌ای روبه‌رو شد. لطفاً دوباره تلاش کنید.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            بارگذاری دوباره
          </button>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
