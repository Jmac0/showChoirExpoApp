import axios from "axios";
import {
  useContext,
  createContext,
  useState,
  type PropsWithChildren,
} from "react";
import { API_URL } from "@env";
import { router } from "expo-router";

// Define the structure of session data
interface SessionData {
  refreshToken: string;
  accessToken: string;
}

interface AuthContextType {
  signIn: (formData: { email: string; password: string }) => void;
  signOut: () => void;
  session: SessionData | null;
}

const AuthContext = createContext<AuthContextType>({
  signIn: () => null,
  signOut: () => null,
  session: null,
});

// This hook can be used to access the user info.
export function useAuth() {
  const value = useContext(AuthContext);
  if (process.env.NODE_ENV !== "production") {
    if (!value) {
      throw new Error("useAuth must be wrapped in a <AuthProvider />");
    }
  }

  return value;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SessionData | null>(null);
  console.log(session);
  const signIn = async (formData: { email: string; password: string }) => {
    let { email, password } = formData;
    email = email.trim().toLowerCase();
    try {
      const res = await axios.post(`${API_URL}`, { email, password });
      setSession(res.data); // Ensure res.data matches SessionData interface
    } catch (error) {
      console.error("Error during sign-in:", error);
      // Optionally handle errors more gracefully here
    }
  };

  const signOut = () => {
    setSession(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        signIn,
        signOut,
        session,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
