"use client";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="text-sm text-forest-600 hover:text-forest-900 underline-offset-2 hover:underline"
    >
      Cerrar sesión
    </button>
  );
}
