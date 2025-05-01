// api/resources.js - Express endpoints for resource handling
const express = require('express');
const router = express.Router();
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const resourceService = require('../services/resourceService');
const supabase = require('../utils/supabase');

// Convert fs functions to promise-based
const fsAccess = promisify(fs.access);
const fsMkdir = promisify(fs.mkdir);

// Helper function to check if file exists
async function fileExists(filepath) {
  try {
    await fsAccess(filepath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Helper function to get file path
function getFilePath(category, packageId, filename) {
  return path.join(__dirname, '../resources', category, packageId, filename);
}

// Make sure directories exist
async function ensureDirectoryExists(directoryPath) {
  try {
    await fsAccess(directoryPath, fs.constants.F_OK);
  } catch {
    await fsMkdir(directoryPath, { recursive: true });
  }
}

// Get all resource categories
router.get('/api/resources/categories', async (req, res) => {
  try {
    const categories = await resourceService.getCategories();
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Error fetching resource categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch resource categories'
    });
  }
});

// Get packages for a specific category
router.get('/api/resources/categories/:categorySlug', async (req, res) => {
  try {
    const { categorySlug } = req.params;
    const packages = await resourceService.getCategoryPackages(categorySlug);
    res.json({ success: true, packages });
  } catch (error) {
    console.error(`Error fetching packages for category ${req.params.categorySlug}:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to fetch packages for category ${req.params.categorySlug}`
    });
  }
});

// Get package details by slug
router.get('/api/resources/packages/:packageSlug', async (req, res) => {
  try {
    const { packageSlug } = req.params;
    const packageData = await resourceService.getPackageBySlug(packageSlug);
    res.json({ success: true, package: packageData });
  } catch (error) {
    console.error(`Error fetching package ${req.params.packageSlug}:`, error);
    res.status(404).json({
      success: false,
      error: `Package not found: ${req.params.packageSlug}`
    });
  }
});

// Download a single file
router.get('/api/resources/download/:categorySlug/:packageSlug/:filename', async (req, res) => {
  try {
    const { categorySlug, packageSlug, filename } = req.params;
    
    // Get package info to verify the file belongs to it
    const packageData = await resourceService.getPackageBySlug(packageSlug);
    
    if (!packageData) {
      return res.status(404).json({
        success: false,
        error: `Package not found: ${packageSlug}`
      });
    }
    
    // Check if file exists locally
    const filePath = getFilePath(categorySlug, packageSlug, filename);
    const exists = await fileExists(filePath);
    
    if (exists) {
      // File exists locally, send it
      return res.download(filePath, filename);
    }
    
    // Try to get from Supabase Storage
    try {
      const { data, error } = await supabase.raw.storage
        .from('resources')
        .download(`${categorySlug}/${packageSlug}/${filename}`);
      
      if (error) throw error;
      
      // Set the appropriate content type
      const ext = path.extname(filename).toLowerCase();
      const contentType = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.txt': 'text/plain',
        '.mp4': 'video/mp4'
      }[ext] || 'application/octet-stream';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      
      // Convert the blob to a buffer and send it
      const buffer = Buffer.from(await data.arrayBuffer());
      res.send(buffer);
    } catch (storageError) {
      console.error(`Error downloading file from storage: ${storageError}`);
      res.status(404).send('File not found');
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file'
    });
  }
});

// Download a package as a zip file
router.get('/api/resources/download/:packageSlug', async (req, res) => {
  try {
    const { packageSlug } = req.params;
    
    // Get package info
    const packageData = await resourceService.getPackageBySlug(packageSlug);
    
    if (!packageData) {
      return res.status(404).json({
        success: false,
        error: `Package not found: ${packageSlug}`
      });
    }
    
    // Get all files for the package
    const files = await resourceService.getPackageFiles(packageSlug);
    
    if (!files || files.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No files found for package: ${packageSlug}`
      });
    }
    
    // Extract category ID
    const categorySlug = packageData.category?.slug || 'default';
    
    // Create a file to stream archive data to
    const zipFilename = `${packageSlug}.zip`;
    const tmpDir = path.join(__dirname, '../tmp');
    await ensureDirectoryExists(tmpDir);
    
    const zipPath = path.join(tmpDir, zipFilename);
    
    // Create a write stream for the zip file
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    // Setup archive events
    output.on('close', () => {
      console.log(`Archive created: ${archive.pointer()} total bytes`);
      
      // Increment download count
      resourceService.incrementDownloadCount(packageSlug)
        .catch(err => console.error(`Error incrementing download count: ${err}`));
      
      res.download(zipPath, zipFilename, (err) => {
        if (err) {
          console.error('Error sending zip file:', err);
        }
        
        // Delete the temporary zip file after sending
        fs.unlink(zipPath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Error deleting temporary zip file:', unlinkErr);
          }
        });
      });
    });
    
    archive.on('error', (err) => {
      console.error('Error creating archive:', err);
      res.status(500).send('Error creating archive');
    });
    
    // Pipe archive data to the file
    archive.pipe(output);
    
    // Process each file in the package
    for (const filename of files) {
      // Try local file first
      const filePath = getFilePath(categorySlug, packageSlug, filename);
      const exists = await fileExists(filePath);
      
      if (exists) {
        // Add local file to the archive
        archive.file(filePath, { name: filename });
      } else {
        try {
          // Try to get from Supabase Storage
          const { data, error } = await supabase.raw.storage
            .from('resources')
            .download(`${categorySlug}/${packageSlug}/${filename}`);
            
          if (error) {
            console.error(`Error downloading ${filename} from Supabase:`, error);
            continue;
          }
          
          // Convert blob to buffer and add to archive
          const buffer = Buffer.from(await data.arrayBuffer());
          archive.append(buffer, { name: filename });
        } catch (storageError) {
          console.error(`Error processing ${filename}:`, storageError);
        }
      }
    }
    
    // Finalize the archive
    archive.finalize();
  } catch (error) {
    console.error(`Error creating zip for package ${req.params.packageSlug}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to create zip file'
    });
  }
});

// Admin endpoint to sync catalog with database
router.post('/api/admin/resources/sync', async (req, res) => {
  try {
    // Check for admin credentials or token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify admin token
    if (token !== process.env.ADMIN_API_TOKEN) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden'
      });
    }
    
    const result = await resourceService.syncCatalogWithDatabase();
    res.json(result);
  } catch (error) {
    console.error('Error syncing catalog with database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync catalog with database'
    });
  }
});

module.exports = router;