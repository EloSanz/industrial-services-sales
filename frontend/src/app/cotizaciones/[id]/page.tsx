"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getQuotations,
  getProducts,
  getClients,
  saveQuotation,
  updateProductStock,
  initializeDB,
  Quotation,
  QuotationVersion,
  Product,
  Client,
  QuotedItem
} from "@/lib/mockData";

export default function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  
  // Selection of active version being viewed
  const [activeVersionNumber, setActiveVersionNumber] = useState<number>(1);
  const [activeVersion, setActiveVersion] = useState<QuotationVersion | null>(null);

  // Edit / Re-cotizar state
  const [isReCotizando, setIsReCotizando] = useState(false);
  const [editItems, setEditItems] = useState<QuotedItem[]>([]);
  const [editNotes, setEditNotes] = useState("");
  
  // Product search helper inside Re-cotizar
  const [searchTerm, setSearchTerm] = useState("");
  const [qty, setQty] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAlternative, setIsAlternative] = useState(false);

  // Order conversion simulation state
  const [isConverting, setIsConverting] = useState(false);
  const [conversionStep, setConversionStep] = useState<"idle" | "credit" | "stock" | "done">("idle");
  const [creditPassed, setCreditPassed] = useState(false);
  const [stockPassed, setStockPassed] = useState(false);
  const [conversionLogs, setConversionLogs] = useState<string[]>([]);

  useEffect(() => {
    initializeDB();
    loadData();
  }, [id]);

  const loadData = () => {
    const quotes = getQuotations();
    const prods = getProducts();
    const cls = getClients();

    setProducts(prods);
    setClients(cls);

    const foundQuote = quotes.find(q => q.id === id);
    if (foundQuote) {
      setQuotation(foundQuote);
      setActiveVersionNumber(foundQuote.version);
      const latestVer = foundQuote.versions.find(v => v.version === foundQuote.version) || foundQuote.versions[foundQuote.versions.length - 1];
      setActiveVersion(latestVer);
      
      // Seed editor
      setEditItems(latestVer ? [...latestVer.items] : []);
      setEditNotes(latestVer ? latestVer.notes : "");
    }
  };

  if (!quotation || !activeVersion) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h2>Cotización no encontrada</h2>
        <Link href="/cotizaciones" className="btn btn-secondary" style={{ marginTop: "16px" }}>
          Volver al Historial
        </Link>
      </div>
    );
  }

  const client = clients.find(c => c.id === quotation.clientId);

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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }) + " hs";
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
      case "approved": return "Aprobada (Pedido)";
      case "sent": return "Enviada / En Negociación";
      case "rejected": return "Rechazada";
      case "expired": return "Vencida";
      default: return status;
    }
  };

  const handleVersionClick = (vNum: number) => {
    setActiveVersionNumber(vNum);
    const ver = quotation.versions.find(v => v.version === vNum) || null;
    setActiveVersion(ver);
  };

  // Re-cotizar (New Version) activation
  const startReCotizacion = () => {
    setIsReCotizando(true);
    setEditItems([...activeVersion.items]);
    setEditNotes(activeVersion.notes);
  };

  const handleAddItemToEdit = () => {
    if (!selectedProduct) return;
    
    let discount = 0;
    if (client) {
      if (client.id === "cli-1" && selectedProduct.category === "Válvulas") {
        discount = 10;
      } else if (client.id === "cli-4" && selectedProduct.category === "Rodamientos") {
        discount = 15;
      }
    }
    const unitPrice = Math.round(selectedProduct.basePrice * (1 - discount / 100));

    const existingIndex = editItems.findIndex(i => i.productId === selectedProduct.id && i.isAlternative === isAlternative);
    if (existingIndex >= 0) {
      const updated = [...editItems];
      updated[existingIndex].quantity += qty;
      setEditItems(updated);
    } else {
      const newItem: QuotedItem = {
        productId: selectedProduct.id,
        sku: selectedProduct.sku,
        name: selectedProduct.name,
        quantity: qty,
        unitPrice,
        basePrice: selectedProduct.basePrice,
        discount,
        isAlternative
      };
      setEditItems([...editItems, newItem]);
    }

    setSelectedProduct(null);
    setSearchTerm("");
    setQty(1);
    setIsAlternative(false);
  };

  const handleRemoveItemFromEdit = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const handleUpdateItemDiscountInEdit = (index: number, discVal: number) => {
    const updated = [...editItems];
    const item = updated[index];
    item.discount = discVal;
    item.unitPrice = Math.round(item.basePrice * (1 - discVal / 100));
    setEditItems(updated);
  };

  const calculateEditSubtotal = () => {
    return editItems.reduce((sum, item) => sum + (item.basePrice * item.quantity), 0);
  };

  const calculateEditDiscount = () => {
    return editItems.reduce((sum, item) => sum + ((item.basePrice - item.unitPrice) * item.quantity), 0);
  };

  const calculateEditTotal = () => {
    return editItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  };

  const saveNewVersion = () => {
    if (editItems.length === 0) {
      alert("La cotización no puede estar vacía.");
      return;
    }

    const nextVerNumber = quotation.version + 1;
    const newVersion: QuotationVersion = {
      version: nextVerNumber,
      date: new Date().toISOString(),
      items: editItems,
      subtotal: calculateEditSubtotal(),
      discount: calculateEditDiscount(),
      total: calculateEditTotal(),
      notes: editNotes
    };

    const updatedQuotation: Quotation = {
      ...quotation,
      version: nextVerNumber,
      date: new Date().toISOString(),
      versions: [...quotation.versions, newVersion]
    };

    saveQuotation(updatedQuotation);
    setQuotation(updatedQuotation);
    setActiveVersionNumber(nextVerNumber);
    setActiveVersion(newVersion);
    setIsReCotizando(false);
    alert(`¡Se ha registrado la Versión ${nextVerNumber} con éxito!`);
  };

  // Convert to Order Simulation (solves Stock & Credit verification)
  const handleConvertToOrder = () => {
    setIsConverting(true);
    setConversionStep("credit");
    setConversionLogs(["Iniciando validación de la cotización #" + quotation.id + "...", "Paso 1: Validación del estado crediticio del cliente..."]);
    
    setTimeout(() => {
      // Step 1: Credit check
      if (client) {
        const availableCredit = client.creditLimit - client.balance;
        const totalAmount = activeVersion.total;

        if (client.creditLimit === 0) {
          setConversionLogs(prev => [...prev, "ℹ️ Cliente opera de contado. Crédito no requerido.", "✅ Validación de pago aprobada (Contado/Anticipado)."]);
          setCreditPassed(true);
        } else if (totalAmount > availableCredit) {
          setConversionLogs(prev => [...prev, `❌ Límite excedido! Monto total (${formatCurrency(totalAmount)}) supera el saldo disponible (${formatCurrency(availableCredit)}).`, "⚠️ Requiere autorización forzada por administración para continuar..."]);
          setCreditPassed(false);
        } else {
          setConversionLogs(prev => [...prev, `✅ Crédito aprobado. Saldo disponible actual: ${formatCurrency(availableCredit)}. Monto pedido: ${formatCurrency(totalAmount)}.`]);
          setCreditPassed(true);
        }
      } else {
        setConversionLogs(prev => [...prev, "✅ Cliente ocasional (Mostrador). Operación al contado aprobada."]);
        setCreditPassed(true);
      }
      setConversionStep("stock");
    }, 1500);
  };

  const proceedToStockValidation = (forceCredit = false) => {
    setConversionStep("stock");
    setConversionLogs(prev => [
      ...prev,
      forceCredit ? "🔑 Excepción de crédito otorgada por supervisor." : "",
      "Paso 2: Validación física de inventario en tiempo real...",
    ].filter(Boolean));

    setTimeout(() => {
      let allStockOk = true;
      const logs: string[] = [];

      // Check stock for non-alternative items
      const itemsToCheck = activeVersion.items.filter(i => !i.isAlternative);

      itemsToCheck.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const totalStockAvailable = (prod.stockByDeposit["Central"] || 0) + (prod.stockByDeposit["Norte"] || 0) - prod.reservedStock;
          if (totalStockAvailable < item.quantity) {
            allStockOk = false;
            logs.push(`❌ SKU ${item.sku}: Insuficiente en depósitos. Requeridos: ${item.quantity}, Disponibles libres: ${totalStockAvailable}. (Físico: ${totalStockAvailable + prod.reservedStock}, Reservado: ${prod.reservedStock})`);
          } else {
            logs.push(`✅ SKU ${item.sku}: Stock suficiente. Requeridos: ${item.quantity}, Disponibles libres: ${totalStockAvailable}.`);
          }
        } else {
          allStockOk = false;
          logs.push(`❌ SKU ${item.sku}: Insumo no encontrado en el catálogo principal.`);
        }
      });

      setConversionLogs(prev => [...prev, ...logs]);
      setStockPassed(allStockOk);

      if (allStockOk) {
        setConversionLogs(prev => [...prev, "✅ Verificación de stock exitosa. Todos los ítems principales están disponibles para preparación."]);
      } else {
        setConversionLogs(prev => [...prev, "⚠️ Advertencia de stock: Faltan insumos en depósito. Se requiere solicitar compras o traslado externo."]);
      }
      
      setConversionStep("done");
    }, 2000);
  };

  const finalizeOrder = (forceStock = false) => {
    // Save approved status and decrement stock in localStorage
    if (!quotation || !activeVersion) return;

    const logs: string[] = [
      forceStock ? "🔑 Confirmación manual: Preparar pedido parcial / programar compras." : "",
      "Registrando Pedido en el sistema...",
      "Enviando hoja de preparación digital al depósito...",
    ].filter(Boolean);

    setConversionLogs(prev => [...prev, ...logs]);

    // Decrement stock in DB for items in order (only if they are available to simulate stock depletion)
    const itemsToDeplete = activeVersion.items.filter(i => !i.isAlternative);
    itemsToDeplete.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        const centralStock = prod.stockByDeposit["Central"] || 0;
        const newCentralStock = Math.max(0, centralStock - item.quantity);
        
        // Update stock in localStorage database
        updateProductStock(item.productId, {
          ...prod.stockByDeposit,
          "Central": newCentralStock
        });
      }
    });

    // Update quote status to approved
    const updatedQuotation: Quotation = {
      ...quotation,
      status: "approved"
    };
    saveQuotation(updatedQuotation);
    setQuotation(updatedQuotation);

    setTimeout(() => {
      setConversionLogs(prev => [...prev, "🎉 ¡PEDIDO CREADO CON ÉXITO! El stock ha sido descontado y depósito fue notificado."]);
      setTimeout(() => {
        setIsConverting(false);
        setConversionStep("idle");
        loadData(); // reload
      }, 2000);
    }, 1500);
  };

  const markAsRejected = () => {
    if (confirm("¿Está seguro que desea marcar esta cotización como rechazada?")) {
      const updated: Quotation = {
        ...quotation,
        status: "rejected"
      };
      saveQuotation(updated);
      setQuotation(updated);
      alert("Estado actualizado a Rechazada.");
    }
  };

  const getStockWarningForItem = (item: QuotedItem) => {
    const prod = products.find(p => p.id === item.productId);
    if (!prod) return null;

    const totalAvailable = (prod.stockByDeposit["Central"] || 0) + (prod.stockByDeposit["Norte"] || 0) - prod.reservedStock;
    if (totalAvailable < item.quantity) {
      return {
        text: `⚠️ Stock actual bajo: ${totalAvailable} disp.`,
        class: "badge-danger"
      };
    }
    return null;
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <Link href="/cotizaciones" style={{ color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "16px", fontSize: "0.875rem", fontWeight: "600" }}>
            ⬅️ Volver al Historial
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <h1>Cotización #{quotation.id}</h1>
            <span className={`badge ${getStatusBadgeClass(quotation.status)}`}>
              {translateStatus(quotation.status)}
            </span>
          </div>
          <p className="subtitle">
            Cliente: <strong>{quotation.clientName}</strong> | Vendedor: {quotation.seller} | Origen: {quotation.channel.toUpperCase()}
          </p>
        </div>

        {/* Action buttons (only if not currently approved/rejected) */}
        {quotation.status === "sent" && !isReCotizando && (
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={markAsRejected} className="btn btn-danger">
              ❌ Rechazar
            </button>
            <button onClick={startReCotizacion} className="btn btn-outline">
              🔄 Crear Versión V{quotation.version + 1}
            </button>
            <button onClick={handleConvertToOrder} className="btn btn-primary" style={{ backgroundColor: "var(--success)" }}>
              🛒 Procesar Pedido (Aprobar)
            </button>
          </div>
        )}
      </div>

      {/* Main layout */}
      {!isReCotizando ? (
        <div className="grid-3" style={{ alignItems: "start" }}>
          
          {/* Col 1 & 2: Version selector & Items Table */}
          <div className="card" style={{ gridColumn: "span 2" }}>
            <div className="card-title-bar">
              <h3>Detalle de Líneas Cotizadas</h3>
              <div style={{ display: "flex", gap: "6px" }}>
                {quotation.versions.map(v => (
                  <button
                    key={v.version}
                    onClick={() => handleVersionClick(v.version)}
                    className={`btn ${activeVersionNumber === v.version ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                  >
                    V{v.version} {v.version === quotation.version ? "(Actual)" : ""}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "20px", fontSize: "0.85rem", padding: "12px 16px", backgroundColor: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--primary)" }}>
              🗓️ <strong>Fecha de Versión V{activeVersionNumber}:</strong> {formatDate(activeVersion.date)}<br />
              📝 <strong>Comentarios de la Versión:</strong> {activeVersion.notes || "Sin comentarios adicionales."}
            </div>

            <div className="table-container" style={{ marginBottom: "20px" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Insumo</th>
                    <th>Cant.</th>
                    <th>P. Lista</th>
                    <th>Desc. %</th>
                    <th>P. Final</th>
                    <th>Stock Hoy</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activeVersion.items.map((item, idx) => {
                    const stockWarning = getStockWarningForItem(item);
                    return (
                      <tr key={idx}>
                        <td><code>{item.sku}</code></td>
                        <td>
                          <div>
                            <strong>{item.name}</strong>
                          </div>
                        </td>
                        <td style={{ fontWeight: "600" }}>{item.quantity}</td>
                        <td>{formatCurrency(item.basePrice)}</td>
                        <td>{item.discount}%</td>
                        <td style={{ fontWeight: "600" }}>{formatCurrency(item.unitPrice)}</td>
                        <td>
                          {stockWarning ? (
                            <span className={`badge ${stockWarning.class}`} style={{ fontSize: "0.6rem", padding: "2px 6px" }}>
                              {stockWarning.text}
                            </span>
                          ) : (
                            <span className="badge badge-success" style={{ fontSize: "0.6rem", padding: "2px 6px" }}>
                              ✅ OK
                            </span>
                          )}
                        </td>
                        <td style={{ fontWeight: "700" }}>{formatCurrency(item.unitPrice * item.quantity)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ width: "300px", padding: "16px", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-tertiary)", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Subtotal (Bruto):</span>
                  <span>{formatCurrency(activeVersion.subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Descuento:</span>
                  <span style={{ color: "var(--success)" }}>-{formatCurrency(activeVersion.discount)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: "700", borderTop: "1px solid var(--border-color)", paddingTop: "8px" }}>
                  <span>Total Neto:</span>
                  <span style={{ color: "var(--primary)" }}>{formatCurrency(activeVersion.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Col 3: Side cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Customer Details Card */}
            <div className="card">
              <h3>Ficha de Cliente</h3>
              {client ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.875rem", marginTop: "12px" }}>
                  <div>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>Razón Social</span>
                    <strong style={{ display: "block" }}>{client.name}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>Términos de Pago</span>
                    <span style={{ display: "block" }}>{client.paymentTerms}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>Crédito Disponible</span>
                    <strong style={{ display: "block", color: (client.creditLimit - client.balance) < activeVersion.total ? "var(--danger)" : "var(--success)" }}>
                      {client.creditLimit === 0 ? "Solo Contado" : formatCurrency(client.creditLimit - client.balance)}
                    </strong>
                  </div>
                </div>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Cliente ocasional cargado en mostrador.</p>
              )}
            </div>

            {/* Context Problem Card */}
            <div className="card">
              <h3>Problema / Contexto Registrado</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontStyle: "italic", marginTop: "12px" }}>
                "{quotation.contextProblem || "No se especificó un requerimiento técnico detallado en esta cotización."}"
              </p>
            </div>
          </div>

        </div>
      ) : (
        /* RE-COTIZAR EDITOR VIEW (CREATING V2+) */
        <div className="card">
          <div className="card-title-bar">
            <h3>Modificar Cotización: Crear Versión V{quotation.version + 1}</h3>
            <button onClick={() => setIsReCotizando(false)} className="btn btn-secondary" style={{ padding: "6px 12px" }}>
              Cancelar Edición
            </button>
          </div>

          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "20px" }}>
            El cliente solicitó modificaciones. Agregue, modifique cantidades, aplique descuentos o elimine ítems. Al guardar, se creará una versión nueva (V{quotation.version + 1}) manteniendo el historial de la cotización intacto.
          </p>

          {/* Add product form in edit mode */}
          <div className="grid-2" style={{ marginBottom: "24px", padding: "16px", borderRadius: "var(--radius-md)", border: "1px dashed var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div className="form-group" style={{ marginBottom: "0px" }}>
                <label className="form-label">Buscar Insumo para Agregar</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ingrese SKU o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div style={{ maxHeight: "120px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-tertiary)" }}>
                {filteredProducts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--border-color)", backgroundColor: selectedProduct?.id === p.id ? "var(--info-bg)" : "transparent", fontSize: "0.8rem", display: "flex", justifyContent: "space-between" }}
                  >
                    <span>{p.name} ({p.sku})</span>
                    <strong>{formatCurrency(p.basePrice)}</strong>
                  </div>
                ))}
              </div>
            </div>

            {selectedProduct && (
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <strong style={{ fontSize: "0.85rem", color: "var(--primary)" }}>{selectedProduct.name}</strong>
                  <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Precio Lista: {formatCurrency(selectedProduct.basePrice)}</span>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", marginTop: "12px" }}>
                  <div className="form-group" style={{ marginBottom: "0px", width: "70px" }}>
                    <label className="form-label">Cant.</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={qty}
                      onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                      <input type="checkbox" checked={isAlternative} onChange={(e) => setIsAlternative(e.target.checked)} />
                      Alternativo
                    </label>
                    <button onClick={handleAddItemToEdit} className="btn btn-primary" style={{ padding: "8px 12px" }}>
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Edit Table */}
          <div className="table-container" style={{ marginBottom: "24px" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Insumo</th>
                  <th>Cant.</th>
                  <th>Lista</th>
                  <th>Descuento (%)</th>
                  <th>Final Unit.</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {editItems.map((item, index) => (
                  <tr key={index}>
                    <td><code>{item.sku}</code></td>
                    <td>
                      <div>
                        <strong>{item.name}</strong>
                        {item.isAlternative && <span className="badge badge-warning" style={{ fontSize: "0.6rem", padding: "1px 4px", marginLeft: "6px" }}>Alt</span>}
                      </div>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        style={{ width: "60px", padding: "4px 8px" }}
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...editItems];
                          updated[index].quantity = Math.max(1, parseInt(e.target.value) || 1);
                          setEditItems(updated);
                        }}
                      />
                    </td>
                    <td>{formatCurrency(item.basePrice)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="form-input"
                          style={{ width: "60px", padding: "4px 8px" }}
                          value={item.discount}
                          onChange={(e) => handleUpdateItemDiscountInEdit(index, Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                        />
                        <span>%</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: "600" }}>{formatCurrency(item.unitPrice)}</td>
                    <td style={{ fontWeight: "700" }}>{formatCurrency(item.unitPrice * item.quantity)}</td>
                    <td>
                      <button onClick={() => handleRemoveItemFromEdit(index)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer" }}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes and save */}
          <div className="grid-2" style={{ marginBottom: "24px" }}>
            <div className="form-group">
              <label className="form-label">Comentarios / Notas para V{quotation.version + 1}</label>
              <textarea
                className="form-textarea"
                placeholder="Explique el motivo del cambio. Ej: Se reemplaza rodamiento SKF por alternativa nacional a pedido del cliente..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
            
            <div style={{ backgroundColor: "rgba(15, 23, 42, 0.4)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", padding: "20px", display: "flex", flexDirection: "column", gap: "10px", justifyContent: "center" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <span>Subtotal (Edición):</span>
                <span>{formatCurrency(calculateEditSubtotal())}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <span>Descuento total:</span>
                <span style={{ color: "var(--success)" }}>-{formatCurrency(calculateEditDiscount())}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: "700", paddingTop: "8px", borderTop: "1px solid var(--border-color)" }}>
                <span>Total Estimado:</span>
                <span style={{ color: "var(--primary)" }}>{formatCurrency(calculateEditTotal())}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button onClick={() => setIsReCotizando(false)} className="btn btn-secondary">
              Cancelar
            </button>
            <button onClick={saveNewVersion} className="btn btn-primary" style={{ backgroundColor: "var(--success)" }}>
              💾 Registrar Versión V{quotation.version + 1}
            </button>
          </div>
        </div>
      )}

      {/* CONVERT TO ORDER MODAL SIMULATOR */}
      {isConverting && (
        <div style={{
          position: "fixed",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.6)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "none"
        }}>
          <div className="card" style={{ maxWidth: "600px", width: "90%", padding: "30px", maxHeight: "85vh", overflowY: "auto" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--primary)", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              <span>⚙️</span> Asistente de Preparación de Pedido
            </h3>
            
            <div style={{
              backgroundColor: "#090d16",
              fontFamily: "monospace",
              padding: "16px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              minHeight: "200px",
              color: "#38bdf8",
              fontSize: "0.85rem",
              lineHeight: "1.6",
              margin: "20px 0px",
              display: "flex",
              flexDirection: "column",
              gap: "4px"
            }}>
              {conversionLogs.map((log, idx) => (
                <div key={idx} style={{
                  color: log.startsWith("❌") ? "#ef4444" : log.startsWith("✅") ? "#10b981" : log.startsWith("⚠️") ? "#f59e0b" : "#38bdf8"
                }}>
                  {log}
                </div>
              ))}
            </div>

            {/* Steps interactive buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
              {conversionStep === "credit" && !creditPassed && (
                <>
                  <button onClick={() => setIsConverting(false)} className="btn btn-secondary">
                    Cancelar
                  </button>
                  <button onClick={() => proceedToStockValidation(true)} className="btn btn-primary" style={{ backgroundColor: "var(--danger)" }}>
                    🔑 Forzar Autorización de Crédito
                  </button>
                </>
              )}

              {conversionStep === "stock" && (
                <button onClick={() => proceedToStockValidation(false)} className="btn btn-primary" style={{ display: "none" }}>
                  Continuar
                </button>
              )}

              {conversionStep === "done" && (
                <>
                  <button onClick={() => setIsConverting(false)} className="btn btn-secondary">
                    Cerrar
                  </button>
                  {!stockPassed ? (
                    <button onClick={() => finalizeOrder(true)} className="btn btn-primary" style={{ backgroundColor: "var(--warning)" }}>
                      ⚠️ Ignorar y Despachar Parcial (Compras requerida)
                    </button>
                  ) : (
                    <button onClick={() => finalizeOrder(false)} className="btn btn-primary" style={{ backgroundColor: "var(--success)" }}>
                      📦 Despachar a Depósito
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
