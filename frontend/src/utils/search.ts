/**
 * Advanced Search and Filter Utilities
 *
 * Provides powerful search and filtering capabilities with:
 * - Text search with fuzzy matching
 * - Multiple filter criteria
 * - Sorting and pagination
 * - Debounced search
 * - Search history
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { logger } from './logger';

/**
 * Filter operator
 */
export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'in'
  | 'notIn'
  | 'between';

/**
 * Filter condition
 */
export interface FilterCondition<T = unknown> {
  field: string;
  operator: FilterOperator;
  value: T;
  value2?: T; // For 'between' operator
}

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort configuration
 */
export interface SortConfig {
  field: string;
  direction: SortDirection;
}

/**
 * Search options
 */
export interface SearchOptions {
  caseSensitive?: boolean;
  fuzzy?: boolean;
  fuzzyThreshold?: number; // 0-1, lower = more strict
  fields?: string[]; // Fields to search in
}

/**
 * Pagination config
 */
export interface PaginationConfig {
  page: number;
  pageSize: number;
  total?: number;
}

/**
 * Search result
 */
export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Apply filter condition to value
 */
export function applyFilter<T>(value: unknown, condition: FilterCondition<T>): boolean {
  const { operator, value: filterValue, value2 } = condition;

  switch (operator) {
    case 'equals':
      return value === filterValue;

    case 'notEquals':
      return value !== filterValue;

    case 'contains':
      if (typeof value === 'string' && typeof filterValue === 'string') {
        return value.toLowerCase().includes(filterValue.toLowerCase());
      }
      if (Array.isArray(value)) {
        return value.includes(filterValue);
      }
      return false;

    case 'notContains':
      if (typeof value === 'string' && typeof filterValue === 'string') {
        return !value.toLowerCase().includes(filterValue.toLowerCase());
      }
      if (Array.isArray(value)) {
        return !value.includes(filterValue);
      }
      return true;

    case 'startsWith':
      if (typeof value === 'string' && typeof filterValue === 'string') {
        return value.toLowerCase().startsWith(filterValue.toLowerCase());
      }
      return false;

    case 'endsWith':
      if (typeof value === 'string' && typeof filterValue === 'string') {
        return value.toLowerCase().endsWith(filterValue.toLowerCase());
      }
      return false;

    case 'greaterThan':
      return typeof value === 'number' && typeof filterValue === 'number' && value > filterValue;

    case 'greaterThanOrEqual':
      return typeof value === 'number' && typeof filterValue === 'number' && value >= filterValue;

    case 'lessThan':
      return typeof value === 'number' && typeof filterValue === 'number' && value < filterValue;

    case 'lessThanOrEqual':
      return typeof value === 'number' && typeof filterValue === 'number' && value <= filterValue;

    case 'in':
      if (Array.isArray(filterValue)) {
        return filterValue.includes(value);
      }
      return false;

    case 'notIn':
      if (Array.isArray(filterValue)) {
        return !filterValue.includes(value);
      }
      return true;

    case 'between':
      if (typeof value === 'number' && typeof filterValue === 'number' && typeof value2 === 'number') {
        return value >= filterValue && value <= value2;
      }
      return false;

    default:
      return false;
  }
}

/**
 * Filter array by conditions
 */
export function filterData<T extends object>(
  data: T[],
  conditions: FilterCondition[]
): T[] {
  if (conditions.length === 0) return data;

  return data.filter((item) => {
    return conditions.every((condition) => {
      const value = (item as any)[condition.field];
      return applyFilter(value, condition);
    });
  });
}

/**
 * Sort array
 */
export function sortData<T extends object>(data: T[], sort: SortConfig): T[] {
  if (!sort.field) return data;

  return [...data].sort((a, b) => {
    const aVal = (a as any)[sort.field];
    const bVal = (b as any)[sort.field];

    // Handle null/undefined
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    // Compare values
    let comparison = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }

    return sort.direction === 'asc' ? comparison : -comparison;
  });
}

