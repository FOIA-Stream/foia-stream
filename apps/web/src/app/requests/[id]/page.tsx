'use client';

import { useAuth } from '@/lib/auth';
import { useRequest } from '@/lib/hooks';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  FileText,
  Hash,
  Loader2,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

function getStatusColor(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'submitted':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'processing':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'completed':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'appealed':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function RequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const requestId = params.id as string;
  const { data: request, isLoading: requestLoading, error } = useRequest(requestId);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || requestLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16 gap-4">
              <Link
                href="/dashboard"
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <span className="text-lg font-semibold text-slate-900">Request Not Found</span>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Request not found</h3>
            <p className="text-slate-600 mb-4">
              The request you're looking for doesn't exist or you don't have access to it.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-600" />
                <span className="text-lg font-semibold text-slate-900">Request Details</span>
              </div>
            </div>

            {request.status === 'draft' && (
              <Link
                href={`/requests/${requestId}/edit`}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Status and title */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-slate-900">{request.title}</h1>
                {request.trackingNumber && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                    <Hash className="h-4 w-4" />
                    <span>Tracking: {request.trackingNumber}</span>
                  </div>
                )}
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(request.status)}`}
              >
                {request.status}
              </span>
            </div>

            <p className="text-slate-600 whitespace-pre-wrap">{request.description}</p>
          </div>

          {/* Request metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Agency info */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-slate-400" />
                Agency
              </h2>
              {request.agency ? (
                <div className="space-y-2">
                  <p className="font-medium text-slate-900">{request.agency.name}</p>
                  {request.agency.abbreviation && (
                    <p className="text-sm text-slate-600">({request.agency.abbreviation})</p>
                  )}
                  {request.agency.foiaEmail && (
                    <p className="text-sm text-slate-600">{request.agency.foiaEmail}</p>
                  )}
                </div>
              ) : (
                <p className="text-slate-600">Agency ID: {request.agencyId}</p>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-400" />
                Timeline
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Created</span>
                  <span className="text-slate-900">{formatDateTime(request.createdAt)}</span>
                </div>
                {request.submittedAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Submitted</span>
                    <span className="text-slate-900">{formatDateTime(request.submittedAt)}</span>
                  </div>
                )}
                {request.acknowledgedAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Acknowledged</span>
                    <span className="text-slate-900">{formatDateTime(request.acknowledgedAt)}</span>
                  </div>
                )}
                {request.dueDate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Due Date</span>
                    <span className="text-slate-900 font-medium">
                      {formatDate(request.dueDate)}
                    </span>
                  </div>
                )}
                {request.closedAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Closed</span>
                    <span className="text-slate-900">{formatDateTime(request.closedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional details */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Additional Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-1">Category</h3>
                <p className="text-slate-900 capitalize">{request.category}</p>
              </div>

              {request.dateRange && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Date Range
                  </h3>
                  <p className="text-slate-900">{request.dateRange}</p>
                </div>
              )}

              {request.specificIndividuals && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Specific Individuals
                  </h3>
                  <p className="text-slate-900">{request.specificIndividuals}</p>
                </div>
              )}
            </div>
          </div>

          {/* Options/Flags */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Request Options</h2>
            <div className="flex flex-wrap gap-4">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                  request.expeditedProcessing
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Expedited Processing: {request.expeditedProcessing ? 'Yes' : 'No'}</span>
              </div>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                  request.feeWaiverRequested
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  Fee Waiver: {request.feeWaiverRequested ? 'Requested' : 'Not Requested'}
                </span>
              </div>
            </div>

            {/* Fee information */}
            {(request.estimatedFee != null || request.actualFee != null) && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <h3 className="text-sm font-medium text-slate-500 mb-2">Fee Information</h3>
                <div className="flex gap-6">
                  {request.estimatedFee != null && (
                    <div>
                      <span className="text-sm text-slate-600">Estimated: </span>
                      <span className="font-medium text-slate-900">
                        ${request.estimatedFee.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {request.actualFee != null && (
                    <div>
                      <span className="text-sm text-slate-600">Actual: </span>
                      <span className="font-medium text-slate-900">
                        ${request.actualFee.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
