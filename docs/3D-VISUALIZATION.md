# 🏢 3D Visualization Guide

This document explains how the 3D visualization feature works in IFC OpenWorld and how to use it.

## Overview

IFC OpenWorld automatically converts uploaded IFC files into 3D models (glTF/glB format) that can be visualized on the Cesium 3D globe.

## How It Works

### Workflow

```
1. User uploads IFC file
   ↓
2. Backend extracts coordinates from IFC
   ↓
3. Python worker converts IFC → glTF using IfcConvert
   ↓
4. 3D model uploaded to S3/MinIO storage
   ↓
5. Database updated with model URL
   ↓
6. Frontend displays building with 3D model option
```

### Technologies Used

- **IfcOpenShell**: Industry-standard IFC parsing library
- **IfcConvert**: Command-line tool for IFC → glTF conversion
- **CesiumJS**: 3D geospatial visualization engine
- **glTF 2.0**: Modern 3D model format (binary .glb)

## Requirements

### System Requirements

1. **Python Worker Container**:
   - Python 3.11+
   - IfcOpenShell 0.8.0+ with IfcConvert CLI
   - Installed via conda-forge: `conda install -c conda-forge ifcopenshell`

2. **Storage**:
   - S3 or MinIO object storage for model files
   - Recommended: At least 10GB free space

3. **Browser**:
   - WebGL 2.0 support
   - Modern browser (Chrome 79+, Firefox 70+, Safari 15+)

### IFC File Requirements

For successful 3D conversion, IFC files should:

- ✅ Contain 3D geometry (walls, slabs, roofs, etc.)
- ✅ Include IfcSite with coordinates (lat/lon)
- ✅ Be valid IFC2x3 or IFC4 format
- ✅ Be under 100MB (configurable limit)
- ❌ Avoid corrupted or incomplete geometry

## Using 3D Visualization

### Step 1: Upload IFC File

1. Click "📤 Upload IFC" button
2. Drag & drop or select an IFC file
3. Wait for processing to complete (~10-60 seconds depending on file size)

### Step 2: Enable 3D View

1. Click the "🏢 3D View (N)" button
   - **(N)** shows the number of buildings with 3D models
2. Buildings with 3D models will render as glTF models
3. Buildings without 3D models will show as 2D markers (orange)

### Step 3: Inspect Building

1. Click on a building marker or 3D model
2. View building info panel
3. Check **"🏢 3D Model"** section:
   - ✅ **Available**: Model loaded successfully
   - ⚠️ **Not available**: Conversion failed or no geometry

## Troubleshooting

### 3D Model Not Generated

**Symptom**: Building appears but "3D Model" shows "Not available"

**Possible Causes**:

1. **IfcConvert not installed**:
   ```bash
   # Check in Python worker container
   docker exec -it ifc-processor-worker IfcConvert --version
   ```
   - If missing, rebuild Docker image with updated Dockerfile

2. **IFC file has no geometry**:
   - Check IFC file in external viewer (BlenderBIM, FZK Viewer)
   - Ensure file contains IfcWall, IfcSlab, IfcRoof, etc.

3. **Conversion timeout**:
   - Check worker logs: `docker logs ifc-processor-worker`
   - Look for `[3D Conversion] ⏱️ Timeout after 5 minutes`
   - Large files (>50MB) may need longer timeout (edit `gltf_converter.py:128`)

4. **Corrupted IFC file**:
   - Check logs for `[3D Conversion] ❌ Failed`
   - Validate IFC with IfcOpenShell: `python -m ifcopenshell.validate file.ifc`

### 3D Model Not Rendering in Cesium

**Symptom**: Model shows as "Available" but doesn't display on globe

**Solutions**:

1. **Check browser console** (F12):
   - Look for glTF loading errors
   - Common: CORS issues, 404 errors, invalid model URL

2. **Verify model URL**:
   - Check InfoPanel → 3D Model section
   - Ensure URL is accessible: `/models/{fileId}.glb`

