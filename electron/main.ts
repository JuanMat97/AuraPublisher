import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

// Disable security warnings in dev
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'AuraPublisher — Mockup Studio Desktop',
    backgroundColor: '#090a0f',
    darkTheme: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#090a0f',
      symbolColor: '#f1f5f9',
      height: 38,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow local file loading for renderer previews
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers

// 1. Select artwork file from disk
ipcMain.handle('dialog:openImage', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'webp', 'tiff'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const metadata = await sharp(filePath).metadata();

  return {
    path: filePath,
    filename: path.basename(filePath),
    width: metadata.width || 0,
    height: metadata.height || 0,
    aspectRatio: (metadata.width || 1) / (metadata.height || 1),
    format: metadata.format || 'unknown',
  };
});

// 2. Select custom environment image file
ipcMain.handle('dialog:openEnvironmentImage', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'Imágenes de Ambientes', extensions: ['jpg', 'jpeg', 'png', 'webp'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const metadata = await sharp(filePath).metadata();

  return {
    path: filePath,
    filename: path.basename(filePath),
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
});

// 3. Select output folder
ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

// 4. Open folder in Windows Explorer
ipcMain.handle('shell:openPath', async (_event, folderPath: string) => {
  return await shell.openPath(folderPath);
});

// 5. App Data Store (JSON file fallback for 100% offline portability)
const userDataPath = app.getPath('userData');
const storePath = path.join(userDataPath, 'aurapublisher_data.json');

const getStoreData = () => {
  try {
    if (fs.existsSync(storePath)) {
      return JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading store data:', e);
  }
  return { customEnvironments: [], presets: [], history: [], settings: {} };
};

const saveStoreData = (data: any) => {
  try {
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving store data:', e);
  }
};

ipcMain.handle('store:get', async () => {
  return getStoreData();
});

ipcMain.handle('store:set', async (_event, data: any) => {
  saveStoreData(data);
  return true;
});

// 6. Save Base64 rendered image to disk file
ipcMain.handle('file:saveBase64', async (_event, { base64Data, targetPath, quality = 92 }: { base64Data: string, targetPath: string, quality?: number }) => {
  try {
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Image, 'base64');
    
    // Ensure directory exists
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Process & compress with Sharp to exact 1920x1920 MercadoLibre specification
    await sharp(buffer)
      .resize(1920, 1920, { fit: 'cover', position: 'center' })
      .jpeg({ quality, progressive: true, chromaSubsampling: '4:4:4' })
      .toFile(targetPath);

    return { success: true, path: targetPath };
  } catch (err: any) {
    console.error('Error saving image:', err);
    return { success: false, error: err.message };
  }
});

// 7. Save binary buffer (e.g. XLSX workbook) to disk file
ipcMain.handle('file:saveBuffer', async (_event, { buffer, targetPath }: { buffer: Uint8Array | number[] | ArrayBuffer; targetPath: string }) => {
  try {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const nodeBuf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as any);
    fs.writeFileSync(targetPath, nodeBuf);
    return { success: true, path: targetPath };
  } catch (err: any) {
    console.error('Error saving buffer file:', err);
    return { success: false, error: err.message };
  }
});

// 8. Read template binary file
ipcMain.handle('file:readTemplate', async (_event, filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      return { success: true, buffer: data };
    }
    return { success: false, error: 'Template file not found' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// 9. Scan local cuadros library
ipcMain.handle('catalog:scan', async (_event, basePath: string = 'E:\\AuraStudio\\Cuadros') => {
  try {
    if (!fs.existsSync(basePath)) {
      return null;
    }
    const categories = ['peliculas', 'series', 'anime', 'videojuegos', 'musica', 'arte', 'deportes', 'paisajes', 'ciudades'];
    const results: any[] = [];

    for (const cat of categories) {
      const catPath = path.join(basePath, cat);
      if (!fs.existsSync(catPath)) continue;
      const entries = fs.readdirSync(catPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const folderName = entry.name;
        const folderPath = path.join(catPath, folderName);
        const metaPath = path.join(folderPath, 'metadata.json');
        let meta: any = null;

        if (fs.existsSync(metaPath)) {
          try {
            meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          } catch (e) {}
        }

        const posterDir = path.join(folderPath, 'poster');
        const posters: any[] = [];

        if (fs.existsSync(posterDir)) {
          const files = fs.readdirSync(posterDir).filter(f => !f.endsWith('.part') && /\.(jpg|jpeg|png|webp)$/i.test(f));
          for (const f of files) {
            const metaPoster = meta?.posters?.find((p: any) => p.file === f);
            const w = metaPoster?.width || 2000;
            const h = metaPoster?.height || 3000;
            const tier = h >= 2800 ? 'excelente' : h >= 1800 ? 'buena' : 'utilizable';
            posters.push({
              file: f,
              file_path: metaPoster?.file_path || path.join(posterDir, f),
              url_original: metaPoster?.url_original,
              width: w,
              height: h,
              aspect_ratio: metaPoster?.aspect_ratio || Number((w / h).toFixed(5)),
              quality_tier: tier,
            });
          }
        }

        const imgDir = path.join(folderPath, 'imagenes');
        const imgCount = meta?.imagenes?.length || (fs.existsSync(imgDir) ? fs.readdirSync(imgDir).length : 0);

        results.push({
          id: `${cat}_${folderName}`,
          folderName,
          folderPath,
          categoria: cat,
          titulo: meta?.titulo || folderName.replace(/\s*\[.*\]/, '').trim(),
          titulo_original: meta?.titulo_original || '',
          anio: meta?.anio ? String(meta.anio) : '',
          generos: meta?.generos || [],
          source_id: meta?.id || undefined,
          posters,
          imagenesCount: imgCount,
          selectedPosterIndex: 0,
          selected: false,
        });
      }
    }

    return results.length > 0 ? results : null;
  } catch (err) {
    console.error('Error scanning library in electron main:', err);
    return null;
  }
});

