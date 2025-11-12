import { useEffect } from 'react';
import { type BuildingFeature } from '@/types';
import { sanitizeBuildingName } from '@/utils/sanitize';
import { useToast } from '@/contexts/ToastContext';
import './InfoPanel.css';

export interface InfoPanelProps {
  building: BuildingFeature | null;
  onClose: () => void;
}

/**
 * InfoPanel Component
 *
 * Displays detailed building metadata with CC-BY 4.0 attribution.
 * Shows all extracted IFC data including coordinates, address, and structural info.
 *
 * Keyboard navigation:
 * - Escape: Close panel
 * - Tab: Navigate through interactive elements
 *
 * @see specs/001-plan.md Task 3.7, 3.8
 */
function InfoPanel({ building, onClose }: InfoPanelProps) {
  // UX IMPROVEMENT: Use Toast notifications instead of alert()
  const { success, error: showError } = useToast();

  // BUGFIX: Move useEffect before early return to comply with React Rules of Hooks
  // Hooks must be called in the same order on every render
  useEffect(() => {
    // Only attach listener if building is present
    if (!building) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [building, onClose]);

  if (!building) return null;

  const { geometry, properties } = building;
  const [longitude, latitude] = geometry.coordinates;

  // Convert numeric properties
  const height = properties.height ? Number(properties.height) : null;
  const floorCount = properties.floorCount ? Number(properties.floorCount) : null;

  // Format dates
  const uploadDate = new Date(properties.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Generate shareable link
  const shareUrl = `${window.location.origin}?building=${building.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      success('Link copied to clipboard!', 3000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      showError('Failed to copy link');
    }
  };

  return (
    <div className="info-panel-overlay" onClick={onClose}>
      <div
        className="info-panel"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="info-panel-header">
          <h2>{sanitizeBuildingName(properties.name)}</h2>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close info panel"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="info-panel-content">
          {/* Location Section */}
          <section className="info-section">
            <h3>📍 Location</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Latitude:</span>
                <span className="info-value">{latitude.toFixed(6)}°</span>
              </div>
              <div className="info-item">
                <span className="info-label">Longitude:</span>
                <span className="info-value">{longitude.toFixed(6)}°</span>
              </div>
              {properties.address && (
                <div className="info-item full-width">
                  <span className="info-label">Address:</span>
                  <span className="info-value">{properties.address}</span>
                </div>
              )}
              {properties.city && (
                <div className="info-item">
                  <span className="info-label">City:</span>
                  <span className="info-value">{properties.city}</span>
                </div>
              )}
              {properties.country && (
                <div className="info-item">
                  <span className="info-label">Country:</span>
                  <span className="info-value">{properties.country}</span>
                </div>
              )}
            </div>
          </section>

          {/* Building Info Section */}
          {(height != null || floorCount != null) && (
            <section className="info-section">
              <h3>🏗️ Building Information</h3>
              <div className="info-grid">
                {height && !isNaN(height) && (
                  <div className="info-item">
                    <span className="info-label">Height:</span>
                    <span className="info-value">{height.toFixed(2)} m</span>
                  </div>
                )}
                {floorCount && !isNaN(floorCount) && (
                  <div className="info-item">
                    <span className="info-label">Floors:</span>
                    <span className="info-value">{floorCount}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 3D Model Section */}
          {properties.modelUrl && (
            <section className="info-section">
              <h3>🏢 3D Model</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Status:</span>
                  <span className="info-value" style={{ color: '#4caf50', fontWeight: 'bold' }}>
                    ✅ Available
                  </span>
                </div>
                {properties.modelFormat && (
                  <div className="info-item">
                    <span className="info-label">Format:</span>
                    <span className="info-value">{properties.modelFormat.toUpperCase()}</span>
                  </div>
                )}
                {properties.modelSizeMb && (
                  <div className="info-item">
                    <span className="info-label">Size:</span>
                    <span className="info-value">{properties.modelSizeMb.toFixed(2)} MB</span>
                  </div>
                )}
                <div className="info-item full-width">
                  <span className="info-label">Hint:</span>
                  <span className="info-value" style={{ fontSize: '0.9em', fontStyle: 'italic' }}>
                    Use the "🏢 3D View" toggle to see this building in 3D
                  </span>
                </div>
              </div>
            </section>
          )}
          {!properties.modelUrl && (
            <section className="info-section">
              <h3>🏢 3D Model</h3>
              <div className="info-grid">
                <div className="info-item full-width">
                  <span className="info-label">Status:</span>
                  <span className="info-value" style={{ color: '#ff9800' }}>
                    ⚠️ Not available
                  </span>
                </div>
                <div className="info-item full-width">
                  <span className="info-value" style={{ fontSize: '0.9em', fontStyle: 'italic' }}>
                    The IFC file might not contain 3D geometry or conversion failed
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Upload Info Section */}
          <section className="info-section">
            <h3>📅 Upload Information</h3>
            <div className="info-grid">
              <div className="info-item full-width">
                <span className="info-label">Uploaded:</span>
                <span className="info-value">{uploadDate}</span>
              </div>
              <div className="info-item full-width">
                <span className="info-label">File ID:</span>
                <span className="info-value info-code">{properties.ifcFileId.substring(0, 8)}...</span>
              </div>
            </div>
          </section>

          {/* CC-BY 4.0 Attribution Section */}
          <section className="info-section license-section">
            <h3>📜 License</h3>
            <div className="license-content">
              <p>
                This building data is licensed under{' '}
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="license-link"
                >
                  CC BY 4.0
                </a>
              </p>
              <p className="license-description">
                You are free to share and adapt this data for any purpose, even commercially,
                as long as you give appropriate credit to the original uploader.
              </p>
              <div className="cc-icons">
                <img
                  src="https://mirrors.creativecommons.org/presskit/icons/cc.svg"
                  alt="Creative Commons"
                  className="cc-icon"
                />
                <img
                  src="https://mirrors.creativecommons.org/presskit/icons/by.svg"
                  alt="Attribution"
                  className="cc-icon"
                />
              </div>
            </div>
          </section>

          {/* Share Section */}
          <section className="info-section">
            <button
              className="share-button"
              onClick={handleCopyLink}
              type="button"
            >
              🔗 Copy Link to Building
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

export default InfoPanel;
