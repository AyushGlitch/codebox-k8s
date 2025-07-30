import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const execAsync = promisify(exec);

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get('/health', (req, res) => {
  const workspaceExists = fs.existsSync('./workspace');
  const runScriptExists = fs.existsSync('./workspace/run.sh');
  
  res.json({ 
    status: 'healthy', 
    workspaceId: process.env.WORKSPACE_ID,
    workspaceInitialized: workspaceExists,
    runScriptAvailable: runScriptExists,
    timestamp: new Date().toISOString() 
  });
});

// Function to automatically run workspace script on startup
async function runWorkspaceScript(): Promise<void> {
  const runScriptPath = path.join('./workspace', 'run.sh');
  
  if (!fs.existsSync('./workspace') || !fs.existsSync(runScriptPath)) {
    console.log('No workspace or run.sh found, skipping script execution');
    return;
  }

  try {
    console.log('Executing run.sh...');
    
    await execAsync(`chmod +x ${runScriptPath}`);
    
    const startTime = Date.now();
    const { stdout, stderr } = await execAsync(
      `cd ./workspace && ./run.sh`,
      { 
        timeout: 300000, // 5 minute timeout
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      }
    );
    
    const executionTime = Date.now() - startTime;
    console.log(`run.sh completed in ${executionTime}ms`);
    
    if (stdout) console.log('Script output:', stdout);
    if (stderr) console.log('Script stderr:', stderr);
    
  } catch (error: any) {
    console.error('run.sh execution failed:', error.message);
    
    const failOnScriptError = process.env.FAIL_ON_SCRIPT_ERROR === 'true';
    if (failOnScriptError) {
      console.error('Failing container startup due to script error');
      process.exit(1);
    }
  }
}

// Startup function
async function startServer(): Promise<void> {
  try {
    console.log('Starting Codebox Engine...');
    console.log('Workspace ID:', process.env.WORKSPACE_ID || 'not set');
    
    // Run workspace script if available
    if (fs.existsSync('./workspace')) {
      console.log('Workspace found, checking for run.sh');
      await runWorkspaceScript();
    }
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();

export default app; 