import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

const STORAGE_KEY = "tailorpro_auth";
const VALID_USERNAME = "vishwas";
const VALID_PASSWORD = "vishwas@tailor";

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem(STORAGE_KEY) === "authenticated"
  );

  function signIn(username, password) {
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, "authenticated");
      setIsAuthenticated(true);
      return { success: true };
    }

    return {
      success: false,
      error: "Invalid username or password",
    };
  }

  function signOut() {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}