/**
 * Seed script: populates products (catalog) and inventory tables
 * from the Imppel 2026 catalog + April 2026 stock state.
 *
 * Run with: node scripts/seed-catalog-inventory.js
 */

const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─────────────────────────────────────────────────────────────
// CATALOG DATA (from Pasted txt — prices = custo/venda 2026)
// ─────────────────────────────────────────────────────────────
const catalogProducts = [
  // 1. ARGAMASSAS POLIMÉRICAS
  { name: 'Viaplus 1000 (18 kg)', brand: 'Viapol', category: 'Argamassa Polimérica', description: 'Semi-flexível para piscinas, prainhas, áreas úmidas.', unit: 'cx', costPrice: 37.90, salePrice: 60.64 },
  { name: 'Viaplus 5000 (18 kg)', brand: 'Viapol', category: 'Argamassa Polimérica', description: 'Semi-flexível para piscinas, prainhas, áreas úmidas.', unit: 'cx', costPrice: 112.50, salePrice: 180.00 },
  { name: 'Viaplus 7000 (18 kg)', brand: 'Viapol', category: 'Argamassa Polimérica', description: 'Semi-flexível para áreas úmidas e reservatórios.', unit: 'cx', costPrice: 151.26, salePrice: 211.76 },

  // 2. MANTAS LÍQUIDAS
  { name: 'Único Cinza BD 18 L', brand: 'Icobit', category: 'Manta Líquida', description: 'Manta líquida acrílica, alta durabilidade.', unit: 'bd', costPrice: 281.07, salePrice: 365.39 },
  { name: 'Único Branca BD 18 L', brand: 'Icobit', category: 'Manta Líquida', description: 'Manta líquida branca, refletiva, lajes expostas.', unit: 'bd', costPrice: 301.42, salePrice: 407.92 },
  { name: 'Único Terracota BD 18 L', brand: 'Icobit', category: 'Manta Líquida', description: 'Manta líquida terracota, telhados e floreiras.', unit: 'bd', costPrice: 279.79, salePrice: 377.22 },
  { name: 'Icoper Multiuso Cinza (18 L)', brand: 'Icobit', category: 'Manta Líquida', description: 'Manta líquida reforçada, uso geral em lajes.', unit: 'bd', costPrice: 612.76, salePrice: 827.23 },
  { name: 'Icoper Multiuso Vermelho (18 L)', brand: 'Icobit', category: 'Manta Líquida', description: 'Manta líquida acrílica, uso em telhados.', unit: 'bd', costPrice: 0, salePrice: 0 },
  { name: 'Icoquarz Cinza (18 L)', brand: 'Icobit', category: 'Manta Líquida', description: 'Manta acrílica com areia, acabamento antiderrapante.', unit: 'bd', costPrice: 705.00, salePrice: 951.75 },
  { name: 'Icoforce (20 L)', brand: 'Icobit', category: 'Manta Líquida', description: 'Manta aderente, reforçada com polímeros especiais.', unit: 'bd', costPrice: 663.90, salePrice: 896.27 },
  { name: 'Manta Líquida Preta (18 L)', brand: 'Icobit', category: 'Manta Líquida', description: 'Manta líquida preta para uso geral.', unit: 'bd', costPrice: 0, salePrice: 0 },
  { name: 'Manta Líquida Anti-Raiz (18 L)', brand: 'Icobit', category: 'Manta Líquida', description: 'Manta líquida com aditivo anti-raiz, ideal para floreiras e jardineiras.', unit: 'bd', costPrice: 0, salePrice: 0 },
  { name: 'Viafix 18 L', brand: 'Viapol', category: 'Manta Líquida', description: 'Incorporador de aderência, resistência e plasticidade para concreto e argamassa.', unit: 'bd', costPrice: 0, salePrice: 0 },
  { name: 'Vitkote (Emulsão Asfáltica) BD 18 L', brand: 'Viapol', category: 'Manta Líquida', description: 'Emulsão asfáltica para proteção e impermeabilização.', unit: 'bd', costPrice: 0, salePrice: 0 },

  // 3. MANTAS ASFÁLTICAS — VIAPOL
  { name: 'Viapol Manta Comum 3 mm', brand: 'Viapol', category: 'Manta Asfáltica', description: 'Base poliéster, aplicação a maçarico.', unit: 'm²', costPrice: 318.00, salePrice: 445.20 },
  { name: 'Viapol Manta Comum 4 mm', brand: 'Viapol', category: 'Manta Asfáltica', description: 'Base poliéster, aplicação a maçarico.', unit: 'm²', costPrice: 358.48, salePrice: 502.27 },
  { name: 'Viapol Manta Ardosiada 3 mm', brand: 'Viapol', category: 'Manta Asfáltica', description: 'Acabamento mineral, coberturas expostas.', unit: 'm²', costPrice: 348.46, salePrice: 488.84 },
  { name: 'Viapol Manta Ardosiada 4 mm', brand: 'Viapol', category: 'Manta Asfáltica', description: 'Espessura maior, resistência térmica.', unit: 'm²', costPrice: 430.65, salePrice: 602.91 },
  { name: 'Viapol Manta Aluminizada 3 mm', brand: 'Viapol', category: 'Manta Asfáltica', description: 'Refletiva, reduz temperatura do ambiente.', unit: 'm²', costPrice: 333.91, salePrice: 467.47 },
  { name: 'Viapol Manta Aluminizada 4 mm', brand: 'Viapol', category: 'Manta Asfáltica', description: 'Refletiva, reduz temperatura do ambiente.', unit: 'm²', costPrice: 396.68, salePrice: 555.35 },
  { name: 'Viapol Manta Torodin 3 mm', brand: 'Viapol', category: 'Manta Asfáltica', description: 'Alta performance, lajes técnicas.', unit: 'm²', costPrice: 315.01, salePrice: 441.01 },
  { name: 'Viapol Manta Torodin 4 mm', brand: 'Viapol', category: 'Manta Asfáltica', description: 'Resistência elevada e durabilidade.', unit: 'm²', costPrice: 391.93, salePrice: 548.70 },
  { name: 'Viapol Manta Anti-Raiz 4 mm', brand: 'Viapol', category: 'Manta Asfáltica', description: 'Para floreiras e jardineiras.', unit: 'm²', costPrice: 408.76, salePrice: 572.26 },
  // DRYKO
  { name: 'Dryko Manta PE Tipo III 3 mm', brand: 'Dryko', category: 'Manta Asfáltica', description: 'Manta asfáltica poliéster tipo III 3 mm, aplicação a maçarico.', unit: 'm²', costPrice: 0, salePrice: 0 },
  { name: 'Dryko Manta PE Tipo III 4 mm', brand: 'Dryko', category: 'Manta Asfáltica', description: 'Manta asfáltica poliéster tipo III 4 mm, aplicação a maçarico.', unit: 'm²', costPrice: 0, salePrice: 0 },
  { name: 'Dryko Manta ALU Tipo III 3 mm', brand: 'Dryko', category: 'Manta Asfáltica', description: 'Manta asfáltica aluminizada tipo III 3 mm.', unit: 'm²', costPrice: 0, salePrice: 0 },
  { name: 'Dryko Manta ALU Tipo III 4 mm', brand: 'Dryko', category: 'Manta Asfáltica', description: 'Manta asfáltica aluminizada tipo III 4 mm.', unit: 'm²', costPrice: 0, salePrice: 0 },
  // SIKA
  { name: 'Sika Manta PE Tipo III 3 mm', brand: 'Sika', category: 'Manta Asfáltica', description: 'Manta asfáltica poliéster tipo III 3 mm.', unit: 'm²', costPrice: 0, salePrice: 0 },
  { name: 'Sika Manta PE Tipo III 4 mm', brand: 'Sika', category: 'Manta Asfáltica', description: 'Manta asfáltica poliéster tipo III 4 mm.', unit: 'm²', costPrice: 0, salePrice: 0 },
  { name: 'Sika Manta ALU Tipo III 3 mm', brand: 'Sika', category: 'Manta Asfáltica', description: 'Manta asfáltica aluminizada tipo III 3 mm.', unit: 'm²', costPrice: 0, salePrice: 0 },
  { name: 'Sika Manta ALU Tipo III 4 mm', brand: 'Sika', category: 'Manta Asfáltica', description: 'Manta asfáltica aluminizada tipo III 4 mm.', unit: 'm²', costPrice: 0, salePrice: 0 },
  { name: 'Sika Manta RE Tipo III 3 mm', brand: 'Sika', category: 'Manta Asfáltica', description: 'Manta asfáltica reforçada tipo III 3 mm.', unit: 'm²', costPrice: 0, salePrice: 0 },
  { name: 'Sika Manta RE Tipo III 4 mm', brand: 'Sika', category: 'Manta Asfáltica', description: 'Manta asfáltica reforçada tipo III 4 mm.', unit: 'm²', costPrice: 0, salePrice: 0 },

  // 4. SISTEMAS DE DRENAGEM
  { name: 'MacDrain FP 2L 2x30', brand: 'Maccaferri', category: 'Sistema de Drenagem', description: 'Geocomposto drenante.', unit: 'm²', costPrice: 32.82, salePrice: 45.95 },
  { name: 'Mac Pipe 100 mm', brand: 'Maccaferri', category: 'Sistema de Drenagem', description: 'Tubo coletor com envoltório filtrante.', unit: 'm', costPrice: 7.80, salePrice: 10.92 },
  { name: 'Bidim MK', brand: 'Maccaferri', category: 'Sistema de Drenagem', description: 'Geotêxtil drenante.', unit: 'm²', costPrice: 4.31, salePrice: 6.03 },
  { name: 'Geotêxtil Rolo 2,30x100m', brand: 'Maccaferri', category: 'Sistema de Drenagem', description: 'Geotêxtil reforço, rolo 2,30x100m.', unit: 'rl', costPrice: 699.00, salePrice: 978.60 },

  // 5. PRIMER
  { name: 'Viabit Primer (base solvente)', brand: 'Viapol', category: 'Primer', description: 'Para manta asfáltica, aplicar sobre base seca.', unit: 'lt', costPrice: 303.97, salePrice: 425.56 },
  { name: 'Eco Primer (base água)', brand: 'Viapol', category: 'Primer', description: 'Ecológico, áreas internas.', unit: 'bd', costPrice: 127.66, salePrice: 178.72 },
  { name: 'Viabit Anti-Raiz 18 L', brand: 'Viapol', category: 'Primer', description: 'Aditivo anti-raiz, ideal para floreiras.', unit: 'lt', costPrice: 416.40, salePrice: 582.96 },
  { name: 'Primer Solvente Dryko', brand: 'Dryko', category: 'Primer', description: 'Base solvente para mantas asfálticas.', unit: 'bd', costPrice: 161.20, salePrice: 225.68 },
  { name: 'Primer Base Água Dryko', brand: 'Dryko', category: 'Primer', description: 'Baixo odor, ideal para áreas fechadas.', unit: 'bd', costPrice: 97.46, salePrice: 136.44 },
  { name: 'Sika Igolflex', brand: 'Sika', category: 'Primer', description: 'Impermeabilizante elástico base solvente.', unit: 'bd', costPrice: 0, salePrice: 0 },
  { name: 'Sika Sikadur Epoxi', brand: 'Sika', category: 'Primer', description: 'Epóxi de alto desempenho para injeção e ancoragem.', unit: 'un', costPrice: 0, salePrice: 0 },

  // 6. ACESSÓRIOS / FERRAMENTAS / EPI / FITAS / PÓ / TINTAS
  { name: 'Broxa', brand: 'Roma', category: 'Acessório', description: 'Broxa para aplicação de argamassas e primers.', unit: 'un', costPrice: 5.00, salePrice: 7.00 },
  { name: 'Pincel', brand: 'Roma', category: 'Acessório', description: 'Pincel para acabamentos e retoques.', unit: 'un', costPrice: 4.46, salePrice: 6.24 },
  { name: 'P.U. Sachê 380 g', brand: 'Tekbond', category: 'Selante PU', description: 'Selante poliuretano em sachê 380g, uso em juntas.', unit: 'un', costPrice: 21.16, salePrice: 29.62 },
  { name: 'P.U. Bisnaga 900 g', brand: 'Tekbond', category: 'Selante PU', description: 'Selante poliuretano em bisnaga 900g, uso em juntas.', unit: 'un', costPrice: 29.90, salePrice: 41.86 },
  { name: 'Barra de Asfalto', brand: 'Viapol', category: 'Massa Asfáltica', description: 'Barra de asfalto modificada para remendos e selagem.', unit: 'un', costPrice: 1256.39, salePrice: 1758.95 },
  { name: 'Rolo de Lã', brand: 'Compel', category: 'Ferramenta', description: 'Rolo de lã para aplicação de mantas líquidas.', unit: 'un', costPrice: 19.23, salePrice: 28.85 },
  { name: 'Rolo de Textura', brand: 'Compel', category: 'Ferramenta', description: 'Rolo de textura para acabamento.', unit: 'un', costPrice: 7.20, salePrice: 10.80 },
  { name: 'Suporte de Rolo', brand: 'Roma', category: 'Ferramenta', description: 'Suporte para rolo de pintura.', unit: 'un', costPrice: 7.63, salePrice: 11.45 },
  { name: 'Tela Poliéster Rolo 100 m', brand: 'Icobit', category: 'Tela', description: 'Tela de poliéster estrutural em rolo 100 m.', unit: 'rl', costPrice: 499.00, salePrice: 698.60 },
  { name: 'Impertela 1,05x50', brand: 'Icobit', category: 'Tela', description: 'Tela de reforço para impermeabilização 1,05x50m.', unit: 'rl', costPrice: 190.00, salePrice: 266.00 },
  { name: 'Icoarm TNT 50x1 Rolo', brand: 'Icobit', category: 'Geotêxtil', description: 'Geotêxtil não-tecido para proteção e drenagem.', unit: 'rl', costPrice: 320.27, salePrice: 432.36 },
  { name: 'Rodapé de Tela 35 m', brand: 'Icobit', category: 'Tela', description: 'Tela de poliéster para rodapés, rolo 35m.', unit: 'rl', costPrice: 28.00, salePrice: 39.20 },
  { name: 'Luva de Pano (par)', brand: '', category: 'EPI', description: 'Luva de proteção de pano para uso geral.', unit: 'par', costPrice: 3.00, salePrice: 4.20 },
  { name: 'Luva de Borracha', brand: 'Sensiblack', category: 'EPI', description: 'Luva de borracha para manuseio de produtos químicos.', unit: 'par', costPrice: 28.00, salePrice: 39.20 },
  { name: 'Luva de Raspa', brand: '', category: 'EPI', description: 'Luva de raspa de couro para proteção térmica.', unit: 'par', costPrice: 6.00, salePrice: 8.40 },
  { name: 'Pó Mineral 1 cx 15 kg', brand: 'Viapol', category: 'Pó Mineral', description: 'Pó mineral para acabamento de mantas asfálticas.', unit: 'cx', costPrice: 128.08, salePrice: 179.31 },
  { name: 'Pó Mineral 2 cx 15 kg', brand: 'Viapol', category: 'Pó Mineral', description: 'Pó mineral premium para acabamento.', unit: 'cx', costPrice: 150.52, salePrice: 210.73 },
  { name: 'Viaflex 20x10', brand: 'Viaflex', category: 'Fita', description: 'Fita impermeabilizante autoadesiva 20cmx10m.', unit: 'rl', costPrice: 54.70, salePrice: 76.58 },
  { name: 'Tinta Alumínio 2 L', brand: '', category: 'Tinta', description: 'Tinta reflexiva de alumínio para proteção de coberturas.', unit: 'lt', costPrice: 0, salePrice: 0 },
  { name: 'Fita Crepe Branca', brand: '', category: 'Acessório', description: 'Fita crepe branca para proteção e acabamento.', unit: 'un', costPrice: 0, salePrice: 0 },
  { name: 'Fita Crepe Transparente', brand: '', category: 'Acessório', description: 'Fita crepe transparente para acabamento.', unit: 'un', costPrice: 0, salePrice: 0 },
  { name: 'Viapol Fuseprotec', brand: 'Viapol', category: 'Acessório', description: 'Proteção termofusível para manta asfáltica.', unit: 'un', costPrice: 0, salePrice: 0 },
  { name: 'Resina Epóxi', brand: '', category: 'Acessório', description: 'Resina epóxi para tratamento de fissuras.', unit: 'un', costPrice: 0, salePrice: 0 },
];

