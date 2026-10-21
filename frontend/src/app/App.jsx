import { RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ThemeProvider from "../layouts/Theme/ThemeProvider";
import ToastProvider from "../components/ui/Toast/ToastContext/ToastProvider";
import ToastContainer from "../components/ui/Toast/ToastContent/ToastContainer";
import Router from "./Routers";
import ErrorBoundary from "./ErrorBoundary";
import { AuthProvider } from "../auth/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <RouterProvider router={Router} />
              <ToastContainer />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
