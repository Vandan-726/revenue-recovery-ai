import { ArrowLeft, ShieldX } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] bg-background p-6">
      <div className="mx-auto flex min-h-[90dvh] max-w-lg flex-col items-center justify-center text-center">
        <div className="mb-6 grid size-16 place-items-center rounded-2xl bg-sidebar text-sidebar-primary">
          <ShieldX size={28} />
        </div>
        <p className="eyebrow text-primary">Signal lost · 404</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">This view isn’t on the map.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">The route you entered doesn’t match any recovery workspace view.</p>
        <Link href="/dashboard" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-primary-foreground shadow-[0_5px_0_hsl(165_73%_22%)]" data-testid="link-return-dashboard">
          <ArrowLeft size={15} /> Return to overview
        </Link>
      </div>
    </div>
  );
}
