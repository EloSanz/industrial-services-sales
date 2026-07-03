"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  getClients,
  getProducts,
  getInquiries,
  saveQuotation,
  saveInquiry,
  Client,
  Product,
  QuotedItem,
  Quotation
} from "@/lib/mockData";

function QuoteWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get("inquiryId");

  const [step, setStep] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Form State
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [channel, setChannel] = useState<"whatsapp" | "email" | "phone" | "mostrador">("whatsapp");
  const [contextProblem, setContextProblem] = useState("");
  const [items, setItems] = useState<QuotedItem[]>([]);
  const [notes, setNotes] = useState("");
  
  // Custom client creation if needed
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientContact, setNewClientContact] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");

  // Product Selection helper states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [isAlternative, setIsAlternative] = useState(false);

  // Approval simulation state
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    const clientsData = getClients();
    const productsData = getProducts();
    setClients(clientsData);
    setProducts(productsData);

    // Pre-fill from Inquiry if inquiryId is provided
    if (inquiryId) {
      const inquiries = getInquiries();
      const foundInq = inquiries.find(i => i.id === inquiryId);
      if (foundInq) {
        setChannel(foundInq.channel);
        setContextProblem(foundInq.messageText);
        
        // Find corresponding client
        const client = clientsData.find(c => c.id === foundInq.clientId);
        if (client) {
          setSelectedClient(client);
        } else {
          // If no client, fill as custom
          setIsNewClient(true);
          setNewClientName(foundInq.clientName);
          setNewClientContact(foundInq.contactName);
          setNewClientPhone(foundInq.phone);
          setNewClientEmail(foundInq.email);
        }
      }
    }
  }, [inquiryId]);

  // Handle Client Selection
  const handleClientChange = (clientId: string) => {
    if (clientId === "new") {
      setIsNewClient(true);
      setSelectedClient(null);
    } else {
      setIsNewClient(false);
      const client = clients.find(c => c.id === clientId) || null;
      setSelectedClient(client);
      
      // Auto-apply special agreements or discounts if any items are already loaded
      if (client && items.length > 0) {
        recalculateSpecialAgreements(client, items);
      }
    }
  };

  const recalculateSpecialAgreements = (client: Client, currentItems: QuotedItem[]) => {
    const updated = currentItems.map(item => {
      let discount = 0;
      if (client.id === "cli-1" && item.sku.startsWith("VAL")) {
        discount = 10; // Acme 10% on Valves
      } else if (client.id === "cli-4" && item.sku.startsWith("ROD")) {
        discount = 15; // Siderar 15% on Bearings
      }
      return {
        ...item,
        discount,
        unitPrice: Math.round(item.basePrice * (1 - discount / 100))
      };
    });
    setItems(updated);
  };

  // Add Item to Quotation
  const handleAddItem = () => {
    if (!selectedProduct) return;
    
    // Check if item already exists in quote
    const existingIndex = items.findIndex(item => item.productId === selectedProduct.id && item.isAlternative === isAlternative);
    
    let discount = 0;
    // Auto-apply agreements based on client
    if (selectedClient) {
      if (selectedClient.id === "cli-1" && selectedProduct.category === "Válvulas") {
        discount = 10; // Acme 10% off Valves
      } else if (selectedClient.id === "cli-4" && selectedProduct.category === "Rodamientos") {
        discount = 15; // Siderar 15% off Bearings
      }
    }

    const unitPrice = Math.round(selectedProduct.basePrice * (1 - discount / 100));

    if (existingIndex >= 0) {
      const updatedItems = [...items];
      updatedItems[existingIndex].quantity += qty;
      setItems(updatedItems);
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
      setItems([...items, newItem]);
    }

    // Reset selection helper states
    setSelectedProduct(null);
    setSearchTerm("");
    setQty(1);
    setIsAlternative(false);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  // Update Item Discount
  const handleUpdateItemDiscount = (index: number, discVal: number) => {
    const updated = [...items];
    const item = updated[index];
    item.discount = discVal;
    item.unitPrice = Math.round(item.basePrice * (1 - discVal / 100));
    setItems(updated);
    
    // Check if margin is too low (e.g. if any item has > 25% discount, simulate approval requirement)
    const hasHighDiscount = updated.some(it => it.discount >= 25);
    setRequiresApproval(hasHighDiscount);
    if (!hasHighDiscount) {
      setIsApproved(false);
    }
  };

  // Check Credit Limit status
  const getCreditLimitWarning = () => {
    if (isNewClient || !selectedClient) return null;
    const availableCredit = selectedClient.creditLimit - selectedClient.balance;
    const quoteTotal = calculateTotal();
    
    if (selectedClient.creditLimit === 0) {
      return {
        type: "info",
        message: "Cliente sin Cuenta Corriente. Operará al contado/transferencia."
      };
    }
    
    if (quoteTotal > availableCredit) {
      return {
        type: "danger",
        message: `¡Alerta de Crédito! El total de la cotización (${formatCurrency(quoteTotal)}) supera el crédito disponible del cliente (${formatCurrency(availableCredit)}). Requiere autorización de administración al confirmar el pedido.`
      };
    }
    
    if (availableCredit < 100000) {
      return {
        type: "warning",
        message: `Crédito disponible bajo: El cliente tiene ${formatCurrency(availableCredit)} de saldo disponible.`
      };
    }
    
    return null;
  };

  // Calculations
  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.basePrice * item.quantity), 0);
  };

  const calculateDiscount = () => {
    return items.reduce((sum, item) => sum + ((item.basePrice - item.unitPrice) * item.quantity), 0);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0
    }).format(val);
  };

  const getStockStatus = (prod: Product, quantityRequested: number) => {
    const centralStock = prod.stockByDeposit["Central"] || 0;
    const norteStock = prod.stockByDeposit["Norte"] || 0;
    const totalPhysical = centralStock + norteStock;
    const totalAvailable = totalPhysical - prod.reservedStock;

    if (totalAvailable >= quantityRequested) {
      return {
        status: "ok",
        label: "Stock Disponible",
        class: "badge-success",
        details: `Dispone de ${totalAvailable} unidades libres (${centralStock} Central, ${norteStock} Norte).`
      };
    } else if (totalPhysical >= quantityRequested) {
      return {
        status: "warning",
        label: "Stock Comprometido",
        class: "badge-warning",
        details: `Hay ${totalPhysical} unidades físicas, pero ${prod.reservedStock} están reservadas para otros pedidos.`
      };
    } else {
      const externalStock = prod.stockByDeposit["Externo"] || 0;
      if (totalAvailable + externalStock >= quantityRequested) {
        return {
          status: "info",
          label: "Stock en Depósito Externo",
          class: "badge-info",
          details: `Requiere traslado desde depósito externo (disponibles ${externalStock} unid.). Plazo +24hs.`
        };
      } else {
        return {
          status: "danger",
          label: "Sin Stock Suficiente",
          class: "badge-danger",
          details: `Faltan unidades. Stock disponible total: ${totalAvailable} unidades. Requiere pedido a compras.`
        };
      }
    }
  };

  // Simulation of manager approval
  const handleRequestApproval = () => {
    setIsApproving(true);
    setTimeout(() => {
      setIsApproving(false);
      setIsApproved(true);
    }, 2000);
  };

  // Save Quote
  const handleSaveQuotation = () => {
    const clientName = isNewClient ? newClientName : (selectedClient?.name || "Cliente General");
    const clientId = isNewClient ? "cli-new" : (selectedClient?.id || "cli-general");

    const newQuote: Quotation = {
      id: "cot-" + Math.floor(100 + Math.random() * 900),
      clientName,
      clientId,
      date: new Date().toISOString(),
      seller: "Juan Pérez",
      channel,
      status: "sent",
      version: 1,
      contextProblem,
      versions: [
        {
          version: 1,
          date: new Date().toISOString(),
          items,
          subtotal: calculateSubtotal(),
          discount: calculateDiscount(),
          total: calculateTotal(),
          notes
        }
      ]
    };

    saveQuotation(newQuote);

    // If preloaded from Inquiry, mark inquiry as completed (quoted)
    if (inquiryId) {
      const inquiries = getInquiries();
      const inq = inquiries.find(i => i.id === inquiryId);
      if (inq) {
        inq.status = "quoted";
        saveInquiry(inq);
      }
    }

    alert("¡Cotización guardada con éxito!");
    router.push(`/cotizaciones/${newQuote.id}`);
  };

  // Generate WhatsApp message copy
  const getWhatsAppMessage = () => {
    const clientName = isNewClient ? newClientName : (selectedClient?.name || "");
    let text = `*InsumosFlow - Cotización de Insumos*\n`;
    text += `Cliente: *${clientName}*\n`;
    if (contextProblem) text += `Caso de estudio: _${contextProblem}_\n`;
    text += `--------------------------------------\n`;
    
    // Group alternatives if any
    const mainItems = items.filter(i => !i.isAlternative);
    const altItems = items.filter(i => i.isAlternative);

    if (mainItems.length > 0) {
      text += `*Opción Recomendada:*\n`;
      mainItems.forEach(i => {
        text += `- ${i.quantity}x ${i.name}: *${formatCurrency(i.unitPrice)} c/u*\n`;
      });
    }

    if (altItems.length > 0) {
      text += `\n*Opción Alternativa (Económica/Equivalente):*\n`;
      altItems.forEach(i => {
        text += `- ${i.quantity}x ${i.name}: *${formatCurrency(i.unitPrice)} c/u*\n`;
      });
    }

    text += `--------------------------------------\n`;
    text += `*Total Cotizado: ${formatCurrency(calculateTotal())}*\n`;
    text += `Validez: 5 días. Plazos sujetos a stock.\n`;
    
    return text;
  };

  // Generate Email copy
  const getEmailMessage = () => {
    const clientName = isNewClient ? newClientName : (selectedClient?.name || "");
    let text = `Estimado/a ${isNewClient ? newClientContact : (selectedClient?.contactName || "")},\n\n`;
    text += `Agradecemos su consulta. Adjuntamos el detalle de lo cotizado según lo conversado:\n\n`;
    text += `Detalle de Productos:\n`;
    
    items.forEach((i, idx) => {
      text += `${idx + 1}. ${i.name} [SKU: ${i.sku}]\n`;
      text += `   Cantidad: ${i.quantity} | Precio Lista: ${formatCurrency(i.basePrice)} | Descuento: ${i.discount}%\n`;
      text += `   Precio Unitario: ${formatCurrency(i.unitPrice)} | Tipo: ${i.isAlternative ? "Alternativa" : "Principal"}\n\n`;
    });
    
    text += `--------------------------------------\n`;
    text += `Subtotal: ${formatCurrency(calculateSubtotal())}\n`;
    text += `Descuento Comercial: ${formatCurrency(calculateDiscount())}\n`;
    text += `TOTAL NETO: ${formatCurrency(calculateTotal())}\n`;
    text += `Condición de Pago: ${isNewClient ? "Contado" : (selectedClient?.paymentTerms || "")}\n\n`;
    text += `Quedamos a su entera disposición ante cualquier consulta para avanzar con la preparación.\n\n`;
    text += `Atentamente,\nJuan Pérez - InsumosFlow`;
    
    return text;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copiado al portapapeles con éxito.");
  };

  // Filter products by search query
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: "1000px", marginLeft: "auto", marginRight: "auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <Link href="/" style={{ color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "16px", fontSize: "0.875rem", fontWeight: "600" }}>
          ⬅️ Volver al Panel
        </Link>
        <h1>Crear Nueva Cotización</h1>
        <p className="subtitle">Proceso de registro estructurado y validación técnica</p>
      </div>

      {/* Progress Steps */}
      <div className="wizard-steps">
        <div className={`wizard-step ${step === 1 ? "active" : step > 1 ? "completed" : ""}`}>
          <div className="wizard-step-number">1</div>
          <span className="wizard-step-label">Cliente & Origen</span>
        </div>
        <div className={`wizard-step ${step === 2 ? "active" : step > 2 ? "completed" : ""}`}>
          <div className="wizard-step-number">2</div>
          <span className="wizard-step-label">Productos & Stock</span>
        </div>
        <div className={`wizard-step ${step === 3 ? "active" : step > 3 ? "completed" : ""}`}>
          <div className="wizard-step-number">3</div>
          <span className="wizard-step-label">Precios & Descuentos</span>
        </div>
        <div className={`wizard-step ${step === 4 ? "active" : step > 4 ? "completed" : ""}`}>
          <div className="wizard-step-number">4</div>
          <span className="wizard-step-label">Vista Previa & Envío</span>
        </div>
      </div>

      {/* STEP 1: Client & Origin */}
      {step === 1 && (
        <div className="card">
          <div className="card-title-bar">
            <h3>Paso 1: Información de Contacto e Historial</h3>
            <span className="badge badge-info">Requerido</span>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Cliente Registrado</label>
              <select
                className="form-select"
                value={isNewClient ? "new" : (selectedClient?.id || "")}
                onChange={(e) => handleClientChange(e.target.value)}
              >
                <option value="">-- Seleccionar Cliente --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
                <option value="new">➕ Cargar Cliente Nuevo (Mostrador/WhatsApp)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Canal de Recepción</label>
              <select
                className="form-select"
                value={channel}
                onChange={(e) => setChannel(e.target.value as any)}
              >
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="email">✉️ Email</option>
                <option value="phone">📞 Teléfono</option>
                <option value="mostrador">👤 Mostrador / Presencial</option>
              </select>
            </div>
          </div>

          {/* New Client Form */}
          {isNewClient && (
            <div style={{
              marginTop: "16px",
              padding: "20px",
              borderRadius: "var(--radius-md)",
              border: "1px dashed var(--border-color)",
              backgroundColor: "var(--bg-tertiary)"
            }}>
              <h4 style={{ marginBottom: "16px", color: "var(--primary)" }}>Carga de Cliente Nuevo</h4>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Razón Social / Nombre</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: Metalúrgica Juan"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contacto (Nombre)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: Juan Pérez"
                    value={newClientContact}
                    onChange={(e) => setNewClientContact(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: +54 9 11 555-1234"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="Ej: juan@taller.com"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Existing Client Details Card */}
          {selectedClient && !isNewClient && (
            <div style={{
              marginTop: "20px",
              padding: "20px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <h4 style={{ color: "var(--secondary)" }}>{selectedClient.name}</h4>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Contacto: {selectedClient.contactName} ({selectedClient.email})</span>
                </div>
                {selectedClient.hasSpecialAgreement && (
                  <span className="badge badge-success">🤝 Acuerdo Comercial Activo</span>
                )}
              </div>
              
              {/* Credit Status Panel */}
              <div className="grid-3" style={{ marginTop: "16px", gap: "16px" }}>
                <div style={{ backgroundColor: "#fafafa", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>Límite de Crédito</span>
                  <strong style={{ fontSize: "1rem" }}>{selectedClient.creditLimit === 0 ? "Sin Crédito" : formatCurrency(selectedClient.creditLimit)}</strong>
                </div>
                <div style={{ backgroundColor: "#fafafa", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>Saldo deudor actual</span>
                  <strong style={{ fontSize: "1rem" }}>{formatCurrency(selectedClient.balance)}</strong>
                </div>
                <div style={{ backgroundColor: "#fafafa", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>Crédito Disponible</span>
                  <strong style={{ fontSize: "1rem", color: (selectedClient.creditLimit - selectedClient.balance) <= 50000 ? "var(--danger)" : "var(--success)" }}>
                    {formatCurrency(selectedClient.creditLimit - selectedClient.balance)}
                  </strong>
                </div>
              </div>
              
              {selectedClient.specialAgreementDetails && (
                <div style={{ marginTop: "12px", fontSize: "0.85rem", color: "var(--text-secondary)", backgroundColor: "rgba(16, 185, 129, 0.05)", padding: "8px 12px", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--success)" }}>
                  💡 <strong>Detalle del Acuerdo:</strong> {selectedClient.specialAgreementDetails}
                </div>
              )}
            </div>
          )}

          {/* Context Problem Input */}
          <div className="form-group" style={{ marginTop: "24px" }}>
            <label className="form-label">
              Contexto de la Solicitud / Problema del Cliente
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "8px" }}>(Recomendado para trazabilidad)</span>
            </label>
            <textarea
              className="form-textarea"
              placeholder="Describa brevemente la necesidad técnica expresada por el cliente. Ej: Sellar una fuga de vapor en junta de brida de 2 pulgadas, temperatura operacional 240°C..."
              value={contextProblem}
              onChange={(e) => setContextProblem(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "32px" }}>
            <button
              onClick={() => setStep(2)}
              className="btn btn-primary"
              disabled={!isNewClient && !selectedClient}
            >
              Siguiente Paso ➡️
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Products & Stock */}
      {step === 2 && (
        <div className="card">
          <div className="card-title-bar">
            <h3>Paso 2: Selección de Productos & Chequeo de Stock</h3>
            <span className="badge badge-info">Fila de Productos ({items.length})</span>
          </div>

          {/* Product selector grid */}
          <div className="grid-2" style={{ marginBottom: "24px" }}>
            {/* Search and select */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group" style={{ marginBottom: "0px" }}>
                <label className="form-label">Buscar en Catálogo</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ingrese SKU, nombre del insumo o aplicación..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div style={{
                maxHeight: "220px",
                overflowY: "auto",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-tertiary)"
              }}>
                {filteredProducts.length === 0 ? (
                  <p style={{ padding: "16px", color: "var(--text-muted)", fontSize: "0.85rem" }}>No se encontraron productos.</p>
                ) : (
                  filteredProducts.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      style={{
                        padding: "10px 16px",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--border-color)",
                        backgroundColor: selectedProduct?.id === p.id ? "var(--info-bg)" : "transparent",
                        transition: "var(--transition)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "0.875rem", display: "block" }}>{p.name}</strong>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>SKU: {p.sku} | Marca: {p.brand}</span>
                      </div>
                      <span style={{ fontWeight: "700", fontSize: "0.875rem" }}>{formatCurrency(p.basePrice)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Selected Product Stock Check */}
            <div style={{
              backgroundColor: "var(--bg-tertiary)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}>
              {selectedProduct ? (
                <div>
                  <h4 style={{ color: "var(--primary)", marginBottom: "4px" }}>{selectedProduct.name}</h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "12px" }}>{selectedProduct.description}</p>
                  
                  {/* Stock Breakdown by Deposit */}
                  <div style={{ marginBottom: "12px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Stock por Depósito:</span>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.75rem", backgroundColor: "#fafafa", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border-color)" }}>
                        🏢 Central: <strong>{selectedProduct.stockByDeposit["Central"]}</strong>
                      </span>
                      <span style={{ fontSize: "0.75rem", backgroundColor: "#fafafa", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border-color)" }}>
                        🏢 Norte (Norte): <strong>{selectedProduct.stockByDeposit["Norte"]}</strong>
                      </span>
                      <span style={{ fontSize: "0.75rem", backgroundColor: "#fafafa", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border-color)" }}>
                        🚚 Externo: <strong>{selectedProduct.stockByDeposit["Externo"]}</strong>
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <span className="badge badge-info" style={{ textTransform: "none", fontSize: "0.7rem" }}>
                      Reservados: {selectedProduct.reservedStock} unid.
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                      Físico verificado: {selectedProduct.lastPhysicalVerifyDate}
                    </span>
                  </div>

                  {/* Quantity & Add Selector */}
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                    <div className="form-group" style={{ marginBottom: "0px", width: "80px" }}>
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
                        <input
                          type="checkbox"
                          checked={isAlternative}
                          onChange={(e) => setIsAlternative(e.target.checked)}
                        />
                        Agregar como opción Alternativa
                      </label>
                      <button
                        onClick={handleAddItem}
                        className="btn btn-primary"
                        style={{ width: "100%" }}
                      >
                        ➕ Agregar a Cotización
                      </button>
                    </div>
                  </div>

                  {/* Alternative equivalent advice */}
                  {selectedProduct.alternativeProductIds.length > 0 && (
                    <div style={{ marginTop: "16px", padding: "8px 12px", backgroundColor: "var(--info-bg)", borderRadius: "var(--radius-sm)", fontSize: "0.75rem", borderLeft: "2px solid var(--secondary)", color: "var(--text-secondary)" }}>
                      💡 <strong>Equivalente sugerido:</strong> Este producto cuenta con alternativas equivalentes (ej. {products.find(p => p.id === selectedProduct.alternativeProductIds[0])?.name}). Considerar cotizar ambas opciones en paralelo.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", padding: "40px" }}>
                  <span>👈 Seleccione un producto del listado para chequear disponibilidad</span>
                </div>
              )}
            </div>
          </div>

          {/* Current quote items list */}
          <h4 style={{ marginBottom: "12px" }}>Líneas de Cotización Actuales</h4>
          {items.length === 0 ? (
            <p style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)" }}>
              No se han agregado productos a la cotización todavía.
            </p>
          ) : (
            <div className="table-container" style={{ marginBottom: "24px" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Estado de Stock</th>
                    <th>Precio Base</th>
                    <th>Tipo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const prod = products.find(p => p.id === item.productId);
                    const stockInfo = prod ? getStockStatus(prod, item.quantity) : null;
                    return (
                      <tr key={index}>
                        <td><code>{item.sku}</code></td>
                        <td>
                          <div>
                            <strong>{item.name}</strong>
                          </div>
                        </td>
                        <td style={{ fontWeight: "600" }}>{item.quantity}</td>
                        <td>
                          {stockInfo && (
                            <div>
                              <span className={`badge ${stockInfo.class}`} style={{ fontSize: "0.65rem", padding: "2px 8px" }}>
                                {stockInfo.label}
                              </span>
                              <span style={{ display: "block", fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                                {stockInfo.details}
                              </span>
                            </div>
                          )}
                        </td>
                        <td>{formatCurrency(item.basePrice)}</td>
                        <td>
                          <span className={`badge ${item.isAlternative ? "badge-warning" : "badge-info"}`} style={{ fontSize: "0.65rem" }}>
                            {item.isAlternative ? "Alternativo" : "Principal"}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleRemoveItem(index)}
                            style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "1rem" }}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Credit Check info before proceeding */}
          {getCreditLimitWarning() && (
            <div className={`alert alert-${getCreditLimitWarning()!.type}`}>
              <span>⚠️</span>
              <p>{getCreditLimitWarning()!.message}</p>
            </div>
          )}

          {/* Step navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "32px" }}>
            <button onClick={() => setStep(1)} className="btn btn-secondary">
              ⬅️ Atrás
            </button>
            <button
              onClick={() => setStep(3)}
              className="btn btn-primary"
              disabled={items.length === 0}
            >
              Siguiente Paso ➡️
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Pricing & Discounts */}
      {step === 3 && (
        <div className="card">
          <div className="card-title-bar">
            <h3>Paso 3: Definición de Precios, Márgenes & Descuentos</h3>
            <span className="badge badge-info">Flexibilidad Comercial</span>
          </div>

          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "20px" }}>
            Aplique descuentos comerciales personalizados. Si el descuento excede el 25% (margen crítico), se requerirá simulación de aprobación gerencial.
          </p>

          <div className="table-container" style={{ marginBottom: "32px" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Precio Lista</th>
                  <th>Acuerdo Activo / Alerta</th>
                  <th style={{ width: "150px" }}>Descuento (%)</th>
                  <th>Precio Final</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const prod = products.find(p => p.id === item.productId);
                  
                  // Check if price is outdated (priceLastUpdated older than 30 days)
                  const isOutdated = prod ? (new Date().getTime() - new Date(prod.priceLastUpdated).getTime()) > 30 * 24 * 60 * 60 * 1000 : false;
                  
                  return (
                    <tr key={index}>
                      <td>
                        <div>
                          <strong>{item.name}</strong>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>
                            {item.isAlternative ? "⚠️ Item Alternativo" : "Normal"}
                          </span>
                        </div>
                      </td>
                      <td>{formatCurrency(item.basePrice)}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {selectedClient?.hasSpecialAgreement && item.discount > 0 && (
                            <span className="badge badge-success" style={{ fontSize: "0.6rem", padding: "2px 6px" }}>
                              Acuerdo Especial
                            </span>
                          )}
                          {isOutdated && (
                            <span className="badge badge-danger" style={{ fontSize: "0.6rem", padding: "2px 6px" }}>
                              Precio Desactualizado
                            </span>
                          )}
                          {!isOutdated && !selectedClient?.hasSpecialAgreement && (
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Sin alertas</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className="form-input"
                            style={{ padding: "6px 8px", width: "70px" }}
                            value={item.discount}
                            onChange={(e) => handleUpdateItemDiscount(index, Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          />
                          <span style={{ fontSize: "0.875rem" }}>%</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: "600" }}>{formatCurrency(item.unitPrice)}</td>
                      <td style={{ fontWeight: "700" }}>{formatCurrency(item.unitPrice * item.quantity)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pricing Totals Card */}
          <div className="grid-2" style={{ marginBottom: "24px" }}>
            <div className="form-group">
              <label className="form-label">Notas Adicionales de la Cotización</label>
              <textarea
                className="form-textarea"
                placeholder="Indicar condiciones comerciales especiales, plazos de entrega estimados (ej: 48hs hábiles) o aclaraciones sobre el stock."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ height: "140px" }}
              />
            </div>

            <div style={{
              backgroundColor: "var(--bg-tertiary)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              justifyContent: "center"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Subtotal (Bruto):</span>
                <span>{formatCurrency(calculateSubtotal())}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Descuento Total:</span>
                <span style={{ color: "var(--success)" }}>-{formatCurrency(calculateDiscount())}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.125rem", fontWeight: "700", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
                <span>TOTAL COTIZADO:</span>
                <span style={{ color: "var(--primary)" }}>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
          </div>

          {/* Approval Warning & button */}
          {requiresApproval && (
            <div className="alert alert-warning" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <span>🛡️</span>
                <strong>Autorización Especial Requerida</strong>
              </div>
              <p style={{ fontSize: "0.85rem", margin: "0px" }}>
                Has aplicado un descuento de 25% o más en una o más líneas de producto. Para poder avanzar, se requiere la validación del Gerente de Ventas.
              </p>
              <div>
                {!isApproved ? (
                  <button
                    onClick={handleRequestApproval}
                    className="btn btn-primary"
                    style={{ fontSize: "0.75rem", padding: "8px 16px" }}
                    disabled={isApproving}
                  >
                    {isApproving ? "⏳ Solicitando Aprobación..." : "🔑 Simular Aprobación del Gerente"}
                  </button>
                ) : (
                  <span className="badge badge-success" style={{ fontSize: "0.75rem", padding: "6px 12px" }}>
                    ✅ APROBADO POR GERENCIA (JUAN G.)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Step navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "32px" }}>
            <button onClick={() => setStep(2)} className="btn btn-secondary">
              ⬅️ Atrás
            </button>
            <button
              onClick={() => setStep(4)}
              className="btn btn-primary"
              disabled={requiresApproval && !isApproved}
            >
              Siguiente Paso ➡️
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Send */}
      {step === 4 && (
        <div className="card">
          <div className="card-title-bar">
            <h3>Paso 4: Vista Previa, Exportación & Confirmación</h3>
            <span className="badge badge-success">V1 Borrador Listo</span>
          </div>

          <div className="alert alert-info">
            <span>💡</span>
            <p>
              La cotización se guardará en el historial del sistema. Puede copiar el mensaje directo para enviárselo al cliente por WhatsApp de manera ágil, o el correo electrónico formal.
            </p>
          </div>

          {/* Styled Invoice/Quotation Mockup */}
          <div style={{
            backgroundColor: "#fff",
            color: "#1e293b",
            borderRadius: "var(--radius-md)",
            padding: "30px",
            boxShadow: "inset 0 0 10px rgba(0,0,0,0.1)",
            marginBottom: "24px",
            fontFamily: "monospace"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #1e293b", paddingBottom: "16px", marginBottom: "16px" }}>
              <div>
                <h3 style={{ color: "#1e293b", margin: "0px", fontFamily: "sans-serif" }}>INSUMOS INDUSTRIALES S.A.</h3>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Ruta 9 Km 280, Rosario - Tel: 0341-499999</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <h4 style={{ color: "var(--primary)", margin: "0px" }}>COTIZACIÓN</h4>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Fecha: {new Date().toLocaleDateString()}</span>
              </div>
            </div>

            <div style={{ marginBottom: "20px", fontSize: "0.85rem" }}>
              <strong>CLIENTE:</strong> {isNewClient ? newClientName : selectedClient?.name}<br />
              <strong>CONTACTO:</strong> {isNewClient ? newClientContact : selectedClient?.contactName}<br />
              <strong>TELÉFONO:</strong> {isNewClient ? newClientPhone : selectedClient?.phone}<br />
              <strong>EMAIL:</strong> {isNewClient ? newClientEmail : selectedClient?.email}<br />
              {contextProblem && <><strong>CONTEXTO / REQUERIMIENTO:</strong> {contextProblem}<br /></>}
              <strong>CANAL ORIGEN:</strong> {channel.toUpperCase()}<br />
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", marginBottom: "20px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1e293b", textAlign: "left" }}>
                  <th style={{ padding: "6px" }}>SKU</th>
                  <th style={{ padding: "6px" }}>Descripción</th>
                  <th style={{ padding: "6px" }}>Cant.</th>
                  <th style={{ padding: "6px" }}>P.Unit</th>
                  <th style={{ padding: "6px", textAlign: "right" }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px dashed #e2e8f0" }}>
                    <td style={{ padding: "6px" }}><code>{i.sku}</code></td>
                    <td style={{ padding: "6px" }}>
                      {i.name} {i.isAlternative && <span style={{ color: "#f59e0b", fontSize: "0.7rem" }}>[Alt]</span>}
                    </td>
                    <td style={{ padding: "6px" }}>{i.quantity}</td>
                    <td style={{ padding: "6px" }}>{formatCurrency(i.unitPrice)}</td>
                    <td style={{ padding: "6px", textAlign: "right" }}>{formatCurrency(i.unitPrice * i.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "flex-end", fontSize: "0.85rem" }}>
              <div style={{ width: "250px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span>Subtotal:</span>
                  <span>{formatCurrency(calculateSubtotal())}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span>Descuento:</span>
                  <span>{formatCurrency(calculateDiscount())}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #1e293b", paddingTop: "6px", fontWeight: "700" }}>
                  <span>Total Neto:</span>
                  <span>{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            </div>

            {notes && (
              <div style={{ marginTop: "20px", borderTop: "1px solid #e2e8f0", paddingTop: "12px", fontSize: "0.8rem", color: "#64748b" }}>
                <strong>Observaciones:</strong> {notes}
              </div>
            )}
          </div>

          {/* Quick Sharing options */}
          <div className="grid-2" style={{ marginBottom: "32px" }}>
            <div className="card" style={{ padding: "16px", backgroundColor: "var(--bg-tertiary)" }}>
              <h4 style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", fontSize: "0.9rem" }}>💬 Copiar para WhatsApp</h4>
              <p style={{ fontSize: "0.8rem", marginBottom: "16px" }}>Mensaje informal con viñetas ideal para despachar por chat celular.</p>
              <button onClick={() => copyToClipboard(getWhatsAppMessage())} className="btn btn-secondary" style={{ width: "100%", fontSize: "0.8rem" }}>
                Copiar Texto WA
              </button>
            </div>

            <div className="card" style={{ padding: "16px", backgroundColor: "var(--bg-tertiary)" }}>
              <h4 style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", fontSize: "0.9rem" }}>✉️ Copiar para Email</h4>
              <p style={{ fontSize: "0.8rem", marginBottom: "16px" }}>Mensaje formal con tabla detallada de precios y acuerdos.</p>
              <button onClick={() => copyToClipboard(getEmailMessage())} className="btn btn-secondary" style={{ width: "100%", fontSize: "0.8rem" }}>
                Copiar Mail Formal
              </button>
            </div>
          </div>

          {/* Step navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "32px" }}>
            <button onClick={() => setStep(3)} className="btn btn-secondary">
              ⬅️ Atrás
            </button>
            <button
              onClick={handleSaveQuotation}
              className="btn btn-primary"
              style={{ backgroundColor: "var(--success)" }}
            >
              💾 Confirmar y Registrar Cotización
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuoteWizard() {
  return (
    <Suspense fallback={<p style={{ padding: "40px", textAlign: "center" }}>Cargando Asistente...</p>}>
      <QuoteWizardContent />
    </Suspense>
  );
}
