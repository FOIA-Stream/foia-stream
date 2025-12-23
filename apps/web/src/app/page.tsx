import { Clock, FileText, Search, Shield } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-slate-900">FOIA Stream</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-slate-600 hover:text-slate-900 transition-colors">
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-slate-900 mb-6">Streamline Your FOIA Requests</h1>
          <p className="text-xl text-slate-600 mb-8">
            A secure, compliant platform for managing Freedom of Information Act requests with
            confidence. Track, manage, and submit requests to federal agencies efficiently.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/register"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Start Free Trial
            </Link>
            <Link
              href="/docs"
              className="border border-slate-300 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              View Documentation
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <FeatureCard
            icon={<Shield className="h-10 w-10 text-blue-600" />}
            title="SOC 2 Compliant"
            description="Built with security-first architecture. Full audit trails, encryption at rest, and role-based access control."
          />
          <FeatureCard
            icon={<Clock className="h-10 w-10 text-blue-600" />}
            title="Automated Tracking"
            description="Never miss a deadline. Automatic status updates and intelligent reminders keep your requests on track."
          />
          <FeatureCard
            icon={<Search className="h-10 w-10 text-blue-600" />}
            title="Agency Database"
            description="Pre-populated database of federal agencies with FOIA contact information and submission requirements."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-24">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-slate-400" />
              <span className="text-slate-600">FOIA Stream</span>
            </div>
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} FOIA Stream. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600">{description}</p>
    </div>
  );
}
