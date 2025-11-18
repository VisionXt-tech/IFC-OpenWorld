import { useState, useMemo, useCallback } from 'react';
import { useBuildingsStore } from '@/store';
import { sanitizeBuildingName } from '@/utils/sanitize';
import { useToast } from '@/contexts/ToastContext';
import { deleteBuilding } from '@/services/api/buildingsApi';
import type { BuildingFeature } from '@/types';
import { ConfirmDialog } from '@/components/Modal';
import { SearchBar } from './SearchBar';
import { Pagination } from './Pagination';
import { BuildingListSkeleton } from '@/components/LoadingSkeleton';
import { useAdvancedSearch, type FilterCondition } from '@/utils/search';
import { exportBuildingsCSV, exportJSON } from '@/utils/export';
import { useKeyboardShortcut } from '@/utils/keyboardShortcuts';
import { logger } from '@/utils/logger';
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
  const { buildings, isLoading, fetchBuildings } = useBuildingsStore();
  const { success, error: showError, warning } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Search and filter
  const search = useAdvancedSearch(buildings, {
    defaultPageSize: 20,
    searchOptions: {
      fields: ['properties.name', 'properties.address', 'properties.city', 'properties.country'],
      fuzzy: false,
    },
  });

  // Use filtered results
  const displayedBuildings = search.result.items;

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === buildings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(buildings.map(b => b.id)));
    }
  }, [selectedIds.size, buildings]);

  const handleSelectBuilding = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }, []);

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    setShowConfirmDelete(false);
    setDeleting(true);
    setError(null);

    try {
      const idsToDelete = Array.from(selectedIds);

      // IMPROVEMENT: Use Promise.allSettled to handle partial failures
      // CSRF token is now handled automatically by apiClient
      const deletePromises = idsToDelete.map(async (id) => {
        await deleteBuilding(id);
        return id;
      });

      const results = await Promise.allSettled(deletePromises);

      // Analyze results
      const succeeded = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      // Refresh buildings list
      await fetchBuildings().catch((err) => {
        logger.error('[BuildingsManager] Failed to refresh buildings:', err);
      });
      setSelectedIds(new Set());

      // IMPROVEMENT: Detailed feedback based on results
      if (failed.length === 0) {
        success(`Successfully deleted ${succeeded.length} building(s)`, 4000);
        logger.debug(`[BuildingsManager] Deleted ${succeeded.length} building(s)`);
      } else if (succeeded.length === 0) {
        showError(`Failed to delete all ${failed.length} building(s)`);
        logger.error('[BuildingsManager] All deletions failed');
      } else {
        warning(
          `Deleted ${succeeded.length} building(s), but ${failed.length} failed. Please try again.`,
          6000
        );
        logger.warn(`[BuildingsManager] Partial success: ${succeeded.length} succeeded, ${failed.length} failed`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete buildings';
      setError(errorMessage);
      showError(errorMessage);
      logger.error('[BuildingsManager] Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = () => {
    try {
      exportBuildingsCSV(displayedBuildings, 'buildings.csv');
      success('Buildings exported to CSV');
    } catch (err) {
      showError('Failed to export CSV');
      logger.error('[BuildingsManager] Export CSV error:', err);
    }
  };

  const handleExportJSON = () => {
    try {
      exportJSON(displayedBuildings, 'buildings.json');
      success('Buildings exported to JSON');
    } catch (err) {
      showError('Failed to export JSON');
      logger.error('[BuildingsManager] Export JSON error:', err);
    }
  };

  // Keyboard Shortcuts - Centralized
  // Escape: Close manager (handled by parent App, but registered here for documentation)
  useKeyboardShortcut(
    'buildingsManager.close',
    {
      key: 'Escape',
      description: 'Close buildings manager',
      handler: onClose,
    },
    [onClose]
  );

  // Ctrl+A: Select all
  useKeyboardShortcut(
    'buildingsManager.selectAll',
    {
      key: 'a',
      ctrl: true,
      description: 'Select all buildings',
      preventDefault: true,
      handler: handleSelectAll,
    },
    [buildings.length, selectedIds.size]
  );

  // Delete: Delete selected
  useKeyboardShortcut(
    'buildingsManager.delete',
    {
      key: 'Delete',
      description: 'Delete selected buildings',
      handler: () => {
        if (selectedIds.size > 0 && !deleting) {
          handleDeleteSelected();
        }
      },
    },
    [selectedIds.size, deleting]
  );

  // Ctrl+E: Export CSV
  useKeyboardShortcut(
    'buildingsManager.export',
    {
      key: 'e',
      ctrl: true,
      description: 'Export buildings to CSV',
      preventDefault: true,
      handler: () => {
        if (displayedBuildings.length > 0) {
          handleExportCSV();
        }
      },
    },
    [displayedBuildings.length]
  );

  return (
    <div className="buildings-manager-overlay" onClick={onClose}>
      <div
        className="buildings-manager-panel"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* ARIA Live Regions for screen readers */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {selectedIds.size > 0 && `${selectedIds.size} of ${buildings.length} buildings selected`}
        </div>
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {!isLoading && displayedBuildings.length > 0 && `Showing ${search.result.items.length} of ${search.result.total} buildings`}
        </div>

        <div className="manager-header">
          <h2 id="buildings-manager-title">🏗️ Buildings Manager</h2>
          <button className="close-button" onClick={onClose} aria-label="Close buildings manager">
            ✕
          </button>
        </div>

        {/* Search and Filters */}
        <SearchBar
          onSearchChange={search.setQuery}
          onFiltersChange={(filters: FilterCondition[]) => {
            search.clearFilters();
            filters.forEach((f) => search.addFilter(f));
          }}
          totalResults={search.result.total}
        />

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
          <div className="action-right">
            <button className="export-button" onClick={handleExportCSV} disabled={displayedBuildings.length === 0}>
              📊 Export CSV
            </button>
            <button className="export-button" onClick={handleExportJSON} disabled={displayedBuildings.length === 0}>
              📄 Export JSON
            </button>
            <button
              className="delete-button"
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0 || deleting}
            >
              {deleting ? '⏳ Deleting...' : `🗑️ Delete (${selectedIds.size})`}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}

        <div className="buildings-list">
          {isLoading ? (
            <BuildingListSkeleton count={5} />
          ) : buildings.length === 0 ? (
            <div className="empty-state">
              <p>📭 No buildings in database</p>
              <p className="hint">Upload an IFC file to add a building</p>
            </div>
          ) : displayedBuildings.length === 0 ? (
            <div className="empty-state">
              <p>🔍 No buildings match your search</p>
              <p className="hint">Try adjusting your filters</p>
            </div>
          ) : (
            <BuildingsList
              buildings={displayedBuildings}
              selectedIds={selectedIds}
              onSelectBuilding={handleSelectBuilding}
            />
          )}
        </div>

        {/* Pagination */}
        {!isLoading && displayedBuildings.length > 0 && (
          <Pagination
            currentPage={search.pagination.page}
            totalPages={search.result.totalPages}
            pageSize={search.pagination.pageSize}
            total={search.result.total}
            hasNextPage={search.result.hasNextPage}
            hasPrevPage={search.result.hasPrevPage}
            onPageChange={search.setPage}
            onPageSizeChange={search.setPageSize}
          />
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Buildings"
        message={`Are you sure you want to delete ${selectedIds.size} building(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

/**
 * BuildingsList Component - Memoized for Performance
 *
 * Renders the list of building items with memoization to prevent
 * unnecessary re-renders when parent state changes
 */
interface BuildingsListProps {
  buildings: BuildingFeature[];
  selectedIds: Set<string>;
  onSelectBuilding: (id: string) => void;
}

const BuildingsList = ({ buildings, selectedIds, onSelectBuilding }: BuildingsListProps) => {
  return useMemo(
    () => (
      <>
        {buildings.map((building) => (
          <div
            key={building.id}
            className={`building-item ${selectedIds.has(building.id) ? 'selected' : ''}`}
            onClick={() => onSelectBuilding(building.id)}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(building.id)}
              onChange={() => onSelectBuilding(building.id)}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="building-info">
              <div className="building-name">
                {sanitizeBuildingName(building.properties.name)}
                {building.properties.modelUrl && (
                  <span
                    className="model-badge"
                    title={`3D model available (${building.properties.modelSizeMb != null ? Number(building.properties.modelSizeMb).toFixed(1) : '?'} MB ${building.properties.modelFormat ?? 'glb'})`}
                    style={{
                      marginLeft: '8px',
                      padding: '2px 6px',
                      backgroundColor: '#4caf50',
                      color: 'white',
                      fontSize: '0.75em',
                      borderRadius: '3px',
                      fontWeight: 'bold'
                    }}
                  >
                    3D
                  </span>
                )}
              </div>
              <div className="building-details">
                <span>
                  📍 {building.geometry.coordinates[1].toFixed(4)}°, {building.geometry.coordinates[0].toFixed(4)}°
                </span>
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
        ))}
      </>
    ),
    [buildings, selectedIds, onSelectBuilding]
  );
};

export default BuildingsManager;
