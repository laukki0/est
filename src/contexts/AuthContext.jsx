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

// Traduz mensagens de erro do Supabase (sempre em inglês) pra uma chave de
// tradução do app, já que o erro não tem um código estável entre versões —
// a checagem é pelo texto da mensagem mesmo.
function mapAuthErrorToKey(error) {
  const msg = (error?.message || "").toLowerCase();
  if (msg.includes("invalid login credentials")) return "login_error_invalid";
  if (msg.includes("already registered") || msg.includes("already exists")) return "login_error_exists";
  if (msg.includes("password") && (msg.includes("least") || msg.includes("short") || msg.includes("weak"))) {
    return "login_error_weak";
  }
  if (msg.includes("email") && msg.includes("invalid")) return "login_error_invalid_email";
  if (msg.includes("rate limit")) return "login_error_rate_limit";
  return "login_error_generic";
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
      setAuthError("login_error");
      throw err;
    }
  }

  async function loginWithEmail(email, password) {
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setAuthError(mapAuthErrorToKey(error));
      throw error;
    }
  }

  async function signUpWithEmail(email, password, displayName) {
    setAuthError("");
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: displayName || "" } },
    });
    if (error) {
      setAuthError(mapAuthErrorToKey(error));
      throw error;
    }
    // Se a confirmação de e-mail estiver ligada no projeto Supabase, o
    // signUp não retorna sessão - o usuário precisa confirmar antes de entrar.
    return { needsEmailConfirmation: !data.session };
  }

  async function resetPassword(email) {
    setAuthError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    if (error) {
      setAuthError(mapAuthErrorToKey(error));
      throw error;
    }
  }

  async function loginAsGuest() {
    setAuthError("");
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      setAuthError("login_error_generic");
      throw error;
    }
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  // Usuário anônimo (entrou sem conta) - o Supabase marca isso no próprio
  // objeto de usuário. Além de esconder/desabilitar ações na interface, o
  // bloqueio de verdade fica nas policies do banco (schema_guest_readonly.sql),
  // já que isso aqui é só pra experiência de uso, não é a barreira de segurança.
  const isGuest = user?.is_anonymous === true;

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        loginWithGoogle,
        loginWithEmail,
        signUpWithEmail,
        resetPassword,
        loginAsGuest,
        logout,
        authError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
