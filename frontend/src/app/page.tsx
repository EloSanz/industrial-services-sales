"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getInquiries, getQuotations, initializeDB, Inquiry, Quotation } from "@/lib/mockData";

export default function Dashboard() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [activeTab, setActiveTab] = useState<"inbox" | "followup" | "recent">("inbox");

  useEffect(() => {
    initializeDB();
    setInquiries(getInquiries());
    setQuotations(getQuotations());
  }, []);

  const pendingInquiries = inquiries.filter(i => i.status === "pending");
  const followUpQuotes = quotations.filter(q => q.status === "sent");

  const totalQuotedToday = quotations.reduce((sum, q) => {
    const latestVersion = q.versions[q.versions.length - 1];
    return sum + (latestVersion ? latestVersion.total : 0);
  }, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }) + " hs";
  };

  const getChannelBadgeClass = (channel: string) => {
    switch (channel) {
      case "whatsapp": return "badge-whatsapp";
      case "email": return "badge-email";
      case "phone": return "badge-phone";
      case "mostrador": return "badge-mostrador";
      default: return "badge-info";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "approved": return "badge-success";
      case "sent": return "badge-info";
      case "rejected": return "badge-danger";
      case "expired": return "badge-warning";
      default: return "badge-secondary";
    }
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case "approved": return "Aprobada";
      case "sent": return "Enviada";
      case "rejected": return "Rechazada";
      case "expired": return "Vencida";
      default: return status;
    }
  };

  const handleStartQuoteFromInquiry = (inqId: string) => {
    router.push(`/cotizaciones/nueva?inquiryId=${inqId}`);
  };

  const handleFollowUpWhatsApp = (quote: Quotation) => {
    const latestVersion = quote.versions[quote.versions.length - 1];
    const text = `Hola! Te escribo de InsumosFlow por la cotización de los ${latestVersion?.items[0]?.name || "productos"} para consultarte si pudiste revisarla o si tenés alguna duda sobre los precios o plazos de entrega. Quedo a disposición!`;
    navigator.clipboard.writeText(text);
    alert("Mensaje de seguimiento copiado al portapapeles:\n\n" + text);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1>Panel de Control</h1>
          <p className="subtitle">Gestión centralizada de consultas y cotizaciones de venta</p>
        </div>
        <Link href="/cotizaciones/nueva" className="btn btn-primary" style={{ padding: "12px 24px", fontSize: "0.95rem" }}>
          <span>➕</span> Nueva Cotización
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid-3" style={{ marginBottom: "32px" }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>Total Cotizado</span>
            <span style={{ fontSize: "1.5rem" }}>💼</span>
          </div>
          <span style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--primary)" }}>
            {formatCurrency(totalQuotedToday)}
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Acumulado de cotizaciones activas
          </span>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>Bandeja de Consultas</span>
            <span style={{ fontSize: "1.5rem" }}>📥</span>
          </div>
          <span style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--secondary)" }}>
            {pendingInquiries.length} pendientes
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Canales: WhatsApp, Email, Teléfono
          </span>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>Seguimientos Pendientes</span>
            <span style={{ fontSize: "1.5rem" }}>⏳</span>
          </div>
          <span style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--warning)" }}>
            {followUpQuotes.length} cotizaciones
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Enviadas sin respuesta del cliente
          </span>
        </div>
      </div>

      {/* Main Sections Tab & List */}
      <div className="card" style={{ padding: "0px", overflow: "hidden" }}>
        <div style={{
          display: "flex",
          borderBottom: "1px solid var(--border-color)",
          backgroundColor: "var(--bg-tertiary)",
          padding: "0 24px"
        }}>
          <button
            onClick={() => setActiveTab("inbox")}
            style={{
              background: "none",
              border: "none",
              color: activeTab === "inbox" ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: activeTab === "inbox" ? "600" : "500",
              padding: "18px 16px",
              cursor: "pointer",
              borderBottom: activeTab === "inbox" ? "2px solid var(--primary)" : "2px solid transparent",
              fontSize: "0.9rem",
              transition: "var(--transition)"
            }}
          >
            📥 Inbox de Consultas ({pendingInquiries.length})
          </button>
          <button
            onClick={() => setActiveTab("followup")}
            style={{
              background: "none",
              border: "none",
              color: activeTab === "followup" ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: activeTab === "followup" ? "600" : "500",
              padding: "18px 16px",
              cursor: "pointer",
              borderBottom: activeTab === "followup" ? "2px solid var(--primary)" : "2px solid transparent",
              fontSize: "0.9rem",
              transition: "var(--transition)"
            }}
          >
            ⏳ Alertas de Seguimiento ({followUpQuotes.length})
          </button>
          <button
            onClick={() => setActiveTab("recent")}
            style={{
              background: "none",
              border: "none",
              color: activeTab === "recent" ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: activeTab === "recent" ? "600" : "500",
              padding: "18px 16px",
              cursor: "pointer",
              borderBottom: activeTab === "recent" ? "2px solid var(--primary)" : "2px solid transparent",
              fontSize: "0.9rem",
              transition: "var(--transition)"
            }}
          >
            📋 Cotizaciones Recientes ({quotations.length})
          </button>
        </div>

        <div style={{ padding: "24px" }}>
          {/* Tab 1: Inbox */}
          {activeTab === "inbox" && (
            <div>
              {pendingInquiries.length === 0 ? (
                <p style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                  No hay consultas pendientes en la bandeja de entrada. 🎉
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {pendingInquiries.map((inq) => (
                    <div
                      key={inq.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        padding: "20px",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "var(--bg-tertiary)",
                        border: "1px solid var(--border-color)",
                        transition: "var(--transition)"
                      }}
                      className="inquiry-item"
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span className={`badge ${getChannelBadgeClass(inq.channel)}`}>
                            {inq.channel === "whatsapp" ? "💬 WhatsApp" : inq.channel === "email" ? "✉️ Email" : inq.channel === "phone" ? "📞 Teléfono" : "👤 Mostrador"}
                          </span>
                          <strong style={{ fontSize: "1rem" }}>{inq.clientName}</strong>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>({inq.contactName})</span>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{formatDate(inq.date)}</span>
                      </div>

                      <div style={{
                        padding: "12px 16px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "#f9f9f9",
                        borderLeft: "3px solid var(--text-muted)",
                        fontSize: "0.875rem",
                        color: "var(--text-secondary)",
                        fontStyle: "italic"
                      }}>
                        "{inq.messageText}"
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          {inq.suggestedTag && (
                            <span style={{
                              fontSize: "0.75rem",
                              backgroundColor: "var(--bg-tertiary)",
                              color: "var(--text-primary)",
                              padding: "2px 8px",
                              borderRadius: "4px"
                            }}>
                              🏷️ Sugerido: {inq.suggestedTag}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleStartQuoteFromInquiry(inq.id)}
                          className="btn btn-primary"
                          style={{ padding: "8px 16px", fontSize: "0.8rem" }}
                        >
                          Crear Cotización
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Follow-up */}
          {activeTab === "followup" && (
            <div>
              {followUpQuotes.length === 0 ? (
                <p style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                  No hay cotizaciones que requieran seguimiento inmediato. 👍
                </p>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Nro.</th>
                        <th>Cliente</th>
                        <th>Fecha Envío</th>
                        <th>Vendedor</th>
                        <th>Versión</th>
                        <th>Total</th>
                        <th>Acción de Seguimiento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {followUpQuotes.map((quote) => {
                        const latestVer = quote.versions[quote.versions.length - 1];
                        return (
                          <tr key={quote.id}>
                            <td>
                              <Link href={`/cotizaciones/${quote.id}`} style={{ color: "var(--primary)", fontWeight: "600" }}>
                                #{quote.id}
                              </Link>
                            </td>
                            <td>
                              <div>
                                <strong style={{ display: "block" }}>{quote.clientName}</strong>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                  Vía {quote.channel}
                                </span>
                              </div>
                            </td>
                            <td>{formatDate(quote.date)}</td>
                            <td>{quote.seller}</td>
                            <td>
                              <span className="badge badge-info">V{quote.version}</span>
                            </td>
                            <td style={{ fontWeight: "700" }}>{formatCurrency(latestVer?.total || 0)}</td>
                            <td>
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  onClick={() => handleFollowUpWhatsApp(quote)}
                                  className="btn btn-secondary"
                                  style={{ padding: "6px 12px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
                                >
                                  💬 Copiar WA
                                </button>
                                <Link
                                  href={`/cotizaciones/${quote.id}`}
                                  className="btn btn-outline"
                                  style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                                >
                                  Detalle / V2
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Recent */}
          {activeTab === "recent" && (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nro.</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Vendedor</th>
                    <th>Versión</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((quote) => {
                    const latestVer = quote.versions[quote.versions.length - 1];
                    return (
                      <tr key={quote.id}>
                        <td>
                          <Link href={`/cotizaciones/${quote.id}`} style={{ color: "var(--primary)", fontWeight: "600" }}>
                            #{quote.id}
                          </Link>
                        </td>
                        <td>
                          <div>
                            <strong>{quote.clientName}</strong>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>
                              {quote.contextProblem?.substring(0, 45)}...
                            </span>
                          </div>
                        </td>
                        <td>{formatDate(quote.date)}</td>
                        <td>{quote.seller}</td>
                        <td>
                          <span className="badge badge-info">V{quote.version}</span>
                        </td>
                        <td style={{ fontWeight: "700" }}>{formatCurrency(latestVer?.total || 0)}</td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(quote.status)}`}>
                            {translateStatus(quote.status)}
                          </span>
                        </td>
                        <td>
                          <Link href={`/cotizaciones/${quote.id}`} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.75rem" }}>
                            Ver Detalle
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
