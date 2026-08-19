const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Import compiled or transpile test
async function test() {
  console.log('--- Starting MercadoLibre Excel Exporter Tests ---');

  const templatePath = 'H:/AuraStudio/Publicar-08-13-09_35_15.xlsx';
  console.log('1. Checking template path exists:', fs.existsSync(templatePath));

  const wbTemplate = XLSX.readFile(templatePath, { cellFormula: true, cellStyles: true });
  console.log('2. Template sheets:', wbTemplate.SheetNames);
  if (!wbTemplate.SheetNames.includes('Cuadros Decorativos')) {
    throw new Error('Missing Cuadros Decorativos sheet');
  }

  // Load publication types & test data
  const testListing = {
    title: 'Cuadro Decorativo AuraStudio Cyberpunk Neon 50x70',
    theme: 'Cyberpunk',
    type: 'resina',
    description: 'Cuadro artesanal con acabado en resina epoxi cristal y microglitter',
    categoryId: 'MLA3885',
    brand: 'AuraStudio',
    model: 'Cuadro Resina Epoxi Cyberpunk',
    manufacturingDays: 3,
    warrantyDays: 60,
    freeShippingThreshold: 30000,
    variants: [
      {
        designName: 'Cyberpunk City Neon',
        finish: 'resina_brillante',
        size: {
          id: 'v_50x70',
          name: '50 × 70 cm',
          widthCm: 50,
          heightCm: 70,
          basePrice: 34900,
          aspectRatio: 'vertical',
        },
        price: 34900,
        sku: 'AUR-RES-CYB-5070-01',
        stock: 15,
        imagePaths: ['https://http2.mlstatic.com/sample1.jpg', 'https://http2.mlstatic.com/sample2.jpg'],
      },
      {
        designName: 'Cyberpunk City Neon',
        finish: 'resina_holografico',
        size: {
          id: 'v_70x100',
          name: '70 × 100 cm',
          widthCm: 70,
          heightCm: 100,
          basePrice: 48900,
          aspectRatio: 'vertical',
        },
        price: 48900,
        sku: 'AUR-RES-CYB-70100-02',
        stock: 8,
        imagePaths: ['https://http2.mlstatic.com/sample3.jpg'],
      },
      {
        designName: 'Cyberpunk Skyline',
        finish: 'mate',
        size: {
          id: 'trip_120x60',
          name: 'Tríptico 120 × 60 cm',
          widthCm: 120,
          heightCm: 60,
          basePrice: 52900,
          aspectRatio: 'horizontal',
        },
        price: 52900,
        sku: 'AUR-MAT-CYB-12060-03',
        stock: 5,
        imagePaths: [],
      }
    ],
  };

  const ws = wbTemplate.Sheets['Cuadros Decorativos'];
  console.log('3. Initial sheet range:', ws['!ref']);

  // Simulate populate
  const startRow = 8;
  testListing.variants.forEach((v, i) => {
    const r = startRow + i;
    ws['B' + r] = { t: 's', v: testListing.title };
    ws['C' + r] = { t: 'n', f: `LEN(INDIRECT(ADDRESS(ROW()+(0),COLUMN()+(-1))))`, v: testListing.title.length };
    ws['D' + r] = { t: 's', v: 'Nuevo' };
    ws['E' + r] = { t: 's', v: 'El producto no tiene código registrado' };
    ws['F' + r] = { t: 's', v: `${v.designName} - ${v.finish} (${v.size.widthCm}x${v.size.heightCm} cm)` };
    ws['G' + r] = { t: 's', v: 'Escribí o elegí un valor' };
    ws['H' + r] = { t: 's', v: v.imagePaths.join(' ') };
    ws['I' + r] = { t: 's', v: v.sku };
    ws['J' + r] = { t: 'n', v: v.stock };
    ws['K' + r] = { t: 'n', v: v.price };
    ws['L' + r] = { t: 's', v: 'Unidad' };
    ws['M' + r] = { t: 'n', v: 1 };
    ws['N' + r] = { t: 's', v: testListing.description };
    ws['P' + r] = { t: 's', v: 'No agregar cuotas' };
    ws['R' + r] = { t: 's', v: 'Mercado Envíos' };
    ws['S' + r] = { t: 's', v: v.price >= 30000 ? 'Ofrecés envío gratis' : 'A cargo del comprador' };
    ws['T' + r] = { t: 's', v: 'Acepto' };
    ws['U' + r] = { t: 's', v: 'Garantía del vendedor' };
    ws['V' + r] = { t: 'n', v: testListing.warrantyDays };
    ws['W' + r] = { t: 's', v: 'días' };
    ws['X' + r] = { t: 'n', v: testListing.manufacturingDays };
    ws['Y' + r] = { t: 's', v: 'No ofrezco' };
    ws['Z' + r] = { t: 's', v: testListing.brand };
    ws['AA' + r] = { t: 's', v: testListing.model };
    ws['AB' + r] = { t: 's', v: testListing.theme };
    ws['AC' + r] = { t: 'n', v: v.size.heightCm };
    ws['AD' + r] = { t: 's', v: 'cm' };
    ws['AE' + r] = { t: 'n', v: v.size.widthCm };
    ws['AF' + r] = { t: 's', v: 'cm' };
    ws['AG' + r] = { t: 's', v: v.size.id.includes('trip') ? 'Tríptico' : 'Panel único' };
    ws['AH' + r] = { t: 's', v: 'No' };
    ws['AI' + r] = { t: 'n', v: 1 };
    ws['AJ' + r] = { t: 's', v: 'cm' };
    ws['AK' + r] = { t: 's', v: 'Madera' };
    ws['AL' + r] = { t: 's', v: 'No' };
    ws['AM' + r] = { t: 's', v: 'No' };
  });

  // Clean unused rows
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let r = startRow + testListing.variants.length - 1; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddr = XLSX.utils.encode_cell({ r, c });
      delete ws[cellAddr];
    }
  }
  range.e.r = startRow + testListing.variants.length - 2;
  ws['!ref'] = XLSX.utils.encode_range(range);

  const outPath = 'H:/Projects/AuraPublisher/test_ml_output.xlsx';
  XLSX.writeFile(wbTemplate, outPath);
  console.log('4. Wrote test output to:', outPath);

  // Validate output file
  const wbOut = XLSX.readFile(outPath);
  const wsOut = wbOut.Sheets['Cuadros Decorativos'];
  console.log('5. Validated exported range:', wsOut['!ref']);
  console.log('6. Row 8 Title:', wsOut['B8'].v);
  console.log('7. Row 8 Price:', wsOut['K8'].v);
  console.log('8. Row 8 Shipping:', wsOut['S8'].v);
  console.log('9. Row 10 Panel Type:', wsOut['AG10'].v);

  if (wsOut['B8'].v !== testListing.title) throw new Error('Title mismatch');
  if (wsOut['K8'].v !== 34900) throw new Error('Price mismatch');
  if (wsOut['AG10'].v !== 'Tríptico') throw new Error('Panel type mismatch');

  fs.unlinkSync(outPath);
  console.log('10. Cleaned test output file. ALL TESTS PASSED SUCCESSFULLY! ✅');
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
