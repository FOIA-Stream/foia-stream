'use client';

import { useAuth } from '@/lib/auth';
import { useAgencies, useCreateRequest, useTemplates } from '@/lib/hooks';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const CATEGORIES = [
  { value: 'general', label: 'General Records' },
  { value: 'contracts', label: 'Contracts & Procurement' },
  { value: 'personnel', label: 'Personnel Records' },
  { value: 'financial', label: 'Financial Records' },
  { value: 'communications', label: 'Communications & Correspondence' },
  { value: 'policy', label: 'Policies & Procedures' },
  { value: 'legal', label: 'Legal Documents' },
  { value: 'environmental', label: 'Environmental Records' },
  { value: 'other', label: 'Other' },
];

export default function NewRequestPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: agenciesData, isLoading: agenciesLoading } = useAgencies({ limit: 1000 });
  const { data: templatesData } = useTemplates();
  const createRequest = useCreateRequest();

  const [formData, setFormData] = useState({
    agencyId: '',
    title: '',
    description: '',
    category: 'general',
    dateRange: '',
    specificIndividuals: '',
    expeditedProcessing: false,
    feeWaiverRequested: false,
  });
  const [error, setError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const agencies = agenciesData?.data ?? [];
  const templates = templatesData ?? [];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setFormData((prev) => ({
        ...prev,
        description: template.content || prev.description,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.agencyId) {
      setError('Please select an agency');
      return;
    }

    if (!formData.title.trim()) {
      setError('Please enter a request title');
      return;
    }

    if (!formData.description.trim()) {
      setError('Please enter a request description');
      return;
    }

    try {
      await createRequest.mutateAsync({
        agencyId: formData.agencyId,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        dateRange: formData.dateRange || undefined,
        specificIndividuals: formData.specificIndividuals || undefined,
        expeditedProcessing: formData.expeditedProcessing,
        feeWaiverRequested: formData.feeWaiverRequested,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create request');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Link
              href="/dashboard"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              <span className="text-lg font-semibold text-slate-900">New FOIA Request</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Agency selection */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Select Agency</h2>

            <div>
              <label htmlFor="agencyId" className="block text-sm font-medium text-slate-700 mb-1">
                Agency
              </label>
              {agenciesLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading agencies...
                </div>
              ) : (
                <select
                  id="agencyId"
                  name="agencyId"
                  value={formData.agencyId}
                  onChange={handleChange}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Select an agency...</option>
                  {agencies.map((agency) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.name} {agency.abbreviation && `(${agency.abbreviation})`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Request details */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Request Details</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                  Request Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Brief title describing your request"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {templates.length > 0 && (
                <div>
                  <label
                    htmlFor="template"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Use Template <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <select
                    id="template"
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">No template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Request Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={6}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe in detail the records you are requesting. Be as specific as possible to help the agency locate the records."
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="dateRange"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Date Range <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  id="dateRange"
                  name="dateRange"
                  value={formData.dateRange}
                  onChange={handleChange}
                  placeholder="e.g., January 2020 to December 2023"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="specificIndividuals"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Specific Individuals{' '}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  id="specificIndividuals"
                  name="specificIndividuals"
                  value={formData.specificIndividuals}
                  onChange={handleChange}
                  placeholder="Names of specific individuals related to the records"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Request Options</h2>

            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    id="expeditedProcessing"
                    name="expeditedProcessing"
                    checked={formData.expeditedProcessing}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3">
                  <label
                    htmlFor="expeditedProcessing"
                    className="text-sm font-medium text-slate-700"
                  >
                    Request Expedited Processing
                  </label>
                  <p className="text-sm text-slate-500">
                    You must demonstrate a compelling need for urgency. Additional justification may
                    be required.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    id="feeWaiverRequested"
                    name="feeWaiverRequested"
                    checked={formData.feeWaiverRequested}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3">
                  <label
                    htmlFor="feeWaiverRequested"
                    className="text-sm font-medium text-slate-700"
                  >
                    Request Fee Waiver
                  </label>
                  <p className="text-sm text-slate-500">
                    Fee waivers are typically granted when disclosure is in the public interest and
                    primarily benefits the public.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createRequest.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createRequest.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Request'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
