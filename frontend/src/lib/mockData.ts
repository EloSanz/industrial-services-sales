// TypeScript Mock database for industrial supply quotation app
// Implements localStorage persistence for a realistic simulation

export interface Client {
  id: string;
  code: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  creditLimit: number;
  balance: number;
  paymentTerms: string;
  hasSpecialAgreement: boolean;
  specialAgreementDetails: string | null;
  initials: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  basePrice: number;
  priceLastUpdated: string;
  stockByDeposit: Record<string, number>;
  reservedStock: number;
  lastPhysicalVerifyDate: string;
  alternativeProductIds: string[];
  tags: string[];
}

export interface Inquiry {
  id: string;
  clientName: string;
  contactName: string;
  phone: string;
  email: string;
  channel: "whatsapp" | "email" | "phone" | "mostrador";
  messageText: string;
  date: string;
  status: "pending" | "quoted";
  suggestedTag?: string;
  clientId: string;
}

export interface QuotedItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  basePrice: number;
  discount: number; // percentage
  isAlternative: boolean;
}

export interface QuotationVersion {
  version: number;
  date: string;
  items: QuotedItem[];
  subtotal: number;
  discount: number;
  total: number;
  notes: string;
}

export interface Quotation {
  id: string;
  clientName: string;
  clientId: string;
  date: string;
  seller: string;
  channel: "whatsapp" | "email" | "phone" | "mostrador";
  status: "sent" | "approved" | "rejected" | "expired";
  version: number;
  contextProblem: string;
  versions: QuotationVersion[];
}

