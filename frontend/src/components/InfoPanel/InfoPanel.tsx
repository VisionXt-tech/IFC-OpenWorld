import { useEffect } from 'react';
import { type BuildingFeature } from '@/types';
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
      alert('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

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

  return (
    <div className="info-panel-overlay" onClick={onClose}>
      <div className="info-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="info-panel-header">
          <h2>{properties.name || 'Building'}</h2>
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
          {(height || floorCount) && (
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
