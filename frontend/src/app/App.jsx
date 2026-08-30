import { RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ThemeProvider from "../layouts/Theme/ThemeProvider";
import ToastProvider from "../components/ui/Toast/ToastContext/ToastProvider";
import ToastContainer from "../components/ui/Toast/ToastContent/ToastContainer";
import Router from "./Routers";

// یک instance واحد در سطح ماژول تا با هر رندر دوباره ساخته نشود
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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <RouterProvider router={Router} />
          <ToastContainer />
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