/**
 * Calculate Levenshtein distance (for fuzzy search)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) {
    const row = dp[i];
    if (row) row[0] = i;
  }
  for (let j = 0; j <= n; j++) {
    const row = dp[0];
    if (row) row[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const currentRow = dp[i];
      const prevRow = dp[i - 1];
      const prevPrevRow = dp[i - 1];

      if (str1[i - 1] === str2[j - 1] && currentRow && prevPrevRow) {
        currentRow[j] = prevPrevRow[j - 1] ?? 0;
      } else if (currentRow && prevRow && prevPrevRow) {
        currentRow[j] = Math.min(
          prevPrevRow[j - 1] ?? 0,
          prevRow[j] ?? 0,
          currentRow[j - 1] ?? 0
        ) + 1;
      }
    }
  }

  const lastRow = dp[m];
  return lastRow ? lastRow[n] ?? 0 : 0;
}

/**
 * Calculate similarity score (0-1, higher = more similar)
 */
function similarityScore(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - distance / maxLen;
}

/**
 * Search data with text query
 */
export function searchData<T extends object>(
  data: T[],
  query: string,
  options: SearchOptions = {}
): T[] {
  if (!query.trim()) return data;

  const { caseSensitive = false, fuzzy = false, fuzzyThreshold = 0.6, fields } = options;

  const searchQuery = caseSensitive ? query : query.toLowerCase();

  return data.filter((item) => {
    const fieldsToSearch = fields || Object.keys(item as any);

    return fieldsToSearch.some((field) => {
      const value = (item as any)[field];
      if (value === null || value === undefined) return false;

      const strValue = caseSensitive ? String(value) : String(value).toLowerCase();

      if (fuzzy) {
        const score = similarityScore(strValue, searchQuery);
        return score >= fuzzyThreshold;
      } else {
        return strValue.includes(searchQuery);
      }
    });
  });
}

/**
 * Paginate data
 */
