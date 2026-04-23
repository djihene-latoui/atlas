/**
 * @file auth-client.ts
 * @description Initialisation et export du client BetterAuth côté navigateur.
 */
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "${process.env.NEXT_PUBLIC_API_URL}",
  fetchOptions: {
    credentials: "include", // pour que les cookies peuvent passer 
  }
});

export const { signIn, signUp, signOut, useSession } = authClient;