3. **Check S3/MinIO**:
   - Verify model uploaded: `aws s3 ls s3://bucket/models/` or MinIO console
   - Ensure Content-Type is `model/gltf-binary`

4. **Scale issues**:
   - Model might be too small or large
   - Edit `CesiumGlobe.tsx:254` to adjust `scale` parameter

## Performance Optimization

### Conversion Time

Typical conversion times (IfcConvert):
- Small (< 5MB): 5-15 seconds
- Medium (5-20MB): 15-45 seconds
- Large (20-50MB): 45-120 seconds
- Very Large (50-100MB): 2-5 minutes

**Tip**: Simplify IFC geometry in authoring tool (Revit, ArchiCAD) before export

### Model Size

glTF models are typically:
- 10-30% of original IFC size for buildings
- 50-80% for complex models with many details

**Example**:
- IFC file: 25 MB → glTF model: 8 MB

### Rendering Performance

CesiumJS performance tips:
- ✅ Use `minimumPixelSize: 64` (already set)
- ✅ Enable LOD (Level of Detail) in IfcConvert if available
- ✅ Limit to 50-100 3D models on screen simultaneously
- ❌ Avoid loading thousands of high-poly models at once

## Advanced Configuration

### Changing Conversion Timeout

Edit `ifc-processor/app/services/gltf_converter.py`:

```python
# Line 128
timeout=300,  # 5 minutes → change to 600 for 10 minutes
```

### Changing Model Position/Scale

Edit `frontend/src/components/CesiumGlobe/CesiumGlobe.tsx`:

```typescript
// Line 252-254
model: {
  uri: `${config.api.baseUrl}${properties.modelUrl}`,
  minimumPixelSize: 64,
  maximumScale: 20000,
  scale: 1.0,  // Adjust this (0.1 = 10x smaller, 10.0 = 10x larger)
  heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
}
```

### Debugging Conversion

Enable verbose logging in `gltf_converter.py`:

```python
# Add at line 145
self.logger.setLevel(logging.DEBUG)
```

Then check worker logs:
```bash
docker logs -f ifc-processor-worker | grep "3D Conversion"
```

## Limitations

Current limitations:

1. **No texture support**: glTF models are generated without materials/textures
2. **No interior geometry**: Only exterior shell is typically converted
3. **No Level of Detail (LOD)**: Single resolution model
4. **No streaming**: Entire model loaded at once
5. **File size limit**: 100MB max for IFC files

## Future Enhancements

Planned features:

- [ ] Material/texture mapping from IFC
- [ ] Level of Detail (LOD) generation
- [ ] Progressive model streaming
- [ ] Client-side IFC rendering with web-ifc (WASM)
- [ ] BIM data overlay (clickable elements with IFC properties)
- [ ] Floor plans and section cuts

## Logging Reference

Look for these log tags when debugging:

| Tag | Location | Purpose |
|-----|----------|---------|
| `[3D Conversion] ✅` | Python worker | Conversion succeeded |
| `[3D Conversion] ❌` | Python worker | Conversion failed |
| `[3D Conversion] ⏱️` | Python worker | Conversion timeout |
| `[3D Conversion] 🚫` | Python worker | IfcConvert not found |
| `[3D Conversion] 💥` | Python worker | Unexpected error |
| `[CesiumGlobe] Loading 3D model` | Frontend | Model loading started |
| `[CesiumGlobe] 3D model loaded successfully` | Frontend | Model rendered |
| `[CesiumGlobe] Error loading 3D model` | Frontend | Model load failed |

## Support

For issues:
1. Check logs using the tags above
2. Verify IfcConvert installation
3. Test IFC file in external viewer
4. Open GitHub issue with logs and sample file

## Credits

- **IfcOpenShell**: Thomas Krijnen et al. (https://ifcopenshell.org/)
- **CesiumJS**: Cesium GS, Inc. (https://cesium.com/)
- **glTF**: Khronos Group (https://www.khronos.org/gltf/)
