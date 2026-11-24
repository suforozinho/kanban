"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithGitHub() {
  await signIn("github", { redirectTo: "/boards" });
}

export async function signInAsGuest() {
  await signIn("guest", { redirectTo: "/boards" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