export const MOCK_CLIENTS: Client[] = [
  {
    id: "cli-1",
    code: "CLI-ACME",
    name: "Acme Corporación Industrial",
    contactName: "Ing. Carlos Mendoza",
    phone: "+54 11 5555-1234",
    email: "carlos.mendoza@acme-ind.com",
    creditLimit: 500000,
    balance: 150000, // available credit = 350000
    paymentTerms: "Cuenta Corriente 30 días",
    hasSpecialAgreement: true,
    specialAgreementDetails: "10% de descuento en la categoría Válvulas y Cañerías",
    initials: "AC"
  },
  {
    id: "cli-2",
    code: "CLI-METALSUR",
    name: "Metalúrgica del Sur S.A.",
    contactName: "Lucía Fernández (Compras)",
    phone: "+54 11 4888-9900",
    email: "lfernandez@metalsur.com.ar",
    creditLimit: 1200000,
    balance: 1150000, // available credit = 50000 (very low!)
    paymentTerms: "Cuenta Corriente 15 días",
    hasSpecialAgreement: false,
    specialAgreementDetails: null,
    initials: "MS"
  },
  {
    id: "cli-3",
    code: "CLI-H&H",
    name: "Taller Mecánico H&H",
    contactName: "Hugo Gómez",
    phone: "+54 9 11 3456-7890",
    email: "tallerhyh@gmail.com",
    creditLimit: 0, // Cash only
    balance: 0,
    paymentTerms: "Contado / Transferencia inmediata",
    hasSpecialAgreement: false,
    specialAgreementDetails: null,
    initials: "HH"
  },
  {
    id: "cli-4",
    code: "CLI-SIDERAR",
    name: "Siderurgia Argentina S.A.",
    contactName: "Roberto Varela",
    phone: "+54 341 456-7800",
    email: "rvarela@siderar.com.ar",
    creditLimit: 3000000,
    balance: 400000, // available credit = 2600000
    paymentTerms: "Cuenta Corriente 60 días",
    hasSpecialAgreement: true,
    specialAgreementDetails: "Precios fijos en Rodamientos SKF según contrato anual 2026",
    initials: "SA"
  }
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    sku: "VAL-BOLA-12",
    name: "Válvula de Bola Acero Inoxidable 1/2\"",
    description: "Válvula de bola de dos piezas, roscada NPT, paso total, acero inoxidable CF8M (316). Presión de trabajo 1000 WOG.",
    category: "Válvulas",
    brand: "Genebre",
    basePrice: 12500,
    priceLastUpdated: "2026-06-25T10:00:00Z",
    stockByDeposit: {
      "Central": 15,
      "Norte": 5,
      "Externo": 40
    },
    reservedStock: 4,
    lastPhysicalVerifyDate: "2026-07-01",
    alternativeProductIds: ["prod-2"],
    tags: ["sellado", "paso de fluidos", "acero inoxidable"]
  },
  {
    id: "prod-2",
    sku: "VAL-BOLA-12-BR",
    name: "Válvula de Bola Bronce Forjado 1/2\"",
    description: "Válvula de bola de paso total de bronce forjado roscada NPT. Alternativa más económica para fluidos no corrosivos.",
    category: "Válvulas",
    brand: "FV",
    basePrice: 5800,
    priceLastUpdated: "2026-04-10T14:30:00Z",
    stockByDeposit: {
      "Central": 50,
      "Norte": 22,
      "Externo": 0
    },
    reservedStock: 0,
    lastPhysicalVerifyDate: "2026-06-15",
    alternativeProductIds: ["prod-1"],
    tags: ["sellado", "paso de fluidos", "economico", "bronce"]
  },
  {
    id: "prod-3",
    sku: "EMP-TEFLON-1",
    name: "Empaquetadura de Teflón Puro 1/2\"",
    description: "Empaquetadura trenzada de PTFE (Teflón) puro autolubricada. Excelente resistencia química para alta temperatura.",
    category: "Empaquetaduras",
    brand: "Garlock",
    basePrice: 18400,
    priceLastUpdated: "2026-06-20T09:15:00Z",
    stockByDeposit: {
      "Central": 0,
      "Norte": 2,
      "Externo": 12
    },
    reservedStock: 1,
    lastPhysicalVerifyDate: "2026-06-29",
    alternativeProductIds: ["prod-4"],
    tags: ["alta temperatura", "sellado", "vapor", "perdida", "quimica"]
  },
  {
    id: "prod-4",
    sku: "EMP-GRAFITO-1",
    name: "Empaquetadura de Grafito Flexible 1/2\"",
    description: "Empaquetadura trenzada de grafito flexible reforzada con hilos de inconel. Ideal para vapor de alta temperatura y presión extrema.",
    category: "Empaquetaduras",
    brand: "Chesterton",
    basePrice: 26900,
    priceLastUpdated: "2026-07-02T11:00:00Z",
    stockByDeposit: {
      "Central": 8,
      "Norte": 4,
      "Externo": 0
    },
    reservedStock: 0,
    lastPhysicalVerifyDate: "2026-07-02",
    alternativeProductIds: ["prod-3"],
    tags: ["alta temperatura", "sellado", "vapor", "perdida", "presion"]
  },
  {
    id: "prod-5",
    sku: "ROD-SKF-6204",
    name: "Rodamiento Rígido de Bolas SKF 6204-2Z",
    description: "Rodamiento radial de una hilera de bolas con dos placas de protección metálicas. Diámetro interior 20mm.",
    category: "Rodamientos",
    brand: "SKF",
    basePrice: 4200,
    priceLastUpdated: "2025-12-15T08:00:00Z",
    stockByDeposit: {
      "Central": 120,
      "Norte": 45,
      "Externo": 200
    },
    reservedStock: 90,
    lastPhysicalVerifyDate: "2026-05-10",
    alternativeProductIds: [],
    tags: ["repuesto", "maquina", "rotacion", "mantenimiento"]
  },
  {
    id: "prod-6",
    sku: "MANG-HID-34",
    name: "Manguera Hidráulica Alta Presión 3/4\" R2 AT",
    description: "Manguera hidráulica reforzada con doble malla de acero de alta resistencia. Apta para aceites y fluidos hidráulicos.",
    category: "Mangueras",
    brand: "Gates",
    basePrice: 9100,
    priceLastUpdated: "2026-06-30T16:00:00Z",
    stockByDeposit: {
      "Central": 30,
      "Norte": 0,
      "Externo": 100
    },
    reservedStock: 15,
    lastPhysicalVerifyDate: "2026-06-28",
    alternativeProductIds: [],
    tags: ["alta presion", "aceite", "hidraulico"]
  }
];

