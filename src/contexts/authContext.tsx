import {
  useContext,
  createContext,
  useState,
  type PropsWithChildren,
} from "react";

const AuthContext = createContext({
  signIn: () => null,
  name: "",
});

// This hook can be used to access the user info.
export function useAuth() {
  const value = useContext(AuthContext);
  if (process.env.NODE_ENV !== "production") {
    if (!value) {
      throw new Error("useSession must be wrapped in a <SessionProvider />");
    }
  }

  return value;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const signIn = () => {
    console.log("Sign in");
  };

  return (
    <AuthContext.Provider
      value={{
        signIn,
        name: "Jimbob McAllister",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
