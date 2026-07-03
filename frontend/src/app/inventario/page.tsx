"use client";

import { useEffect, useState } from "react";
import { getProducts, initializeDB, Product } from "@/lib/mockData";

export default function InventorySearch() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    initializeDB();
    const prods = getProducts();
    setProducts(prods);
    setFilteredProducts(prods);
  }, []);

  useEffect(() => {
    let result = products;

    if (searchTerm) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (categoryFilter) {
      result = result.filter(p => p.category === categoryFilter);
    }

    setFilteredProducts(result);
  }, [searchTerm, categoryFilter, products]);

  const categories = Array.from(new Set(products.map(p => p.category)));

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

  const isPriceOutdated = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = new Date().getTime() - date.getTime();
    return diff > 30 * 24 * 60 * 60 * 1000; // 30 days in ms
  };

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1>Consulta Rápida de Inventario</h1>
        <p className="subtitle">Buscador instantáneo de stock por depósito, alternativas comerciales e historial de precios</p>
      </div>

      <div className="grid-3" style={{ alignItems: "start" }}>
        
        {/* Col 1 & 2: Search and Results List */}
        <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Filters card */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <div className="form-group" style={{ marginBottom: "0px", flex: 2 }}>
                <label className="form-label">Buscar Insumo</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ingrese SKU, nombre, descripción, marca o tags (ej: alta temperatura)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "0px", flex: 1, minWidth: "180px" }}>
                <label className="form-label">Categoría</label>
                <select
                  className="form-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">Todas las categorías</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results card */}
          <div className="card">
            {filteredProducts.length === 0 ? (
              <p style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                No se encontraron insumos industriales coincidentes.
              </p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Producto</th>
                      <th>Marca</th>
                      <th>Stock Total</th>
                      <th>Precio Base</th>
                      <th>Actualización</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => {
                      const central = p.stockByDeposit["Central"] || 0;
                      const norte = p.stockByDeposit["Norte"] || 0;
                      const totalAvailable = central + norte - p.reservedStock;
                      const outdated = isPriceOutdated(p.priceLastUpdated);

                      return (
                        <tr
                          key={p.id}
                          style={{
                            backgroundColor: selectedProduct?.id === p.id ? "var(--info-bg)" : "transparent"
                          }}
                        >
                          <td><code>{p.sku}</code></td>
                          <td>
                            <div>
                              <strong>{p.name}</strong>
                              <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                {p.category}
                              </span>
                            </div>
                          </td>
                          <td>{p.brand}</td>
                          <td>
                            <strong style={{ color: totalAvailable <= 5 ? "var(--danger)" : "var(--text-primary)" }}>
                              {totalAvailable} disp.
                            </strong>
                            <span style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                              (Físico: {central + norte})
                            </span>
                          </td>
                          <td style={{ fontWeight: "700" }}>{formatCurrency(p.basePrice)}</td>
                          <td>
                            <span className={`badge ${outdated ? "badge-danger" : "badge-success"}`} style={{ fontSize: "0.6rem", padding: "2px 6px" }}>
                              {outdated ? "⚠️ Desactualizado" : "Actualizado"}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => setSelectedProduct(p)}
                              className="btn btn-secondary"
                              style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                            >
                              Ver Detalle
                            </button>
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

        {/* Col 3: Selected Product Card (Detailed View) */}
        <div style={{ position: "sticky", top: "24px" }}>
          {selectedProduct ? (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                <span className="badge badge-info" style={{ fontSize: "0.65rem", marginBottom: "8px" }}>
                  {selectedProduct.category}
                </span>
                <h3 style={{ color: "var(--primary)", fontSize: "1.25rem", margin: "0px" }}>
                  {selectedProduct.name}
                </h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  SKU: {selectedProduct.sku} | Marca: {selectedProduct.brand}
                </span>
              </div>

              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                  Descripción Técnica:
                </span>
                <p style={{ fontSize: "0.825rem", color: "var(--text-primary)", lineHeight: "1.5" }}>
                  {selectedProduct.description}
                </p>
              </div>

              {/* Stock Details */}
              <div style={{ backgroundColor: "var(--bg-tertiary)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                <strong style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "10px" }}>
                  Desglose de Inventario Físico:
                </strong>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.8rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>🏢 Depósito Central (Rosario):</span>
                    <strong>{selectedProduct.stockByDeposit["Central"] || 0} unidades</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>🏢 Depósito Norte (San Lorenzo):</span>
                    <strong>{selectedProduct.stockByDeposit["Norte"] || 0} unidades</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>🚚 Depósito Externo (Proveedor):</span>
                    <strong>{selectedProduct.stockByDeposit["Externo"] || 0} unidades</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--border-color)", paddingTop: "8px", marginTop: "4px", color: "var(--warning)" }}>
                    <span>⚠️ Reservado en tránsito:</span>
                    <strong>{selectedProduct.reservedStock} unidades</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", color: "var(--success)" }}>
                    <span>✅ Disponible libre neto:</span>
                    <span>
                      {(selectedProduct.stockByDeposit["Central"] || 0) + (selectedProduct.stockByDeposit["Norte"] || 0) - selectedProduct.reservedStock} unidades
                    </span>
                  </div>
                </div>
              </div>

              {/* Price audit */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Precio Base de Lista:</span>
                  <strong style={{ fontSize: "1.125rem", color: "var(--primary)" }}>
                    {formatCurrency(selectedProduct.basePrice)}
                  </strong>
                </div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "right" }}>
                  Última actualización: {formatDate(selectedProduct.priceLastUpdated)}
                </span>
                {isPriceOutdated(selectedProduct.priceLastUpdated) && (
                  <div className="alert alert-danger" style={{ padding: "8px 12px", fontSize: "0.75rem", margin: "8px 0 0 0" }}>
                    <span>⚠️</span>
                    <p style={{ margin: "0px", color: "#f87171" }}>
                      Alerta: Precio desactualizado hace más de 30 días. Validar margen antes de cotizar.
                    </p>
                  </div>
                )}
              </div>

              {/* Alternatives equivalence link */}
              {selectedProduct.alternativeProductIds.length > 0 ? (
                <div style={{ backgroundColor: "var(--info-bg)", padding: "12px", borderRadius: "var(--radius-md)", borderLeft: "3px solid var(--secondary)" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--secondary)", display: "block", marginBottom: "6px" }}>
                    🔄 Equivalencias Recomendadas:
                  </span>
                  {selectedProduct.alternativeProductIds.map(altId => {
                    const altProd = products.find(p => p.id === altId);
                    if (!altProd) return null;
                    return (
                      <div
                        key={altId}
                        onClick={() => setSelectedProduct(altProd)}
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-primary)",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          marginTop: "4px",
                          textDecoration: "underline"
                        }}
                      >
                        <span>{altProd.name}</span>
                        <strong>{formatCurrency(altProd.basePrice)}</strong>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                  Este insumo no tiene equivalencias directas cargadas.
                </p>
              )}
            </div>
          ) : (
            <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "300px", color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>
              <span>🔍</span>
              <p style={{ fontSize: "0.85rem", marginTop: "10px" }}>
                Seleccione cualquier insumo del listado para realizar auditoría técnica de stock y precios.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
