/**
 * SearchBar Component
 *
 * Search bar with filters for BuildingsManager
 */

import { useState } from 'react';
import type { BuildingSearchFilters, FilterCondition } from '@/utils/search';
import './SearchBar.css';

export interface SearchBarProps {
  onSearchChange: (query: string) => void;
  onFiltersChange: (filters: FilterCondition[]) => void;
  totalResults: number;
}

export function SearchBar({ onSearchChange, onFiltersChange, totalResults }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<BuildingSearchFilters>({});

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onSearchChange(newQuery);
  };

  const handleFilterChange = (field: keyof BuildingSearchFilters, value: unknown) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);

    // Convert to FilterCondition array
    const conditions: FilterCondition[] = [];

    if (newFilters.minHeight) {
      conditions.push({
        field: 'properties.height',
        operator: 'greaterThanOrEqual',
        value: Number(newFilters.minHeight),
      });
    }
    if (newFilters.maxHeight) {
      conditions.push({
        field: 'properties.height',
        operator: 'lessThanOrEqual',
        value: Number(newFilters.maxHeight),
      });
    }
    if (newFilters.minFloors) {
      conditions.push({
        field: 'properties.floorCount',
        operator: 'greaterThanOrEqual',
        value: Number(newFilters.minFloors),
      });
    }
    if (newFilters.maxFloors) {
      conditions.push({
        field: 'properties.floorCount',
        operator: 'lessThanOrEqual',
        value: Number(newFilters.maxFloors),
      });
    }
    if (newFilters.hasModel !== undefined) {
      conditions.push({
        field: 'properties.modelUrl',
        operator: newFilters.hasModel ? 'notEquals' : 'equals',
        value: null,
      });
    }

    onFiltersChange(conditions);
  };

  const handleClearFilters = () => {
    setFilters({});
    onFiltersChange([]);
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== undefined && v !== '').length;

  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <input
          type="text"
          placeholder="Search buildings by name, address, city..."
          value={query}
          onChange={handleQueryChange}
          className="search-input"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="filters-toggle"
          aria-label="Toggle filters"
        >
          🔍 Filters
          {activeFiltersCount > 0 && <span className="filter-count">{activeFiltersCount}</span>}
        </button>
      </div>

      {showFilters && (
        <div className="filters-panel">
          <div className="filter-row">
            <div className="filter-group">
              <label>Height (m)</label>
              <div className="range-inputs">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minHeight || ''}
                  onChange={(e) => handleFilterChange('minHeight', e.target.value ? Number(e.target.value) : undefined)}
                />
                <span>to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxHeight || ''}
                  onChange={(e) => handleFilterChange('maxHeight', e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
            </div>

            <div className="filter-group">
              <label>Floors</label>
              <div className="range-inputs">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minFloors || ''}
                  onChange={(e) => handleFilterChange('minFloors', e.target.value ? Number(e.target.value) : undefined)}
                />
                <span>to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxFloors || ''}
                  onChange={(e) => handleFilterChange('maxFloors', e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
            </div>

            <div className="filter-group">
              <label>3D Model</label>
              <select
                value={filters.hasModel === undefined ? '' : filters.hasModel ? 'true' : 'false'}
                onChange={(e) => handleFilterChange('hasModel', e.target.value === '' ? undefined : e.target.value === 'true')}
              >
                <option value="">All</option>
                <option value="true">With model</option>
                <option value="false">Without model</option>
              </select>
            </div>

            <button onClick={handleClearFilters} className="clear-filters-btn">
              Clear
            </button>
          </div>

          <div className="results-count">
            {totalResults} {totalResults === 1 ? 'result' : 'results'}
          </div>
        </div>
      )}
    </div>
  );
}
