# 3D Models Implementation Plan

**Feature**: Visualizzazione modelli 3D degli edifici su CesiumJS
**Approach**: IFC → glTF → Cesium 3D Model
**Status**: 🚧 In Development
**Started**: 2025-11-01

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ User Upload │ ──> │ IFC Processor│ ──> │   Storage   │
│  .ifc file  │     │   (Python)   │     │  (S3/MinIO) │
└─────────────┘     └──────────────┘     └─────────────┘
                            │                      │
                            ├─ Extract coords      │
                            ├─ Convert to glTF     │
                            └─ Save .glb file  ────┘
                                                    │
                   ┌────────────────────────────────┘
                   ↓
          ┌────────────────┐
          │ CesiumJS Globe │
          │  (Frontend)    │
          └────────────────┘
                   │
                   ├─ Load .glb from URL
                   ├─ Display at coordinates
                   └─ Toggle 2D/3D view
```

---

## Phase 1: Backend - IFC to glTF Conversion

### 1.1 Install IfcConvert ✅
- **File**: `ifc-processor/Dockerfile`
- **Status**: Updated (wget added for future downloads)
- **Tool**: IfcConvert (bundled with IfcOpenShell)

### 1.2 Create glTF Converter Service ✅
- **File**: `ifc-processor/app/services/gltf_converter.py`
- **Class**: `GLTFConverter`
- **Methods**:
  - `convert_ifc_to_gltf()` - Main conversion method
  - `_use_ifcconvert()` - CLI wrapper for IfcConvert
  - `get_model_metadata()` - Extract file size, format

### 1.3 Update IFC Processing Worker ⏳
- **File**: `ifc-processor/app/workers/ifc_processing.py`
- **Changes**:
  1. Import `gltf_converter`
  2. After coordinate extraction, call conversion
  3. Upload .glb file to S3 (key: `models/{fileId}.glb`)
  4. Store glTF URL in database (new field)

### 1.4 Update Database Schema ⏳
- **File**: `backend/prisma/schema.prisma` or manual migration
- **Changes**:
  ```sql
  ALTER TABLE buildings ADD COLUMN model_url TEXT;
  ALTER TABLE buildings ADD COLUMN model_size_mb DECIMAL(10,2);
  ```

### 1.5 Backend API Update ⏳
- **File**: `backend/src/api/v1/buildings.ts`
- **Changes**: Include `modelUrl` in building response
- **New Endpoint**: `GET /api/v1/buildings/:id/model` (optional, for direct download)

---

## Phase 2: Frontend - Cesium 3D Visualization

### 2.1 Update CesiumGlobe Component ⏳
- **File**: `frontend/src/components/CesiumGlobe/CesiumGlobe.tsx`
- **Changes**:
  1. Add state for `show3DModels: boolean`
  2. When rendering buildings, check if `modelUrl` exists
  3. If 3D enabled + modelUrl exists → Load Cesium.Model
  4. If 3D disabled or no modelUrl → Show 2D marker (current behavior)

**Example Code**:
```typescript
// Load 3D model
if (show3DModels && building.properties.modelUrl) {
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(longitude, latitude, 0),
    model: {
      uri: building.properties.modelUrl,
      minimumPixelSize: 128,
      maximumScale: 20000,
      color: Cesium.Color.WHITE,
    },
  });
} else {
  // Show 2D marker (existing code)
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
    point: {
      pixelSize: 15,
      color: Cesium.Color.RED,
    },
  });
}
```

### 2.2 Add 2D/3D Toggle Button ⏳
- **Location**: Near globe controls or in InfoPanel
- **State**: Global state in App or Zustand store
- **UI**: Simple toggle button "2D / 3D"

### 2.3 Performance Optimization ⏳
- **Concern**: Large models (10+ MB) can slow down rendering
- **Solutions**:
  1. Load models only when camera is within certain distance
  2. Add loading states/spinners
  3. Implement Level of Detail (LOD) if needed
  4. Cache loaded models in Cesium

---

## Phase 3: UX Enhancements

### 3.1 Update InfoPanel ⏳
- **File**: `frontend/src/components/InfoPanel/InfoPanel.tsx`
- **Changes**:
  1. Add "View 3D Model" button if `modelUrl` exists
  2. Show model file size and format
  3. Clicking button toggles 3D view + flies to building

### 3.2 Loading States ⏳
- Show spinner while model loads
- Error handling if model fails to load
- Fallback to 2D marker on error

### 3.3 Upload Flow Update ⏳
- **File**: `frontend/src/components/UploadZone/UploadZone.tsx`
- **Changes**: Show "Generating 3D model..." status
- **Backend**: Update processing status to include glTF conversion progress

---

## Technical Decisions

### Why glTF/glB?
- ✅ Native Cesium support
- ✅ Industry standard (Khronos Group)
- ✅ Efficient binary format (.glb)
- ✅ Supports textures, materials, animations
- ✅ Good compression (smaller than OBJ+MTL)

### Why IfcConvert?
- ✅ Most reliable IFC converter
- ✅ Bundled with IfcOpenShell
- ✅ Command-line tool (easy to integrate)
- ✅ Supports multiple output formats
- ✅ Production-ready

### File Storage Strategy
- **Location**: S3/MinIO bucket `models/`
- **Naming**: `{fileId}.glb` (same as building UUID)
- **Access**: Public read (or presigned URLs)
- **Lifecycle**: Delete when building deleted (cascade)

---

## Performance Considerations

### Model Size Limits
- **Recommendation**: Warn users if IFC > 50 MB
- **Target**: Keep glTF < 10 MB when possible
- **Solution**: IfcConvert has decimation options to reduce polygon count

### Loading Strategy
- Load models progressively (priority: visible buildings)
- Show 2D markers first, upgrade to 3D when loaded
- Unload models far from camera to free memory

### Browser Compatibility
- Requires WebGL 2.0 (same as Cesium)
- Works on all modern browsers
- Mobile: May need lower quality models

---

## Testing Strategy

### Unit Tests
- `gltf_converter.py`: Test conversion with sample IFC files
- Frontend: Mock model loading in CesiumGlobe tests

### Integration Tests
- End-to-end: Upload IFC → Convert → Display 3D
- Test error handling (invalid IFC, conversion failure)
- Test fallback to 2D markers

### Manual Testing
1. Upload small IFC file (< 1 MB)
2. Wait for processing
3. Toggle 3D view
4. Verify model appears at correct location
5. Check performance (FPS, memory usage)

---

## Rollout Plan

### MVP (Week 1) - Basic 3D Visualization
- [x] Backend conversion service
- [ ] Worker integration
- [ ] Database schema update
- [ ] Frontend 3D model loading
- [ ] Basic 2D/3D toggle

### v1.1 (Week 2) - UX Polish
- [ ] InfoPanel integration
- [ ] Loading states
- [ ] Error handling
- [ ] Performance optimization

### v1.2 (Future) - Advanced Features
- [ ] 3D Tiles for large models
- [ ] Model textures and materials
- [ ] Interior navigation
- [ ] Measurement tools

---

## Known Limitations (MVP)

1. **No textures**: glTF will be geometry only (materials basic)
2. **No LOD**: All models full detail (may be slow for large files)
3. **No streaming**: Models loaded entirely (not progressive)
4. **No caching**: Models reload on page refresh
5. **No editing**: View-only (no model manipulation)

These can be addressed in future versions.

---

## Dependencies

### Backend
- `ifcopenshell` (already installed)
- `IfcConvert` CLI tool (bundled with ifcopenshell)
- No additional Python packages needed

### Frontend
- CesiumJS (already installed)
- No additional npm packages needed

### Infrastructure
- Storage space for .glb files (~5-10x IFC size)
- No additional compute needed (conversion is fast)

---

## Success Metrics

- ✅ **Conversion Success Rate**: > 90% of IFC files convert successfully
- ✅ **Model Size**: Average .glb < 10 MB
- ✅ **Conversion Time**: < 30 seconds for typical building
- ✅ **Frontend Performance**: 30+ FPS with 10 models visible
- ✅ **User Adoption**: 50%+ users toggle 3D view

---

## Next Steps

1. Complete Phase 1.3: Update worker to call converter
2. Test conversion with sample IFC file
3. Update database schema
4. Implement frontend 3D model loading
5. Add toggle UI

**Estimated Time**: 1-2 days for MVP
**Risk Level**: Low (using proven tools)
**User Value**: High (visual impact)

---

**Last Updated**: 2025-11-01
**Author**: Claude (Anthropic)