// ─────────────────────────────────────────────────────────────
// INVENTORY DATA — April 2026 Final Stock
// Negative values (data error in spreadsheet) are set to 0.
// ─────────────────────────────────────────────────────────────
const inventoryItems = [
  // Argamassas
  { name: 'Viaplus 1000', type: 'Argamassa Polimérica', unit: 'cx', quantity: 40,  minStock: 20, pricePerUnit: 37.90 },
  { name: 'Viaplus 7000', type: 'Argamassa Polimérica', unit: 'cx', quantity: 0,   minStock: 10, pricePerUnit: 151.26 },
  // Mantas asfálticas — Viapol
  { name: 'Classic Poliéster 3 mm', type: 'Manta Asfáltica', unit: 'm²', quantity: 0,  minStock: 5,  pricePerUnit: 318.00 },
  { name: 'Classic Poliéster 4 mm', type: 'Manta Asfáltica', unit: 'm²', quantity: 17, minStock: 5,  pricePerUnit: 358.48 },
  { name: 'Alumínio 3 mm',          type: 'Manta Asfáltica', unit: 'm²', quantity: 0,  minStock: 5,  pricePerUnit: 333.91 },
  { name: 'Alumínio 4 mm',          type: 'Manta Asfáltica', unit: 'm²', quantity: 14, minStock: 5,  pricePerUnit: 396.68 },
  { name: 'Torodin 3 mm',           type: 'Manta Asfáltica', unit: 'm²', quantity: 1,  minStock: 5,  pricePerUnit: 315.01 },
  { name: 'Torodin 4 mm',           type: 'Manta Asfáltica', unit: 'm²', quantity: 12, minStock: 5,  pricePerUnit: 391.93 },
  { name: 'Ardosiada 3 mm',         type: 'Manta Asfáltica', unit: 'm²', quantity: 0,  minStock: 5,  pricePerUnit: 348.46 },
  { name: 'Ardosiada 4 mm',         type: 'Manta Asfáltica', unit: 'm²', quantity: 11, minStock: 5,  pricePerUnit: 430.65 },
  { name: 'Anti-Raiz 3 mm',         type: 'Manta Asfáltica', unit: 'm²', quantity: 0,  minStock: 5,  pricePerUnit: 0 },
  { name: 'Anti-Raiz 4 mm',         type: 'Manta Asfáltica', unit: 'm²', quantity: 0,  minStock: 5,  pricePerUnit: 408.76 },
  // Mantas asfálticas — Dryko
  { name: 'Drykoprimer Comum 3 mm',    type: 'Manta Asfáltica', unit: 'm²', quantity: 0, minStock: 5, pricePerUnit: 0 },
  { name: 'Drykoprimer Comum 4 mm',    type: 'Manta Asfáltica', unit: 'm²', quantity: 6, minStock: 5, pricePerUnit: 0 },
  { name: 'Drykoprimer Alumínio 3 mm', type: 'Manta Asfáltica', unit: 'm²', quantity: 0, minStock: 5, pricePerUnit: 0 },
  { name: 'Drykoprimer Alumínio 4 mm', type: 'Manta Asfáltica', unit: 'm²', quantity: 0, minStock: 5, pricePerUnit: 0 },
  // Mantas asfálticas — Sika
  { name: 'Sika PE tipo III 3mm',  type: 'Manta Asfáltica', unit: 'm²', quantity: 0,  minStock: 5, pricePerUnit: 0 },
  { name: 'Sika PE tipo III 4mm',  type: 'Manta Asfáltica', unit: 'm²', quantity: 0,  minStock: 5, pricePerUnit: 0 },
  { name: 'Sika Alu tipo III 3mm', type: 'Manta Asfáltica', unit: 'm²', quantity: 0,  minStock: 5, pricePerUnit: 0 },
  { name: 'Sika Alu tipo III 4mm', type: 'Manta Asfáltica', unit: 'm²', quantity: 50, minStock: 5, pricePerUnit: 0 },
  { name: 'Sika Re tipo III 3mm',  type: 'Manta Asfáltica', unit: 'm²', quantity: 0,  minStock: 5, pricePerUnit: 0 },
  { name: 'Sika Re tipo III 4mm',  type: 'Manta Asfáltica', unit: 'm²', quantity: 5,  minStock: 5, pricePerUnit: 0 },
  // Mantas líquidas
  { name: 'Manta líq. Cinza',         type: 'Manta Líquida', unit: 'bd', quantity: 12, minStock: 5, pricePerUnit: 281.07 },
  { name: 'Manta líq. Vermelha',      type: 'Manta Líquida', unit: 'bd', quantity: 1,  minStock: 5, pricePerUnit: 0 },
  { name: 'Manta líq. Branca',        type: 'Manta Líquida', unit: 'bd', quantity: 1,  minStock: 5, pricePerUnit: 301.42 },
  { name: 'Manta líq. Preta',         type: 'Manta Líquida', unit: 'bd', quantity: 0,  minStock: 5, pricePerUnit: 0 },
  { name: 'Manta líq. Cinza Multiuso',type: 'Manta Líquida', unit: 'bd', quantity: 3,  minStock: 5, pricePerUnit: 612.76 },
  { name: 'Manta líq. Vermelha Multiuso', type: 'Manta Líquida', unit: 'bd', quantity: 0, minStock: 5, pricePerUnit: 0 },
  { name: 'Manta líq. Anti-Raiz',     type: 'Manta Líquida', unit: 'bd', quantity: 0,  minStock: 5, pricePerUnit: 0 },
  // Primers / Solventes
  { name: 'Lata Viabit Primer (solvente)', type: 'Primer', unit: 'lt', quantity: 10, minStock: 5,  pricePerUnit: 303.97 },
  { name: 'Lata Viabit Anti-Raiz',         type: 'Primer', unit: 'lt', quantity: 0,  minStock: 5,  pricePerUnit: 416.40 },
  { name: 'Ecoprimer (base d\'água)',       type: 'Primer', unit: 'bd', quantity: 3,  minStock: 5,  pricePerUnit: 127.66 },
  { name: 'Sika Igolflex',                  type: 'Primer', unit: 'bd', quantity: 5,  minStock: 5,  pricePerUnit: 0 },
  // Complementares
  { name: 'Viafix - Bianco',  type: 'Acessório', unit: 'un', quantity: 11, minStock: 5, pricePerUnit: 0 },
  { name: 'Vitkote',          type: 'Manta Líquida', unit: 'bd', quantity: 11, minStock: 5, pricePerUnit: 0 },
  { name: 'Barra de asfalto', type: 'Massa Asfáltica', unit: 'un', quantity: 18, minStock: 5, pricePerUnit: 1256.39 },
  { name: 'Viapol Fuseprotec', type: 'Acessório', unit: 'un', quantity: 4,  minStock: 5, pricePerUnit: 0 },
  // Drenagem
  { name: 'Macdrain',   type: 'Sistema de Drenagem', unit: 'm²', quantity: 0, minStock: 5, pricePerUnit: 32.82 },
  { name: 'Maccaferri', type: 'Sistema de Drenagem', unit: 'un', quantity: 0, minStock: 5, pricePerUnit: 0 },
  { name: 'Tubo Dreno', type: 'Sistema de Drenagem', unit: 'm',  quantity: 2, minStock: 5, pricePerUnit: 7.80 },
  // Selante PU
  { name: 'P.u. (Bisnaga)', type: 'Selante PU', unit: 'un', quantity: 62, minStock: 10, pricePerUnit: 29.90 },
  { name: 'P.u. (Sachê)',   type: 'Selante PU', unit: 'un', quantity: 0,  minStock: 10, pricePerUnit: 21.16 },
  // Ferramentas e acessórios
  { name: 'Broxa',          type: 'Acessório', unit: 'un', quantity: 7,  minStock: 10, pricePerUnit: 5.00 },
  { name: 'Pincel',         type: 'Acessório', unit: 'un', quantity: 0,  minStock: 10, pricePerUnit: 4.46 },
  { name: 'Rolo De Lã',     type: 'Ferramenta', unit: 'un', quantity: 6,  minStock: 5,  pricePerUnit: 19.23 },
  { name: 'Rolo De Textura',type: 'Ferramenta', unit: 'un', quantity: 48, minStock: 5,  pricePerUnit: 7.20 },
  { name: 'Suporte',        type: 'Ferramenta', unit: 'un', quantity: 15, minStock: 5,  pricePerUnit: 7.63 },
  { name: 'Tela Poliéster', type: 'Tela', unit: 'rl', quantity: 0,  minStock: 5, pricePerUnit: 499.00 },
  { name: 'Tela Poliéster (canto)', type: 'Tela', unit: 'rl', quantity: 0,  minStock: 5, pricePerUnit: 28.00 },
  { name: 'Luva de raspa',  type: 'EPI', unit: 'par', quantity: 0,  minStock: 5, pricePerUnit: 6.00 },
  { name: 'Viaflex',        type: 'Fita', unit: 'rl', quantity: 4,  minStock: 5, pricePerUnit: 54.70 },
  { name: 'Tinta alumínio', type: 'Tinta', unit: 'lt', quantity: 8,  minStock: 5, pricePerUnit: 0 },
  { name: 'Fita Crepe Branca',       type: 'Acessório', unit: 'un', quantity: 10, minStock: 5, pricePerUnit: 0 },
  { name: 'Fita Crepe Transparente', type: 'Acessório', unit: 'un', quantity: 32, minStock: 5, pricePerUnit: 0 },
  { name: 'Sika Sikadur epoxi',  type: 'Acessório', unit: 'un', quantity: 3, minStock: 5, pricePerUnit: 0 },
  { name: 'Resina',          type: 'Acessório', unit: 'un', quantity: 0, minStock: 5, pricePerUnit: 0 },
  { name: 'Lata de Epox',    type: 'Acessório', unit: 'un', quantity: 0, minStock: 5, pricePerUnit: 0 },
  // Outros (aparecem nos estoques anteriores mas não no catálogo)
  { name: 'Denvertec 100',  type: 'Impermeabilizante', unit: 'bd', quantity: 0, minStock: 5, pricePerUnit: 0 },
  { name: 'Denvertec 500',  type: 'Impermeabilizante', unit: 'bd', quantity: 0, minStock: 5, pricePerUnit: 0 },
  { name: 'Denvertec 540',  type: 'Impermeabilizante', unit: 'bd', quantity: 0, minStock: 5, pricePerUnit: 0 },
  { name: 'Pó Mineral 1',   type: 'Pó Mineral', unit: 'cx', quantity: 0, minStock: 5, pricePerUnit: 128.08 },
  { name: 'Pó Mineral 2',   type: 'Pó Mineral', unit: 'cx', quantity: 0, minStock: 5, pricePerUnit: 150.52 },
  { name: 'Denvertec Primer',          type: 'Primer', unit: 'bd', quantity: 0, minStock: 5, pricePerUnit: 0 },
  { name: 'Denvertec Elastic',         type: 'Impermeabilizante', unit: 'bd', quantity: 0, minStock: 5, pricePerUnit: 0 },
  { name: 'Denvermanta (primer acqua)',type: 'Primer', unit: 'bd', quantity: 0, minStock: 5, pricePerUnit: 0 },
  { name: 'Icobit Imperfachada',       type: 'Manta Líquida', unit: 'bd', quantity: 0, minStock: 5, pricePerUnit: 0 },
  { name: 'Icobit Icoquarz',           type: 'Manta Líquida', unit: 'bd', quantity: 0, minStock: 5, pricePerUnit: 705.00 },
];

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Clear existing data ───────────────────────────────
    console.log('🗑  Clearing existing catalog and inventory...');
    await client.query('DELETE FROM products');
    await client.query('DELETE FROM inventory');
    await client.query('DELETE FROM inventory_movements');

    // ── 2. Insert inventory items ────────────────────────────
    console.log(`📦 Inserting ${inventoryItems.length} inventory items...`);
    const inventoryIdMap = {};
    for (const item of inventoryItems) {
      const res = await client.query(
        `INSERT INTO inventory (name, type, unit, quantity, min_stock, price_per_unit)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [item.name, item.type, item.unit, item.quantity, item.minStock, item.pricePerUnit]
      );
      inventoryIdMap[item.name.toLowerCase().trim()] = res.rows[0].id;
    }
    console.log('✅ Inventory inserted.');

    // ── 3. Insert catalog products ───────────────────────────
    console.log(`🛍  Inserting ${catalogProducts.length} catalog products...`);

    // Map product names to inventory keys for linking
    const productToInventoryKey = {
      'viaplus 1000 (18 kg)': 'viaplus 1000',
      'viaplus 7000 (18 kg)': 'viaplus 7000',
      'único cinza bd 18 l': 'manta líq. cinza',
      'único branca bd 18 l': 'manta líq. branca',
      'icoper multiuso cinza (18 l)': 'manta líq. cinza multiuso',
      'viabit primer (base solvente)': 'lata viabit primer (solvente)',
      'viabit anti-raiz 18 l': 'lata viabit anti-raiz',
      'eco primer (base água)': 'ecoprimer (base d\'água)',
      'sika igolflex': 'sika igolflex',
      'sika sikadur epoxi': 'sika sikadur epoxi',
      'broxa': 'broxa',
      'pincel': 'pincel',
      'p.u. sachê 380 g': 'p.u. (sachê)',
      'p.u. bisnaga 900 g': 'p.u. (bisnaga)',
      'barra de asfalto': 'barra de asfalto',
      'rolo de lã': 'rolo de lã',
      'rolo de textura': 'rolo de textura',
      'suporte de rolo': 'suporte',
      'tela poliéster rolo 100 m': 'tela poliéster',
      'rodapé de tela 35 m': 'tela poliéster (canto)',
      'viaflex 20x10': 'viaflex',
      'viapol fuseprotec': 'viapol fuseprotec',
      'macdrain fp 2l 2x30': 'macdrain',
      'mac pipe 100 mm': 'tubo dreno',
      'pó mineral 1 cx 15 kg': 'pó mineral 1',
      'pó mineral 2 cx 15 kg': 'pó mineral 2',
      'tinta alumínio 2 l': 'tinta alumínio',
      'resina epóxi': 'resina',
    };

    let productCount = 0;
    for (const p of catalogProducts) {
      const key = p.name.toLowerCase().trim();
      const invKey = productToInventoryKey[key];
      const inventoryId = invKey ? (inventoryIdMap[invKey] || null) : null;

      await client.query(
        `INSERT INTO products
           (inventory_id, name, description, category, brand, unit, sale_price, commission, max_discount, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          inventoryId,
          p.name,
          p.description || '',
          p.category,
          p.brand || '',
          p.unit,
          p.salePrice,
          0,
          p.salePrice > 0 ? 10 : 0,
          true,
        ]
      );
      productCount++;
    }
    console.log(`✅ ${productCount} catalog products inserted.`);

    await client.query('COMMIT');
    console.log('\n🎉 Seed complete!');
    console.log(`   - Inventory items : ${inventoryItems.length}`);
    console.log(`   - Catalog products: ${catalogProducts.length}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error — rolled back:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
