// /api/docandziprouter.js

const express = require('express');
const router = express.Router();
const path = require('path');
const JSZip = require('jszip');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs/promises');
const { jsPDF } = require('jspdf');

//  Define a secure base directory.  Make sure this is correct for your project.
const BASE_DOWNLOAD_DIR = path.join(__dirname, 'public');

//  Helper function to fetch data from a database (PostgreSQL)
async function fetchDataFromDB(query, connectionString) {
  const { Client } = require('pg');
  const pgClient = new Client({ connectionString });
  try {
    await pgClient.connect();
    const { rows } = await pgClient.query(query);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error; //  re-throw to be caught by the main handler
  } finally {
    await pgClient.end();
  }
}

// Helper function to fetch data from an API
async function fetchDataFromAPI(endpoint) {
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// Helper function to convert data to CSV format
function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  const header = Object.keys(data[0]).join(',') + '\n';
  const rows = data.map(obj =>
    Object.values(obj)
      .map(value => (typeof value === 'string' ? `"${value}"` : value)) //  handle strings
      .join(',')
  );
  return header + rows.join('\n');
}

// Helper function to generate file content based on format
async function generateFileContent(fileConfig) {
  switch (fileConfig.format) {
    case 'csv':
      if (fileConfig.data_source === 'db') {
        const dbData = await fetchDataFromDB(fileConfig.query, fileConfig.connectionString);
        return convertToCSV(dbData);
      } else if (fileConfig.data_source === 'api') {
        const apiData = await fetchDataFromAPI(fileConfig.endpoint);
        return convertToCSV(apiData.data || apiData); //handles nested data
      }
      break;
    case 'pdf':
        //const { jsPDF } = require('jspdf');
        const pdfDoc = new jsPDF();
        pdfDoc.text(JSON.stringify(fileConfig.data || {}, null, 2), 10, 10);
        return pdfDoc.output('nodebuffer');
      break;
    case 'docx':
      if (fileConfig.data_source === 'template') {
        const templatePath = path.join(BASE_DOWNLOAD_DIR, fileConfig.template_path);
         if (!templatePath.startsWith(BASE_DOWNLOAD_DIR)) {
            throw new Error(`Template path is outside the allowed directory`);
         }
        const templateContent = await fs.readFile(templatePath, 'utf-8');        let content = templateContent;
        for (const key in fileConfig.data_fields) {
          const placeholder = new RegExp(`{{${key}}}`, 'g');
          content = content.replace(placeholder, fileConfig.data_fields[key] || ''); //replaces placeholder
        }
        return content;
      }
      else{
        return JSON.stringify(fileConfig.data || {}, null, 2);
      }
      break;
    default:
      return JSON.stringify(fileConfig.data || {}, null, 2);
  }
}
// Add this route handler to catch requests like /api/zip/purification
router.get('/:configName', async (req, res) => {
  try {
    console.log(`Processing ZIP request for config: ${req.params.configName}`);
    
    const configName = req.params.configName.replace(/\.zip$/, '');
    
    if (!configName) {
      return res.status(400).send('Missing configuration name.');
    }

    // Log Supabase credentials availability for debugging
    console.log('Supabase URL available:', !!process.env.SUPABASE_URL);
    console.log('Supabase Key available:', !!process.env.SUPABASE_KEY);
    
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).send('Supabase URL and Key must be configured in environment variables.');
    }

    // Rest of your ZIP generation code...
    const { data: configData, error: configError } = await supabase
      .from('download_configurations')
      .select('*')
      .eq('name', configName)
      .single();

    if (configError) {
      console.error('Error fetching configuration:', configError);
      return res.status(500).send('Failed to retrieve download configuration.');
    }

    if (!configData) {
      return res.status(404).send('Download configuration not found.');
    }

    const { contents, zip_name } = configData;
    const zip = new JSZip();

    for (const fileConfig of contents) {
      try {
        let fileContent = null;
        if (fileConfig.type === 'static') {
          const filePath = path.join(BASE_DOWNLOAD_DIR, path.relative('/', fileConfig.path));
          if (!filePath.startsWith(BASE_DOWNLOAD_DIR)) {
             console.warn(`Access outside base dir: ${fileConfig.path}`);
             continue;
          }
          fileContent = await fs.readFile(filePath);
        } else if (fileConfig.type === 'db_table') {
          const connectionString = process.env.POSTGRES_CONNECTION_STRING;
          if (!connectionString) {
            return res.status(500).send('Postgres connection string is missing.');
          }
          fileConfig.connectionString = connectionString;
          fileContent = await generateFileContent(fileConfig);
        }
        else if (fileConfig.type === 'generated') {
          fileContent = await generateFileContent(fileConfig);
        }
        else {
          fileContent = JSON.stringify(fileConfig.data || {}, null, 2);
        }
        const fileName = fileConfig.name || (fileConfig.type === 'static' ? path.basename(fileConfig.path) : `${fileConfig.type}_${uuidv4()}.${fileConfig.format || 'txt'}`);
        zip.file(fileName, fileContent);
      } catch (error) {
        console.error(`Error processing file: ${fileConfig.name || fileConfig.type}`, error);
      }
    }

    const content = await zip.generateAsync({ type: 'nodebuffer' });

    res.setHeader('Content-Disposition', `attachment; filename="${zip_name || configName + '.zip'}"`);
    res.setHeader('Content-Type', 'application/zip');
    res.send(content);
    
  } catch (error) {
    console.error('Error generating ZIP:', error);
    res.status(500).send('Failed to generate ZIP file.');
  }
});

// Simple test route to verify the router is working
router.get('/test', (req, res) => {
  res.status(200).json({
    message: 'ZIP router is working',
    env: {
      supabaseUrl: !!process.env.SUPABASE_URL,
      supabaseKey: !!process.env.SUPABASE_KEY,
      baseDir: BASE_DOWNLOAD_DIR,
      baseDirExists: require('fs').existsSync(BASE_DOWNLOAD_DIR)
    }
  });
});


module.exports = router;
