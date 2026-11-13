const express = require('express');
const fileUpload = require('express-fileupload');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 3000;

app.use(fileUpload());
app.use(express.static(__dirname));

// Middleware dynamique pour le dossier data
let staticMiddleware = express.static(path.join(__dirname, 'data'));
app.use('/data', (req, res, next) => staticMiddleware(req, res, next));

app.use('/templates', express.static(path.join(__dirname, 'templates')));

// Fonction améliorée pour nettoyer un répertoire
function cleanDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    return;
  }

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isFile()) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn(`⚠️ Impossible de supprimer ${filePath}: ${err.message}`);
      }
    } else {
      fs.rmSync(filePath, { recursive: true, force: true });
    }
  }
}

// Fonction récursive pour lister tous les fichiers .php
function getAllPhpFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getAllPhpFiles(filePath, fileList);
    } else if (file.toLowerCase().endsWith('.php')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

// Fonction pour extraire les variables PHP d'un fichier
function extractVariables(content) {
  const vars = {};
  
  // Extraction des variables avec valeur simple
  [...content.matchAll(/\$([a-zA-Z_]\w*)\s*=\s*['"]([^'"]*)['"]\s*;/gi)]
    .forEach(match => vars[match[1].toLowerCase()] = match[2]);
  
  // Extraction des variables avec define()
  [...content.matchAll(/define\s*\(\s*['"]([a-zA-Z_]\w*)['"]\s*,\s*['"]([^'"]*)['"]\s*\)\s*;/gi)]
    .forEach(match => vars[match[1].toLowerCase()] = match[2]);
  
  return vars;
}

// Fonction améliorée pour détecter la configuration de la base de données
function detectDbConfig(content) {
  // Détection des connexions PDO (plusieurs formats possibles)
  const pdoMatches = [
    ...content.matchAll(/new\s+PDO\s*\(\s*['"](mysql:host=([^;'"]+)(?:;port=(\d+))?;dbname=([^;'"]+))['"]\s*,\s*['"]([^'"]*)['"]\s*,\s*['"]([^'"]*)['"]/gi),
    ...content.matchAll(/new\s+PDO\s*\(\s*([$\w]+)\s*,\s*([$\w]+)\s*,\s*([$\w]+)\s*\)/gi)
  ];

  for (const match of pdoMatches) {
    if (match[1].includes('mysql:host')) {
      // Format avec chaîne de connexion directe
      return {
        host: match[2],
        port: match[3] || 3306,
        database: match[4],
        user: match[5],
        password: match[6]
      };
    } else {
      // Format avec variables, nous devons extraire les valeurs des variables
      const vars = extractVariables(content);
      const dsn = vars[match[1].replace('$', '').toLowerCase()] || '';
      const user = vars[match[2].replace('$', '').toLowerCase()] || '';
      const pass = vars[match[3].replace('$', '').toLowerCase()] || '';
      
      if (dsn) {
        const dsnMatch = dsn.match(/mysql:host=([^;]+)(?:;port=(\d+))?;dbname=([^;'"]+)/i);
        if (dsnMatch) {
          return {
            host: dsnMatch[1],
            port: dsnMatch[2] || 3306,
            database: dsnMatch[3],
            user: user,
            password: pass
          };
        }
      }
    }
  }

  // Détection des connexions MySQLi (plusieurs formats possibles)
  const mysqliMatches = [
    ...content.matchAll(/mysqli_connect\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]\s*,\s*['"]([^'"]+)['"]\s*(?:,\s*['"]?(\d+)['"]?)?\s*\)/gi),
    ...content.matchAll(/new\s+mysqli\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]\s*,\s*['"]([^'"]+)['"]\s*(?:,\s*['"]?(\d+)['"]?)?\s*\)/gi),
    ...content.matchAll(/mysqli_connect\s*\(\s*([$\w]+)\s*,\s*([$\w]+)\s*,\s*([$\w]+)\s*,\s*([$\w]+)\s*(?:,\s*([$\w]+))?\s*\)/gi)
  ];

  for (const match of mysqliMatches) {
    if (!match[1].startsWith('$')) {
      // Format avec valeurs directes
      return {
        host: match[1],
        user: match[2],
        password: match[3],
        database: match[4],
        port: match[5] || 3306
      };
    } else {
      // Format avec variables
      const vars = extractVariables(content);
      return {
        host: vars[match[1].replace('$', '').toLowerCase()] || '',
        user: vars[match[2].replace('$', '').toLowerCase()] || '',
        password: vars[match[3].replace('$', '').toLowerCase()] || '',
        database: vars[match[4].replace('$', '').toLowerCase()] || '',
        port: match[5] ? vars[match[5].replace('$', '').toLowerCase()] || 3306 : 3306
      };
    }
  }

  // Détection des configurations dans des tableaux (comme WordPress)
  const configArrayMatches = Array.from(
    content.matchAll(/define\s*\(\s*['"]DB_(HOST|NAME|USER|PASSWORD|PORT)['"]\s*,\s*['"]([^'"]*)['"]\s*\)|['"]db_(host|name|user|pass|port)['"]\s*=>\s*['"]([^'"]*)['"]/gi)
  );

  if (configArrayMatches.length > 0) {
    const config = {};
    for (const match of configArrayMatches) {
      const key = (match[1] || match[3]).toLowerCase();
      const value = match[2] || match[4];
      
      if (key.includes('host')) config.host = value;
      else if (key.includes('name')) config.database = value;
      else if (key.includes('user')) config.user = value;
      else if (key.includes('pass')) config.password = value;
      else if (key.includes('port')) config.port = value;
    }
    
    if (config.host && config.database && config.user) {
      config.port = config.port || 3306;
      return config;
    }
  }

  return null;
}

app.post('/upload', async (req, res) => {
  try {
    if (!req.files || !req.files.phpApp) {
      return res.status(400).send('❌ Aucun fichier ZIP uploadé.');
    }

    // Désactiver temporairement le middleware
    const tempStatic = staticMiddleware;
    staticMiddleware = (req, res, next) => next();
    
    // Nettoyer les dossiers
    cleanDirectory(path.join(__dirname, 'data'));
    cleanDirectory(path.join(__dirname, 'templates'));
    
    // Réactiver le middleware
    staticMiddleware = tempStatic;

    const zipFile = req.files.phpApp;
    const uploadDir = path.join(__dirname, 'uploads');
    const extractPath = path.join(uploadDir, path.parse(zipFile.name).name);

    // Création des dossiers si besoin
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });
    fs.mkdirSync(extractPath, { recursive: true });

    // Sauvegarde et extraction du ZIP
    const tempZipPath = path.join(extractPath, 'app.zip');
    await zipFile.mv(tempZipPath);

    const zip = new AdmZip(tempZipPath);
    zip.extractAllTo(extractPath, true);
    fs.unlinkSync(tempZipPath);

    // Recherche fichiers PHP
    const phpFiles = getAllPhpFiles(extractPath);

    let dbConfig = null;
    
    // Analyse des fichiers PHP pour trouver la configuration de la base de données
    for (const file of phpFiles) {
      const content = fs.readFileSync(file, 'utf8');
      dbConfig = detectDbConfig(content);
      if (dbConfig) break;
    }

    if (!dbConfig) {
      console.log('❌ dbConfig non détecté');
      return res.status(400).send('❌ Impossible de détecter la configuration de la base de données.');
    }

    console.log('✅ dbConfig détecté:', dbConfig);
    
    // Connexion à la BDD
    const conn = await mysql.createConnection(dbConfig);

    // Récupération tables
    const [tables] = await conn.execute("SHOW TABLES");
    console.log('Tables trouvées:', tables);
    if (!tables || tables.length === 0) {
      console.log('❌ Aucune table trouvée dans la base de données.');
      await conn.end();
      return res.status(400).send('❌ Aucune table trouvée dans la base de données.');
    }
    
    const tableKey = `Tables_in_${dbConfig.database}`;
    const dataDir = path.join(__dirname, 'data');

    for (const table of tables) {
      const tableName = table[tableKey];
      const [rows] = await conn.execute(`SELECT * FROM \`${tableName}\``);

      // Ajout de la référence XSLT dans le XML
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<?xml-stylesheet type="text/xsl" href="${tableName}.xsl"?>\n`;
      xml += `<${tableName}>\n`;
      
      for (const row of rows) {
        xml += `  <record>\n`;
        for (const col in row) {
          const value = row[col] !== null ? row[col].toString().replace(/[<>&'"]/g, c => {
            switch(c) {
              case '<': return '&lt;';
              case '>': return '&gt;';
              case '&': return '&amp;';
              case '\'': return '&apos;';
              case '"': return '&quot;';
              default: return c;
            }
          }) : '';
          xml += `    <${col}>${value}</${col}>\n`;
        }
        xml += `  </record>\n`;
      }
      xml += `</${tableName}>`;
      fs.writeFileSync(path.join(dataDir, `${tableName}.xml`), xml, 'utf8');
      console.log(`✅ XML généré : ${tableName}.xml`);
    }

    // Génération XSLT
    const templatesDir = path.join(__dirname, 'templates');

    for (const table of tables) {
      const tableName = table[tableKey];
      const xmlPath = path.join(dataDir, `${tableName}.xml`);
      const xmlContent = fs.readFileSync(xmlPath, 'utf8');
      const sampleRowMatch = xmlContent.match(/<record>([\s\S]*?)<\/record>/);
      let headers = [];

      if (sampleRowMatch) {
        const recordContent = sampleRowMatch[1];
        headers = [...recordContent.matchAll(/<(\w+)>/g)].map(m => m[1]);
      }

      const xslContent = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html>
      <head><title>${tableName}</title></head>
      <body>
        <h1>Données : ${tableName}</h1>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
          <tr>
${headers.map(h => `            <th>${h}</th>`).join('\n')}
          </tr>
          <xsl:for-each select="${tableName}/record">
            <tr>
${headers.map(h => `              <td><xsl:value-of select="${h}"/></td>`).join('\n')}
            </tr>
          </xsl:for-each>
        </table>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>`;

      fs.writeFileSync(path.join(templatesDir, `${tableName}.xsl`), xslContent, 'utf8');
      console.log(`✅ XSLT généré : ${tableName}.xsl`);
    }

    await conn.end();
    res.redirect('/data');

  } catch (err) {
    console.error(err);
    res.status(500).send('❌ Erreur : ' + err.message);
  }
});

// ROUTE POUR TÉLÉCHARGER LES FICHIERS XML
app.get('/data/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'data', filename);

  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send('❌ Fichier XML non trouvé.');
  }
});

// ROUTE POUR TÉLÉCHARGER XML + XSLT ENSEMBLE (dans le même dossier)
app.get('/download-app', (req, res) => {
  const dataDir = path.join(__dirname, 'data');
  const templatesDir = path.join(__dirname, 'templates');

  if (!fs.existsSync(dataDir) || !fs.existsSync(templatesDir)) {
    return res.status(404).send('❌ Les dossiers nécessaires sont introuvables.');
  }

  // Créer un dossier temporaire
  const tempDir = path.join(__dirname, 'temp_export');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  // Copier XML et XSLT dans le même dossier temporaire
  const xmlFiles = fs.readdirSync(dataDir).filter(file => file.endsWith('.xml'));
  xmlFiles.forEach(file => {
    const src = path.join(dataDir, file);
    const dest = path.join(tempDir, file);
    fs.copyFileSync(src, dest);
  });

  const xslFiles = fs.readdirSync(templatesDir).filter(file => file.endsWith('.xsl'));
  xslFiles.forEach(file => {
    const src = path.join(templatesDir, file);
    const dest = path.join(tempDir, file);
    fs.copyFileSync(src, dest);
  });

  // Créer le ZIP à partir du dossier temporaire
  const zip = new AdmZip();
  zip.addLocalFolder(tempDir);
  const zipBuffer = zip.toBuffer();
  
  // Supprimer le dossier temporaire
  fs.rmSync(tempDir, { recursive: true, force: true });

  res.set('Content-Type', 'application/zip');
  res.set('Content-Disposition', 'attachment; filename="app_xml_export.zip"');
  res.send(zipBuffer);
});

// Affichage liste fichiers XML disponibles avec option de visualisation
app.get('/data', (req, res) => {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    return res.status(404).send('❌ Dossier "data" introuvable.');
  }

  const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.xml'));
  let html = `<style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    ul { list-style-type: none; padding: 0; }
    li { margin: 10px 0; padding: 8px; background: #f8f8f8; border-radius: 4px; }
    a { text-decoration: none; color: #1a0dab; }
    .view-link { color: #0b8043; margin-left: 15px; }
  </style>`;
  
  html += `<h1>📄 Fichiers XML disponibles</h1><ul>`;
  for (const file of files) {
    const tableName = path.basename(file, '.xml');
    html += `<li>
      <a href="/data/${file}">${file}</a>
      <a href="/view/${tableName}" class="view-link">👁️ Visualiser</a>
    </li>`;
  }
  html += `</ul><a href="/download-app">📦 Télécharger tout (ZIP)</a>`;
  res.send(html);
});

// Route de visualisation avec transformation XSLT
app.get('/view/:table', (req, res) => {
  const table = req.params.table;
  const xmlPath = path.join(__dirname, 'data', `${table}.xml`);
  const xslPath = path.join(__dirname, 'templates', `${table}.xsl`);

  if (!fs.existsSync(xmlPath) || !fs.existsSync(xslPath)) {
    return res.status(404).send('❌ Fichiers XML ou XSLT manquants.');
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Visualisation: ${table}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background-color: #f8f8f8; font-weight: bold; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Visualisation: ${table}</h1>
      <a href="/data">← Retour à la liste</a>
    </div>
    <div id="content"></div>
  </div>
  
  <script>
    async function loadXMLXSL() {
      try {
        // Charger XML et XSLT
        const [xmlResponse, xslResponse] = await Promise.all([
          fetch('/data/${table}.xml'),
          fetch('/templates/${table}.xsl')
        ]);
        
        const xmlText = await xmlResponse.text();
        const xslText = await xslResponse.text();
        
        // Parser XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        // Parser XSLT
        const xsltDoc = parser.parseFromString(xslText, "text/xml");
        const xsltProcessor = new XSLTProcessor();
        xsltProcessor.importStylesheet(xsltDoc);
        
        // Appliquer transformation
        const resultDoc = xsltProcessor.transformToDocument(xmlDoc);
        document.getElementById('content').innerHTML = 
          new XMLSerializer().serializeToString(resultDoc.documentElement);
          
      } catch (error) {
        document.getElementById('content').innerHTML = 
          '<div class="error"><p>❌ Erreur de chargement: ' + error.message + '</p></div>';
      }
    }
    
    loadXMLXSL();
  </script>
</body>
</html>`;

  res.send(html);
});

// Route pour retourner la liste des tables converties (fichiers XML)
app.get('/list-xml', (req, res) => {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    return res.json([]);
  }
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.xml'));
  // On retourne juste le nom sans extension
  const tables = files.map(f => path.basename(f, '.xml'));
  res.json(tables);
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé : http://localhost:${PORT}`);
});