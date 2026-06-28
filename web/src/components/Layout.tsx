import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
  }`;

export default function Layout({ children }: { children: React.ReactNode }) {
  const { token, logout } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.me(token).then((user) => setIsAdmin(user.is_admin)).catch(() => setIsAdmin(false));
  }, [token]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link to="/" className="text-xl font-bold text-brand-700">
              FitLineVentory
            </Link>
            <p className="text-sm text-slate-500">Personal FitLine inventory</p>
          </div>
          <nav className="flex flex-wrap gap-2">
            <NavLink to="/" end className={navClass}>
              Dashboard
            </NavLink>
            <NavLink to="/products" className={navClass}>
              Products
            </NavLink>
            <NavLink to="/check-in" className={navClass}>
              Check in
            </NavLink>
            <NavLink to="/check-out" className={navClass}>
              Check out
            </NavLink>
            <NavLink to="/reorder" className={navClass}>
              Reorder
            </NavLink>
            <NavLink to="/profile" className={navClass}>
              Profile
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={navClass}>
                Admin
              </NavLink>
            )}
            <button
              onClick={logout}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}