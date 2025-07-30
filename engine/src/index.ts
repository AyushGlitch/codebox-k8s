import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from '@y/websocket-server/dist/src/utils';
import { initWS } from './ws';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = parseInt(process.env.PORT || '3000', 10);
const YJS_PORT = parseInt(process.env.YJS_PORT || '3001', 10);
const execAsync = promisify(exec);

// Middleware
app.use(cors());
app.use(express.json());

// Health check route - handle both prefixed and non-prefixed
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

// Health check route with prefix for ingress routing
app.get('/pod/server/health', (req, res) => {
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

// API endpoint to get workspace files with prefix for ingress routing
app.get('/pod/server/get-workspace-files', (req, res) => {
    try {
        const workspaceDir = './workspace';
        const files = fs.readdirSync(workspaceDir);
        const workspaceFiles = [];
        
        for (const file of files) {
            const relativePath = path.join(workspaceDir, file);
            const fileContent = fs.readFileSync(relativePath, 'utf8');
            const extension = path.extname(file).toLowerCase();
            
            workspaceFiles.push({
                id: relativePath,
                name: relativePath,
                content: fileContent,
                extension: extension
            });
        }

        res.status(200).json(workspaceFiles);
    } catch (error) {
        console.error('Error getting workspace files:', error);
        res.status(500).json({ error: 'Failed to get workspace files' });
    }
})

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
    
    initWS(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`Express HTTP + Socket.io server running on port ${PORT}`);
    });

    // Start YJS WebSocket server on separate port
    const wss = new WebSocketServer({ port: YJS_PORT });
    wss.on('connection', (conn, req) => {
      console.log('New YJS WebSocket connection');
      setupWSConnection(conn, req, {
        gc: true,
      });
    });

    console.log(`YJS WebSocket server running on port ${YJS_PORT}`);
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();

export default app; 