export const MOCK_INBOX_INQUIRIES: Inquiry[] = [
  {
    id: "inq-1",
    clientName: "Acme Corporación Industrial",
    contactName: "Ing. Carlos Mendoza",
    phone: "+54 11 5555-1234",
    email: "carlos.mendoza@acme-ind.com",
    channel: "whatsapp",
    messageText: "Hola Carlos, te escribo porque tenemos una fuga de vapor en la línea principal de la caldera. Necesitamos empaquetadura urgente de 1/2 que aguante alta temperatura (unos 280 grados). Decime si tenés stock y a cuánto está la bobina.",
    date: "2026-07-03T11:22:00Z",
    status: "pending",
    suggestedTag: "alta temperatura",
    clientId: "cli-1"
  },
  {
    id: "inq-2",
    clientName: "Taller Mecánico H&H",
    contactName: "Hugo Gómez",
    phone: "+54 9 11 3456-7890",
    email: "tallerhyh@gmail.com",
    channel: "phone",
    messageText: "Llamó consultando disponibilidad de 2 rodamientos SKF 6204-2Z y 1 válvula de bola de 1/2 en acero inoxidable. Preguntó por alternativas baratas en la válvula ya que es para un sistema de agua domiciliario simple.",
    date: "2026-07-03T12:05:00Z",
    status: "pending",
    suggestedTag: "repuesto",
    clientId: "cli-3"
  },
  {
    id: "inq-3",
    clientName: "Metalúrgica del Sur S.A.",
    contactName: "Lucía Fernández (Compras)",
    phone: "+54 11 4888-9900",
    email: "lfernandez@metalsur.com.ar",
    channel: "email",
    messageText: "Estimados, solicito cotización formal por 15 metros de manguera hidráulica de 3/4\" R2 AT y 5 válvulas de bola 1/2\". Por favor detallar plazos de entrega y si disponen de stock en el depósito norte.",
    date: "2026-07-03T09:15:00Z",
    status: "pending",
    suggestedTag: "compra formal",
    clientId: "cli-2"
  }
];

export const MOCK_QUOTATIONS: Quotation[] = [
  {
    id: "cot-101",
    clientName: "Siderurgia Argentina S.A.",
    clientId: "cli-4",
    date: "2026-07-01T15:30:00Z",
    seller: "Juan Pérez",
    channel: "email",
    status: "sent",
    version: 2,
    contextProblem: "Mantenimiento preventivo rodamiento tren de laminación. Se cotizó rodamiento premium SKF y luego se agregó descuento acordado.",
    versions: [
      {
        version: 1,
        date: "2026-07-01T14:00:00Z",
        items: [
          {
            productId: "prod-5",
            sku: "ROD-SKF-6204",
            name: "Rodamiento Rígido de Bolas SKF 6204-2Z",
            quantity: 50,
            unitPrice: 4200,
            basePrice: 4200,
            discount: 0,
            isAlternative: false
          }
        ],
        subtotal: 210000,
        discount: 0,
        total: 210000,
        notes: "Precios sujetos a cambio. Primera versión sin aplicar descuento del contrato anual."
      },
      {
        version: 2,
        date: "2026-07-01T15:30:00Z",
        items: [
          {
            productId: "prod-5",
            sku: "ROD-SKF-6204",
            name: "Rodamiento Rígido de Bolas SKF 6204-2Z",
            quantity: 50,
            unitPrice: 3570,
            basePrice: 4200,
            discount: 15,
            isAlternative: false
          }
        ],
        subtotal: 210000,
        discount: 31500,
        total: 178500,
        notes: "Versión corregida aplicando el 15% de descuento especial estipulado en el acuerdo anual de rodamientos."
      }
    ]
  },
  {
    id: "cot-102",
    clientName: "Acme Corporación Industrial",
    clientId: "cli-1",
    date: "2026-07-02T10:45:00Z",
    seller: "Ana Gómez",
    channel: "whatsapp",
    status: "approved",
    version: 1,
    contextProblem: "Válvulas de corte para planta de tratamiento de efluentes.",
    versions: [
      {
        version: 1,
        date: "2026-07-02T10:45:00Z",
        items: [
          {
            productId: "prod-1",
            sku: "VAL-BOLA-12",
            name: "Válvula de Bola Acero Inoxidable 1/2\"",
            quantity: 8,
            unitPrice: 11250,
            basePrice: 12500,
            discount: 10,
            isAlternative: false
          }
        ],
        subtotal: 100000,
        discount: 10000,
        total: 90000,
        notes: "Cotizado con descuento de acuerdo comercial sobre válvulas. Cliente aprobó y pasó a preparación."
      }
    ]
  }
];

