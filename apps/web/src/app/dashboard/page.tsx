'use client';

import { useAuth } from '@/lib/auth';
import { useRequests } from '@/lib/hooks';
import { Building2, Clock, FileText, Loader2, LogOut, Plus, RefreshCw, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function getStatusColor(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-slate-100 text-slate-700';
    case 'submitted':
      return 'bg-blue-100 text-blue-700';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700';
    case 'processing':
      return 'bg-purple-100 text-purple-700';
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'rejected':
      return 'bg-red-100 text-red-700';
    case 'appealed':
      return 'bg-orange-100 text-orange-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { data: requestsData, isLoading: requestsLoading, refetch } = useRequests();

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

  if (!isAuthenticated || !user) {
    return null;
  }

  const requests = requestsData?.data ?? [];

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-slate-900">FOIA Stream</span>
            </Link>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <User className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                type="button"
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Welcome back!</h1>
          <p className="text-slate-600">Manage your FOIA requests and track their progress.</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{requests.length}</p>
                <p className="text-sm text-slate-600">Total Requests</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {
                    requests.filter((r) => r.status === 'pending' || r.status === 'processing')
                      .length
                  }
                </p>
                <p className="text-sm text-slate-600">In Progress</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {requests.filter((r) => r.status === 'completed').length}
                </p>
                <p className="text-sm text-slate-600">Completed</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Building2 className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {new Set(requests.map((r) => r.agencyId)).size}
                </p>
                <p className="text-sm text-slate-600">Agencies</p>
              </div>
            </div>
          </div>
        </div>

        {/* Requests section */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900">Your Requests</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                type="button"
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <Link
                href="/requests/new"
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                New Request
              </Link>
            </div>
          </div>

          {requestsLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No requests yet</h3>
              <p className="text-slate-600 mb-4">Create your first FOIA request to get started.</p>
              <Link
                href="/requests/new"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Create Request
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {requests.map((request) => (
                <Link
                  key={request.id}
                  href={`/requests/${request.id}`}
                  className="block px-6 py-4 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-slate-900 truncate">
                        {request.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                        {request.description}
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                        <span>Created {formatDate(request.createdAt)}</span>
                        {request.trackingNumber && <span>Tracking: {request.trackingNumber}</span>}
                      </div>
                    </div>
                    <span
                      className={`ml-4 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}
                    >
                      {request.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
