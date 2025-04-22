const fs = require('fs');
const path = require('path');

// Example function to process the data and generate import statements
async function processData() {
  const filePath = path.resolve(__dirname, 'data', 'videos_and_panels.json');
  
  // Step 1: Read and parse the JSON file
  try {
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    // Step 2: Process videos and panels
    let videoStatements = '';
    let panelStatements = '';
    let videoIdCounter = 1; // Starting ID for videos
    let panelIdCounter = 1; // Starting ID for panels
    
    for (const video of data) {
      if (!video) continue; // Skip if the video is null
      
      const {
        id, title, description, youtubeId, tags, rating, date, transcript, views,
        panels, creator, categories, additionalInfo, resources
      } = video;
      
      // Step 3: Prepare Video Insert Statement
      const videoStatement = `
        INSERT INTO videos (id, title, description, youtube_id, rating, creator, created_at, updated_at)
        VALUES ('${id}', '${title.replace(/'/g, "''")}', '${description.replace(/'/g, "''")}', 
                '${youtubeId}', ${rating}, '${creator.replace(/'/g, "''")}', 
                '${date}', '${date}');
      `;
      videoStatements += videoStatement;

      // Step 4: Process Panels for the current video
      panels.forEach((panel, index) => {
        const { title: panelTitle, content, description: panelDescription, timestamp } = panel;
        
        const panelStatement = `
          INSERT INTO panel (id, video_id, title, content, order_number, created_at)
          VALUES (${panelIdCounter++}, ${videoIdCounter}, '${panelTitle.replace(/'/g, "''")}', 
                  '${content.replace(/'/g, "''")}', ${index + 1}, '${date}');
        `;
        panelStatements += panelStatement;
      });

      videoIdCounter++;
    }

    // Step 5: Output the SQL statements
    const outputPath = path.resolve(__dirname, 'output', 'import_statements.sql');
    const importStatements = `${videoStatements}\n\n${panelStatements}`;

    // Write to a file
    await fs.promises.writeFile(outputPath, importStatements);
    console.log('Import statements have been written to output/import_statements.sql');
  } catch (err) {
    console.error('Error processing data:', err);
  }
}

// Run the program
processData();
