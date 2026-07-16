import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../types/index.ts";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and check local storage on mount
  useEffect(() => {
    async function verifySession() {
      try {
        const storedToken = localStorage.getItem("nl_token");
        const storedUser = localStorage.getItem("nl_user");

        if (storedToken) {
          // Verify with the backend me endpoint
          const res = await fetch("/api/v1/auth/me", {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${storedToken}`,
              "Content-Type": "application/json"
            }
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
              setToken(storedToken);
              setUser(data.user);
              localStorage.setItem("nl_user", JSON.stringify(data.user));
            } else {
              // Bad token format or response
              logout();
            }
          } else {
            // Token expired or invalid
            logout();
          }
        }
      } catch (err) {
        console.error("Failed to recover login session from server:", err);
        // Fallback to local storage if offline/no backend connection during boot
        const storedToken = localStorage.getItem("nl_token");
        const storedUser = localStorage.getItem("nl_user");
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } finally {
        setIsLoading(false);
      }
    }

    verifySession();
  }, []);

  const login = (newToken: string, loggedInUser: User) => {
    setToken(newToken);
    setUser(loggedInUser);
    localStorage.setItem("nl_token", newToken);
    localStorage.setItem("nl_user", JSON.stringify(loggedInUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("nl_token");
    localStorage.removeItem("nl_user");
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("nl_user", JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
