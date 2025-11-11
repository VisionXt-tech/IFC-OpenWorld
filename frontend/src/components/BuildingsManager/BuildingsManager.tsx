import { useState, useEffect } from 'react';
import { useBuildingsStore } from '@/store';
import { sanitizeBuildingName } from '@/utils/sanitize';
import './BuildingsManager.css';

/**
 * BuildingsManager Component
 *
 * Admin panel to manage buildings in the database:
 * - View all buildings
 * - Select multiple buildings
 * - Delete selected buildings
 *
 * Keyboard navigation:
 * - Escape: Close panel
 * - Tab: Navigate through interactive elements
 */

export interface BuildingsManagerProps {
  onClose: () => void;
}

function BuildingsManager({ onClose }: BuildingsManagerProps) {
  const { buildings, fetchBuildings } = useBuildingsStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keyboard navigation: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSelectAll = () => {
    if (selectedIds.size === buildings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(buildings.map(b => b.id)));
    }
  };

  const handleSelectBuilding = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.size} building(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const idsToDelete = Array.from(selectedIds);

      // Delete each building via API
      const deletePromises = idsToDelete.map(async (id) => {
        const response = await fetch(`/api/v1/buildings/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`Failed to delete building ${id}`);
        }
      });

      await Promise.all(deletePromises);

      // Refresh buildings list
      await fetchBuildings();
      setSelectedIds(new Set());

      console.log(`[BuildingsManager] Deleted ${idsToDelete.length} building(s)`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete buildings';
      setError(errorMessage);
      console.error('[BuildingsManager] Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="buildings-manager-overlay" onClick={onClose}>
      <div className="buildings-manager-panel" onClick={(e) => e.stopPropagation()}>
        <div className="manager-header">
          <h2>🏗️ Buildings Manager</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="manager-actions">
          <div className="action-left">
            <button
              className="select-all-button"
              onClick={handleSelectAll}
              disabled={buildings.length === 0}
            >
              {selectedIds.size === buildings.length ? '☐ Deselect All' : '☑ Select All'}
            </button>
            <span className="selection-count">
              {selectedIds.size} of {buildings.length} selected
            </span>
          </div>
          <button
            className="delete-button"
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0 || deleting}
          >
            {deleting ? '⏳ Deleting...' : `🗑️ Delete Selected (${selectedIds.size})`}
          </button>
        </div>

        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}

        <div className="buildings-list">
          {buildings.length === 0 ? (
            <div className="empty-state">
              <p>📭 No buildings in database</p>
              <p className="hint">Upload an IFC file to add a building</p>
            </div>
          ) : (
            buildings.map((building) => (
              <div
                key={building.id}
                className={`building-item ${selectedIds.has(building.id) ? 'selected' : ''}`}
                onClick={() => handleSelectBuilding(building.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(building.id)}
                  onChange={() => handleSelectBuilding(building.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="building-info">
                  <div className="building-name">{sanitizeBuildingName(building.properties.name)}</div>
                  <div className="building-details">
                    <span>📍 {building.geometry.coordinates[1].toFixed(4)}°, {building.geometry.coordinates[0].toFixed(4)}°</span>
                    {building.properties.height && (
                      <span>📏 {Number(building.properties.height).toFixed(1)}m</span>
                    )}
                    {building.properties.floorCount && (
                      <span>🏢 {building.properties.floorCount} floors</span>
                    )}
                  </div>
                  <div className="building-meta">
                    Created: {new Date(building.properties.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default BuildingsManager;