export function paginateData<T>(data: T[], pagination: PaginationConfig): SearchResult<T> {
  const { page, pageSize } = pagination;
  const total = data.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = data.slice(start, end);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Advanced search hook
 */
export function useAdvancedSearch<T extends object>(
  data: T[],
  options: {
    defaultSort?: SortConfig;
    defaultPageSize?: number;
    searchOptions?: SearchOptions;
    debounceMs?: number;
  } = {}
) {
  const { defaultSort, defaultPageSize = 20, searchOptions, debounceMs = 300 } = options;

  // State
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [sort, setSort] = useState<SortConfig>(
    defaultSort || { field: '', direction: 'asc' }
  );
  const [pagination, setPagination] = useState<PaginationConfig>({
    page: 1,
    pageSize: defaultPageSize,
  });

  // Debounced query
  const debouncedQuery = useDebounce(query, debounceMs);

  // Search, filter, sort, and paginate
  const result = useMemo(() => {
    logger.debug('[Search] Processing search:', {
      query: debouncedQuery,
      filters: filters.length,
      sort,
      page: pagination.page,
    });

    let processed = data;

    // 1. Search
    if (debouncedQuery) {
      processed = searchData(processed, debouncedQuery, searchOptions);
    }

    // 2. Filter
    if (filters.length > 0) {
      processed = filterData(processed, filters);
    }

    // 3. Sort
    if (sort.field) {
      processed = sortData(processed, sort);
    }

    // 4. Paginate
    return paginateData(processed, pagination);
  }, [data, debouncedQuery, filters, sort, pagination, searchOptions]);

  // Actions
  const setPage = useCallback((page: number) => {
    setPagination((prev: PaginationConfig) => ({ ...prev, page }));
  }, []);

  const nextPage = useCallback(() => {
    setPagination((prev: PaginationConfig) => ({ ...prev, page: prev.page + 1 }));
  }, []);

  const prevPage = useCallback(() => {
    setPagination((prev: PaginationConfig) => ({ ...prev, page: Math.max(1, prev.page - 1) }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setPagination({ page: 1, pageSize });
  }, []);

  const addFilter = useCallback((condition: FilterCondition) => {
    setFilters((prev: FilterCondition[]) => [...prev, condition]);
    setPagination((prev: PaginationConfig) => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const removeFilter = useCallback((index: number) => {
    setFilters((prev: FilterCondition[]) => prev.filter((_, i) => i !== index));
    setPagination((prev: PaginationConfig) => ({ ...prev, page: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const setSearchQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setPagination((prev: PaginationConfig) => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setPagination((prev: PaginationConfig) => ({ ...prev, page: 1 }));
  }, []);

  const reset = useCallback(() => {
    setQuery('');
    setFilters([]);
    setSort(defaultSort || { field: '', direction: 'asc' });
    setPagination({ page: 1, pageSize: defaultPageSize });
  }, [defaultSort, defaultPageSize]);

  return {
    // State
    query,
    filters,
    sort,
    pagination,
    result,

    // Actions
    setQuery: setSearchQuery,
    clearSearch,
    addFilter,
    removeFilter,
    clearFilters,
    setSort,
    setPage,
    nextPage,
    prevPage,
    setPageSize,
    reset,
  };
}

/**
 * Search history manager
 */
class SearchHistoryManager {
  private storageKey = 'search_history';
  private maxHistory = 50;

  /**
   * Get search history
   */
  getHistory(): string[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      logger.error('[SearchHistory] Failed to load history:', error);
      return [];
    }
  }

  /**
   * Add to history
   */
  addToHistory(query: string): void {
    if (!query.trim()) return;

    try {
      const history = this.getHistory();
      const filtered = history.filter((q) => q !== query);
      const updated = [query, ...filtered].slice(0, this.maxHistory);
      localStorage.setItem(this.storageKey, JSON.stringify(updated));
    } catch (error) {
      logger.error('[SearchHistory] Failed to save history:', error);
    }
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      logger.error('[SearchHistory] Failed to clear history:', error);
    }
  }
}

export const searchHistory = new SearchHistoryManager();

/**
 * Use search history hook
 */
export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    setHistory(searchHistory.getHistory());
  }, []);

  const addToHistory = useCallback((query: string) => {
    searchHistory.addToHistory(query);
    setHistory(searchHistory.getHistory());
  }, []);

  const clearHistory = useCallback(() => {
    searchHistory.clearHistory();
    setHistory([]);
  }, []);

  return {
    history,
    addToHistory,
    clearHistory,
  };
}

/**
 * Building-specific search helpers
 */
export interface BuildingSearchFilters {
  query?: string;
  country?: string;
  city?: string;
  minHeight?: number;
  maxHeight?: number;
  minFloors?: number;
  maxFloors?: number;
  hasModel?: boolean;
}

/**
 * Convert building filters to filter conditions
 */
export function buildingFiltersToConditions(filters: BuildingSearchFilters): FilterCondition[] {
  const conditions: FilterCondition[] = [];

  if (filters.country) {
    conditions.push({
      field: 'properties.country',
      operator: 'equals',
      value: filters.country,
    });
  }

  if (filters.city) {
    conditions.push({
      field: 'properties.city',
      operator: 'equals',
      value: filters.city,
    });
  }

  if (filters.minHeight !== undefined) {
    conditions.push({
      field: 'properties.height',
      operator: 'greaterThanOrEqual',
      value: filters.minHeight,
    });
  }

  if (filters.maxHeight !== undefined) {
    conditions.push({
      field: 'properties.height',
      operator: 'lessThanOrEqual',
      value: filters.maxHeight,
    });
  }

  if (filters.minFloors !== undefined) {
    conditions.push({
      field: 'properties.floorCount',
      operator: 'greaterThanOrEqual',
      value: filters.minFloors,
    });
  }

  if (filters.maxFloors !== undefined) {
    conditions.push({
      field: 'properties.floorCount',
      operator: 'lessThanOrEqual',
      value: filters.maxFloors,
    });
  }

  if (filters.hasModel !== undefined) {
    conditions.push({
      field: 'properties.modelUrl',
      operator: filters.hasModel ? 'notEquals' : 'equals',
      value: null,
    });
  }

  return conditions;
}