const IS_SERVER = typeof window === 'undefined';

export function initializeDB(): void {
  if (IS_SERVER) return;
  
  if (!localStorage.getItem("clients")) {
    localStorage.setItem("clients", JSON.stringify(MOCK_CLIENTS));
  }
  if (!localStorage.getItem("products")) {
    localStorage.setItem("products", JSON.stringify(MOCK_PRODUCTS));
  }
  if (!localStorage.getItem("inquiries")) {
    localStorage.setItem("inquiries", JSON.stringify(MOCK_INBOX_INQUIRIES));
  }
  if (!localStorage.getItem("quotations")) {
    localStorage.setItem("quotations", JSON.stringify(MOCK_QUOTATIONS));
  }
}

export function getClients(): Client[] {
  if (IS_SERVER) return MOCK_CLIENTS;
  initializeDB();
  return JSON.parse(localStorage.getItem("clients") || "[]");
}

export function getProducts(): Product[] {
  if (IS_SERVER) return MOCK_PRODUCTS;
  initializeDB();
  return JSON.parse(localStorage.getItem("products") || "[]");
}

export function getInquiries(): Inquiry[] {
  if (IS_SERVER) return MOCK_INBOX_INQUIRIES;
  initializeDB();
  return JSON.parse(localStorage.getItem("inquiries") || "[]");
}

export function getQuotations(): Quotation[] {
  if (IS_SERVER) return MOCK_QUOTATIONS;
  initializeDB();
  return JSON.parse(localStorage.getItem("quotations") || "[]");
}

export function saveQuotation(quotation: Quotation): Quotation[] {
  if (IS_SERVER) return [];
  const quotes = getQuotations();
  const index = quotes.findIndex(q => q.id === quotation.id);
  
  if (index >= 0) {
    quotes[index] = quotation;
  } else {
    quotes.push(quotation);
  }
  localStorage.setItem("quotations", JSON.stringify(quotes));
  return quotes;
}

export function saveInquiry(inquiry: Inquiry): Inquiry[] {
  if (IS_SERVER) return [];
  const inqs = getInquiries();
  const index = inqs.findIndex(i => i.id === inquiry.id);
  if (index >= 0) {
    inqs[index] = inquiry;
  } else {
    inqs.push(inquiry);
  }
  localStorage.setItem("inquiries", JSON.stringify(inqs));
  return inqs;
}

export function updateProductStock(productId: string, stockByDeposit: Record<string, number>): void {
  if (IS_SERVER) return;
  const prods = getProducts();
  const index = prods.findIndex(p => p.id === productId);
  if (index >= 0) {
    prods[index].stockByDeposit = stockByDeposit;
    localStorage.setItem("products", JSON.stringify(prods));
  }
}
