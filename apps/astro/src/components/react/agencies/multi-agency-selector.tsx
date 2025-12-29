/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Multi-agency selection component for bulk FOIA requests
 * @module components/react/agencies/MultiAgencySelector
 */

import type { Agency } from '@/lib/api';
import {
  Building2,
  Check,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Loader2,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Props for the MultiAgencySelector component
 */
interface MultiAgencySelectorProps {
  agencies: Agency[];
  selectedAgencies: Agency[];
  onSelectionChange: (agencies: Agency[]) => void;
  loading?: boolean;
  placeholder?: string;
  maxSelection?: number;
}

/**
 * Converts a wildcard pattern to a regex
 */
function patternToRegex(pattern: string): RegExp {
  let escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  escaped = escaped.replace(/\*/g, '.*');
  escaped = escaped.replace(/\?/g, '.');

  if (!pattern.includes('*') && !pattern.includes('?')) {
    escaped = `.*${escaped}.*`;
  }

  return new RegExp(escaped, 'i');
}

/**
 * Highlights matched portions of text
 */
function highlightMatch(text: string, pattern: string): React.ReactNode {
  if (!pattern.trim()) return text;

  const searchTerms = pattern.replace(/[*?]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (searchTerms.length === 0) return text;

  const regex = new RegExp(
    `(${searchTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi',
  );
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = searchTerms.some((term) => part.toLowerCase() === term.toLowerCase());
        const key = `${part}-${i}`;
        return isMatch ? (
          <mark key={key} className="bg-accent-500/30 text-accent-300 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={key}>{part}</span>
        );
      })}
    </>
  );
}

/** Labels for jurisdiction levels */
const JURISDICTION_LABELS: Record<string, string> = {
  federal: 'Federal',
  state: 'State',
  local: 'Local',
  county: 'County',
};

/** Color classes for jurisdiction badges */
const JURISDICTION_COLORS: Record<string, string> = {
  federal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  state: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  local: 'bg-green-500/20 text-green-400 border-green-500/30',
  county: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

/**
 * Multi-select dropdown for selecting multiple government agencies
 *
 * @component
 * @param {MultiAgencySelectorProps} props - Component props
 * @returns {React.JSX.Element} Multi-agency selector component
 */
export default function MultiAgencySelector({
  agencies,
  selectedAgencies,
  onSelectionChange,
  loading = false,
  placeholder = 'Search and select agencies...',
  maxSelection = 20,
}: MultiAgencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    federal: true,
    state: true,
    local: true,
    county: true,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedIds = useMemo(() => new Set(selectedAgencies.map((a) => a.id)), [selectedAgencies]);

  const toggleSection = (jurisdiction: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [jurisdiction]: !prev[jurisdiction],
    }));
  };

  const expandAll = () => {
    setExpandedSections({ federal: true, state: true, local: true, county: true });
  };

  const collapseAll = () => {
    setExpandedSections({ federal: false, state: false, local: false, county: false });
  };

  const allExpanded = Object.values(expandedSections).every(Boolean);
  const allCollapsed = Object.values(expandedSections).every((v) => !v);

  const filteredAgencies = useMemo(() => {
    if (!searchQuery.trim()) return agencies;

    const terms = searchQuery
      .trim()
      .split(/\s+/)
      .filter((t) => !['', '*'].includes(t));
    if (terms.length === 0) return agencies;

    return agencies.filter((agency) => {
      const searchableText = [
        agency.name,
        agency.abbreviation,
        agency.state,
        agency.city,
        agency.county,
        agency.jurisdictionLevel,
      ]
        .filter(Boolean)
        .join(' ');

      return terms.every((term) => {
        const regex = patternToRegex(term);
        return regex.test(searchableText);
      });
    });
  }, [agencies, searchQuery]);

  const groupedAgencies = useMemo(() => {
    const groups: Record<string, Agency[]> = {
      federal: [],
      state: [],
      county: [],
      local: [],
    };

    for (const agency of filteredAgencies) {
      groups[agency.jurisdictionLevel]?.push(agency);
    }

    return groups;
  }, [filteredAgencies]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleAgency = (agency: Agency) => {
    if (selectedIds.has(agency.id)) {
      onSelectionChange(selectedAgencies.filter((a) => a.id !== agency.id));
    } else if (selectedAgencies.length < maxSelection) {
      onSelectionChange([...selectedAgencies, agency]);
    }
  };

  const handleRemoveAgency = (agencyId: string) => {
    onSelectionChange(selectedAgencies.filter((a) => a.id !== agencyId));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected agencies chips */}
      {selectedAgencies.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedAgencies.map((agency) => (
            <span
              key={agency.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface-600 bg-surface-800 px-3 py-1.5 text-sm text-surface-200"
            >
              <Building2 className="h-3.5 w-3.5 text-accent-400" />
              {agency.abbreviation || agency.name.slice(0, 20)}
              <button
                type="button"
                onClick={() => handleRemoveAgency(agency.id)}
                className="ml-1 rounded p-0.5 text-surface-400 hover:bg-surface-700 hover:text-surface-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={handleClearAll}
            className="text-sm text-surface-400 hover:text-surface-200"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-500" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="block w-full rounded-lg border border-surface-700 bg-surface-800 py-3 pl-12 pr-20 text-surface-100 placeholder-surface-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
        <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2">
          {selectedAgencies.length > 0 && (
            <span className="rounded-full bg-accent-500 px-2 py-0.5 text-xs font-medium text-surface-950">
              {selectedAgencies.length}
            </span>
          )}
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-surface-500" />
          ) : (
            <ChevronDown
              className={`h-5 w-5 text-surface-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 max-h-80 w-full overflow-hidden rounded-xl border border-surface-700 bg-surface-900 shadow-xl">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-surface-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading agencies...
            </div>
          ) : filteredAgencies.length === 0 ? (
            <div className="py-8 text-center text-surface-400">
              <Search className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No agencies found</p>
              <p className="mt-1 text-sm text-surface-500">
                Try a different search term or use * as wildcard
              </p>
            </div>
          ) : (
            <>
              {/* Header with expand/collapse and selection info */}
              <div className="flex items-center justify-between border-b border-surface-700 bg-surface-800/50 px-4 py-2">
                <span className="text-xs text-surface-400">
                  {filteredAgencies.length} agencies • {selectedAgencies.length}/{maxSelection}{' '}
                  selected
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={expandAll}
                    disabled={allExpanded}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-surface-400 transition-colors hover:bg-surface-700 hover:text-surface-200 disabled:opacity-40"
                    title="Expand all sections"
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                    <span>Expand</span>
                  </button>
                  <button
                    type="button"
                    onClick={collapseAll}
                    disabled={allCollapsed}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-surface-400 transition-colors hover:bg-surface-700 hover:text-surface-200 disabled:opacity-40"
                    title="Collapse all sections"
                  >
                    <ChevronsDownUp className="h-3.5 w-3.5" />
                    <span>Collapse</span>
                  </button>
                </div>
              </div>

              {/* Agency list */}
              <div className="max-h-64 overflow-y-auto">
                {Object.entries(groupedAgencies).map(([jurisdiction, list]) => {
                  if (list.length === 0) return null;
                  const isExpanded = expandedSections[jurisdiction];

                  return (
                    <div key={jurisdiction}>
                      <button
                        type="button"
                        onClick={() => toggleSection(jurisdiction)}
                        className="sticky top-0 z-10 flex w-full items-center justify-between border-b border-surface-700 bg-surface-800/95 px-4 py-2.5 text-left backdrop-blur-sm transition-colors hover:bg-surface-700/50"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={`h-4 w-4 text-surface-500 transition-transform ${!isExpanded ? '-rotate-90' : ''}`}
                          />
                          <span className="text-xs font-semibold uppercase tracking-wider text-surface-300">
                            {JURISDICTION_LABELS[jurisdiction]}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${JURISDICTION_COLORS[jurisdiction]}`}
                          >
                            {list.length}
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="bg-surface-900/50">
                          {list.map((agency) => {
                            const isSelected = selectedIds.has(agency.id);
                            const isDisabled =
                              !isSelected && selectedAgencies.length >= maxSelection;

                            return (
                              <button
                                key={agency.id}
                                type="button"
                                onClick={() => handleToggleAgency(agency)}
                                disabled={isDisabled}
                                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                                  isSelected
                                    ? 'bg-accent-500/10'
                                    : isDisabled
                                      ? 'opacity-50 cursor-not-allowed'
                                      : 'hover:bg-surface-800/50'
                                }`}
                              >
                                {/* Checkbox */}
                                <div
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                                    isSelected
                                      ? 'border-accent-500 bg-accent-500'
                                      : 'border-surface-600 bg-surface-800'
                                  }`}
                                >
                                  {isSelected && <Check className="h-3.5 w-3.5 text-surface-950" />}
                                </div>

                                <Building2 className="h-5 w-5 shrink-0 text-surface-500" />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-surface-100">
                                    {highlightMatch(agency.name, searchQuery)}
                                    {agency.abbreviation && (
                                      <span className="ml-1 text-surface-400">
                                        ({highlightMatch(agency.abbreviation, searchQuery)})
                                      </span>
                                    )}
                                  </div>
                                  {(agency.state || agency.city) && (
                                    <div className="flex items-center gap-1 text-sm text-surface-500">
                                      <MapPin className="h-3 w-3" />
                                      {highlightMatch(
                                        [agency.city, agency.state].filter(Boolean).join(', '),
                                        searchQuery,
                                      )}
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Footer tips */}
          {filteredAgencies.length > 0 && (
            <div className="border-t border-surface-700 bg-surface-800/50 px-4 py-2 text-xs text-surface-500">
              <span className="font-medium text-surface-400">Tips:</span>{' '}
              <code className="rounded bg-surface-700 px-1">FBI</code> exact match •{' '}
              <code className="rounded bg-surface-700 px-1">*police*</code> wildcard • Select up to{' '}
              {maxSelection} agencies
            </div>
          )}
        </div>
      )}
    </div>
  );
}
