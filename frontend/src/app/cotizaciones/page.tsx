"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getQuotations, initializeDB, Quotation } from "@/lib/mockData";

export default function QuotationsList() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quotation[]>([]);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");

  useEffect(() => {
    initializeDB();
    const quotes = getQuotations();
    setQuotations(quotes);
    setFilteredQuotes(quotes);
  }, []);

  useEffect(() => {
    let result = quotations;

    if (searchTerm) {
      result = result.filter(q =>
        q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.seller.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      result = result.filter(q => q.status === statusFilter);
    }

    if (channelFilter) {
      result = result.filter(q => q.channel === channelFilter);
    }

    setFilteredQuotes(result);
  }, [searchTerm, statusFilter, channelFilter, quotations]);

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
      year: "numeric"
    });
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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1>Historial de Cotizaciones</h1>
          <p className="subtitle">Registro de negociaciones, revisiones e historiales de precios</p>
        </div>
        <Link href="/cotizaciones/nueva" className="btn btn-primary" style={{ padding: "12px 24px" }}>
          <span>➕</span> Nueva Cotización
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ marginBottom: "24px", padding: "20px" }}>
        <div className="grid-3" style={{ gap: "16px" }}>
          <div className="form-group" style={{ marginBottom: "0px" }}>
            <label className="form-label">Buscar Cotización</label>
            <input
              type="text"
              className="form-input"
              placeholder="Buscar por Nro., Cliente o Vendedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "0px" }}>
            <label className="form-label">Filtrar por Estado</label>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos los Estados</option>
              <option value="sent">Enviada / Pendiente</option>
              <option value="approved">Aprobada (Pedido)</option>
              <option value="rejected">Rechazada</option>
              <option value="expired">Vencida</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: "0px" }}>
            <label className="form-label">Filtrar por Canal</label>
            <select
              className="form-select"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
            >
              <option value="">Todos los Canales</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="phone">Teléfono</option>
              <option value="mostrador">Mostrador</option>
            </select>
          </div>
        </div>
      </div>

      {/* List Table Card */}
      <div className="card">
        {filteredQuotes.length === 0 ? (
          <p style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
            No se encontraron cotizaciones con los filtros aplicados.
          </p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Cotización Nro.</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Vendedor</th>
                  <th>Versiones</th>
                  <th>Canal</th>
                  <th>Total Neto</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map((quote) => {
                  const latestVer = quote.versions[quote.versions.length - 1];
                  return (
                    <tr key={quote.id}>
                      <td style={{ fontWeight: "700" }}>
                        <Link href={`/cotizaciones/${quote.id}`} style={{ color: "var(--primary)" }}>
                          #{quote.id}
                        </Link>
                      </td>
                      <td>
                        <div>
                          <strong>{quote.clientName}</strong>
                          {quote.contextProblem && (
                            <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {quote.contextProblem}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{formatDate(quote.date)}</td>
                      <td>{quote.seller}</td>
                      <td>
                        <span className="badge badge-info" style={{ textTransform: "none", fontSize: "0.7rem", padding: "2px 8px" }}>
                          V1 a V{quote.version}
                        </span>
                      </td>
                      <td>
                        <span style={{ textTransform: "capitalize", fontSize: "0.8rem" }}>
                          {quote.channel === "whatsapp" ? "💬 WhatsApp" : quote.channel === "email" ? "✉️ Email" : quote.channel === "phone" ? "📞 Teléfono" : "👤 Mostrador"}
                        </span>
                      </td>
                      <td style={{ fontWeight: "700" }}>{formatCurrency(latestVer?.total || 0)}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(quote.status)}`}>
                          {translateStatus(quote.status)}
                        </span>
                      </td>
                      <td>
                        <Link href={`/cotizaciones/${quote.id}`} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.75rem" }}>
                          Administrar
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
  );
}
