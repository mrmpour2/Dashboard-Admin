import { RouterProvider } from "react-router";
import ThemeProvider from "../layouts/Theme/ThemeProvider";
import Router from "./Routers";

function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={Router} />
    </ThemeProvider>
  );
}

export default App;
