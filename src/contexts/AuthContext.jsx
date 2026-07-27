import React, { createContext, useContext, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "../supabase.js";
import { generateNoncePair } from "../lib/googleNonce.js";

const AuthContext = createContext(null);

async function loginWeb() {
  // Fluxo de redirect padrão do Supabase: manda pro Google, o Google volta
  // pro seu domínio, e o client detecta a sessão sozinho na URL de volta
  // (detectSessionInUrl é true por padrão).
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

let socialLoginInitialized = false;

async function loginAndroid() {
  // No app nativo, OAuth via WebView é bloqueado pelo Google
  // ("disallowed_useragent"). A solução é abrir o seletor de conta nativo
  // do Android via um plugin de login social e trocar o ID token dele por
  // uma sessão do Supabase com signInWithIdToken.
  const { SocialLogin } = await import("@capgo/capacitor-social-login");

  if (!socialLoginInitialized) {
    // Usa o mesmo Web Client ID em todas as plataformas - é assim que o
    // plugin espera, mesmo rodando no Android (não é o Client ID Android).
    await SocialLogin.initialize({
      google: { webClientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID },
    });
    socialLoginInitialized = true;
  }

  const { hashedNonce, rawNonce } = await generateNoncePair();
  const response = await SocialLogin.login({
    provider: "google",
    options: { nonce: hashedNonce },
  });
  const idToken = response?.result?.idToken;
  if (!idToken) throw new Error("Não recebi o ID token do Google.");

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
    nonce: rawNonce,
  });
  if (error) throw error;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = carregando, null = deslogado
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loginWithGoogle() {
    setAuthError("");
    try {
      if (Capacitor.isNativePlatform()) {
        await loginAndroid();
      } else {
        await loginWeb();
      }
    } catch (err) {
      setAuthError("Não foi possível entrar com o Google. Tente novamente.");
      throw err;
    }
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, logout, authError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
