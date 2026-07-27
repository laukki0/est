// O Supabase exige um nonce no fluxo de ID token nativo: geramos um valor
// aleatório (rawNonce, vai pro signInWithIdToken) e mandamos o hash SHA-256
// dele (hashedNonce) pro plugin de login nativo do Google. O Supabase
// confere se o hash do rawNonce bate com o que veio dentro do ID token.
export async function generateNoncePair() {
  const rawNonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const encoder = new TextEncoder();
  const data = encoder.encode(rawNonce);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashedNonce = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return { rawNonce, hashedNonce };
}
