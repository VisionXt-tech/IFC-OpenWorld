/**
 * Web Worker for IFC parsing using web-ifc
 * POC Task T119: Validate web-ifc parsing in browser
 *
 * SOLUTION: Using local npm package with custom WASM loading
 */

import * as WebIFC from 'web-ifc';

// Initialize IfcAPI
const ifcApi = new WebIFC.IfcAPI();

// Track initialization state
let isInitialized = false;
let initStartTime = 0;

// Message types
interface WorkerMessage {
  type: 'INIT' | 'PARSE_IFC' | 'GET_COORDINATES' | 'GET_GEOMETRY';
  data?: any;
}

interface WorkerResponse {
  type: 'INIT_COMPLETE' | 'PARSE_COMPLETE' | 'COORDINATES' | 'GEOMETRY' | 'ERROR' | 'PROGRESS';
  data?: any;
  error?: string;
  metrics?: {
    initTime?: number;
    parseTime?: number;
    memoryUsed?: number;
  };
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'INIT':
        await handleInit();
        break;

      case 'PARSE_IFC':
        await handleParseIfc(data);
        break;

      case 'GET_COORDINATES':
        await handleGetCoordinates(data);
        break;

      case 'GET_GEOMETRY':
        await handleGetGeometry(data);
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    postResponse({
      type: 'ERROR',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Initialize web-ifc WASM module
 */
async function handleInit() {
  initStartTime = performance.now();

  try {
    // Fetch WASM from CDN (bypasses Vite MIME type issues)
    const wasmUrl = 'https://unpkg.com/web-ifc@0.0.53/web-ifc.wasm';
    const wasmResponse = await fetch(wasmUrl);
    const wasmBinary = await wasmResponse.arrayBuffer();

    // Initialize with custom WASM binary
    await ifcApi.Init(wasmBinary);

    const initTime = performance.now() - initStartTime;
    isInitialized = true;

    postResponse({
      type: 'INIT_COMPLETE',
      metrics: {
        initTime: parseFloat(initTime.toFixed(2))
      }
    });

  } catch (error) {
    throw new Error(`Failed to initialize web-ifc: ${error}`);
  }
}

/**
 * Parse IFC file from ArrayBuffer
 */
async function handleParseIfc(arrayBuffer: ArrayBuffer) {
  if (!isInitialized) {
    throw new Error('IfcAPI not initialized. Call INIT first.');
  }

  const parseStartTime = performance.now();

  try {
    // Create Uint8Array from ArrayBuffer
    const ifcData = new Uint8Array(arrayBuffer);

    // Open IFC model
    const modelID = ifcApi.OpenModel(ifcData);

    // Get model info
    const allLines = ifcApi.GetAllLines(modelID);
    const lineCount = allLines.size();

    // Get IFC entities count
    const projectCount = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCPROJECT).size();
    const siteCount = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCSITE).size();
    const buildingCount = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCBUILDING).size();

    const parseTime = performance.now() - parseStartTime;

    // Get memory usage (approximate)
    const memoryUsed = (performance as any).memory?.usedJSHeapSize || 0;

    postResponse({
      type: 'PARSE_COMPLETE',
      data: {
        modelID,
        lineCount,
        entities: {
          projects: projectCount,
          sites: siteCount,
          buildings: buildingCount
        }
      },
      metrics: {
        parseTime: parseFloat(parseTime.toFixed(2)),
        memoryUsed: Math.round(memoryUsed / 1024 / 1024) // MB
      }
    });

  } catch (error) {
    throw new Error(`Failed to parse IFC: ${error}`);
  }
}

/**
 * Extract coordinates from IfcSite
 */
async function handleGetCoordinates(modelID: number) {
  if (!isInitialized) {
    throw new Error('IfcAPI not initialized');
  }

  try {
    // Get all IfcSite entities
    const siteIDs = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCSITE);

    if (siteIDs.size() === 0) {
      throw new Error('No IfcSite found in model');
    }

    // Get first site
    const siteID = siteIDs.get(0);
    const site = ifcApi.GetLine(modelID, siteID) as any;

    // Extract coordinates
    const refLatitude = site.RefLatitude?.value || null;
    const refLongitude = site.RefLongitude?.value || null;
    const refElevation = site.RefElevation?.value || null;

    // Convert DMS to decimal if needed
    let lat = null;
    let lon = null;

    if (refLatitude && Array.isArray(refLatitude)) {
      // DMS format: [degrees, minutes, seconds, millionths]
      lat = convertDMSToDecimal(refLatitude);
    }

    if (refLongitude && Array.isArray(refLongitude)) {
      lon = convertDMSToDecimal(refLongitude);
    }

    postResponse({
      type: 'COORDINATES',
      data: {
        siteName: site.Name?.value || 'Unnamed Site',
        latitude: lat,
        longitude: lon,
        elevation: refElevation,
        raw: {
          refLatitude,
          refLongitude
        }
      }
    });

  } catch (error) {
    throw new Error(`Failed to extract coordinates: ${error}`);
  }
}

/**
 * Get geometry statistics
 */
async function handleGetGeometry(modelID: number) {
  if (!isInitialized) {
    throw new Error('IfcAPI not initialized');
  }

  try {
    // Get geometry counts
    const wallCount = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCWALL).size();
    const slabCount = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCSLAB).size();
    const beamCount = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCBEAM).size();
    const columnCount = ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCCOLUMN).size();

    postResponse({
      type: 'GEOMETRY',
      data: {
        walls: wallCount,
        slabs: slabCount,
        beams: beamCount,
        columns: columnCount,
        total: wallCount + slabCount + beamCount + columnCount
      }
    });

  } catch (error) {
    throw new Error(`Failed to get geometry: ${error}`);
  }
}

/**
 * Convert DMS (Degrees, Minutes, Seconds) to Decimal
 */
function convertDMSToDecimal(dms: number[]): number {
  if (dms.length < 3) return 0;

  const degrees = dms[0] || 0;
  const minutes = dms[1] || 0;
  const seconds = dms[2] || 0;
  const millionths = dms[3] || 0;

  const decimal = degrees + minutes / 60 + seconds / 3600 + millionths / (3600 * 1000000);

  return parseFloat(decimal.toFixed(6));
}

/**
 * Post response to main thread
 */
function postResponse(response: WorkerResponse) {
  self.postMessage(response);
}

// Log when worker is ready
console.log('[IFC Worker] Ready');
