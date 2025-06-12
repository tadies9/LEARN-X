'use client';

import { Shield, Zap, ShieldCheck } from 'lucide-react';

export function CredibilityStrip() {
  return (
    <section className="bg-neutral-50 py-6">
      <div className="flex items-center justify-center gap-8 text-sm text-neutral-600">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" strokeWidth={2} />
          <span>FERPA compliant</span>
        </div>
        <span className="text-neutral-400">·</span>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" strokeWidth={2} />
          <span>Real-time answers</span>
        </div>
        <span className="text-neutral-400">·</span>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" strokeWidth={2} />
          <span>Source-cited responses</span>
        </div>
      </div>
    </section>
  );
}
