"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

export default function Sidebar() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { name: "Dashboard / Inbox", href: "/", icon: "📊" },
    { name: "Nueva Cotización", href: "/cotizaciones/nueva", icon: "➕" },
    { name: "Historial de Cotizaciones", href: "/cotizaciones", icon: "📋" },
    { name: "Inventario Rápido", href: "/inventario", icon: "🔍" },
  ];

  return (
    <div className="sidebar">
      <div className="logo-container">
        <div className="logo-icon">⚙️</div>
        <div className="logo-text">InsumosFlow</div>
      </div>

      <nav>
        <ul className="nav-links">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link href={item.href} className={`nav-link ${isActive ? "active" : ""}`}>
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">JP</div>
          <div className="user-info">
            <span className="user-name">Juan Pérez</span>
            <span className="user-role">Ventas Senior</span>
          </div>
        </div>
      </div>
    </div>
  );
}
