import { useEffect, useState } from "react";
import ThemeContext from "./ThemeContext";

function getInitialTheme() {
  try {
    return localStorage.getItem("theme") === "dark";
  } catch {
    return false;
  }
}

function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(getInitialTheme);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("dark", isDark);

    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {
      // Storage can be disabled by browser privacy settings.
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
