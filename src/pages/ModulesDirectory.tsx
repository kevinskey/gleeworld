import React, { useEffect, useMemo, useState } from 'react';
import { UNIFIED_MODULES, UNIFIED_MODULE_CATEGORIES } from '@/config/unified-modules';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

// Simple SEO helper
const useSEO = (title: string, description: string, canonical?: string) => {
  useEffect(() => {
    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', description);
    else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = description;
      document.head.appendChild(m);
    }
    const linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) {
      if (linkCanonical) linkCanonical.href = canonical; 
      else {
        const l = document.createElement('link');
        l.rel = 'canonical';
        l.href = canonical;
        document.head.appendChild(l);
      }
    }
  }, [title, description, canonical]);
};

// Heuristic to suggest redundancies: same component name or highly similar title keywords
const findRedundancies = () => {
  const suggestions: Record<string, string[]> = {};
  const byComponent: Record<string, string[]> = {};
  const byKeyword: Record<string, string[]> = {};

  for (const m of UNIFIED_MODULES) {
    const compName = (m as any).component?.name || 'UnknownComponent';
    byComponent[compName] = byComponent[compName] || [];
    byComponent[compName].push(m.id);

    const keyword = m.title.toLowerCase().split(' ')[0];
    byKeyword[keyword] = byKeyword[keyword] || [];
    byKeyword[keyword].push(m.id);
  }

  for (const [comp, ids] of Object.entries(byComponent)) {
    if (ids.length > 1 && comp !== 'UnknownComponent') {
      for (const id of ids) {
        suggestions[id] = Array.from(new Set([...(suggestions[id] || []), ...ids.filter(x => x !== id)]));
      }
    }
  }

  for (const [kw, ids] of Object.entries(byKeyword)) {
    if (ids.length > 1 && kw.length > 3) {
      for (const id of ids) {
        suggestions[id] = Array.from(new Set([...(suggestions[id] || []), ...ids.filter(x => x !== id)]));
      }
    }
  }

  return suggestions;
};

export const ModulesDirectory: React.FC = () => {
  useSEO('Modules Directory | GleeWorld', 'Explore all functional modules in GleeWorld. Open any module or propose cleanup of redundant modules. No deletions will occur without your approval.', `${window.location.origin}/modules`);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const isAdmin = !!(userProfile?.is_admin || userProfile?.is_super_admin || userProfile?.is_exec_board || userProfile?.role === 'admin' || userProfile?.role === 'super-admin');

  const [query, setQuery] = useState('');
  const suggestions = useMemo(() => findRedundancies(), []);

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return UNIFIED_MODULE_CATEGORIES;
    return UNIFIED_MODULE_CATEGORIES.map(cat => ({
      ...cat,
      modules: cat.modules.filter(m => [m.title, m.description, m.name, m.category].filter(Boolean).join(' ').toLowerCase().includes(q))
    })).filter(cat => cat.modules.length > 0);
  }, [query]);

  return (
    <div>
      <header className="w-full border-b border-border bg-background">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold tracking-tight">Modules Directory</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">Explore all functional modules in GleeWorld. Open any module or propose cleanup of redundant modules. No deletions will occur without your approval.</p>
          <div className="mt-4 max-w-md">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search modules by name, category, or description" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {filteredCategories.map(cat => (
          <section key={cat.id} className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {cat.icon && <cat.icon className="h-5 w-5 text-primary" />}
                <h2 className="text-xl font-semibold">{cat.title}</h2>
                <Badge variant="outline">{cat.modules.length}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{cat.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cat.modules.map(m => (
                <Card key={m.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      {m.icon && <m.icon className="h-5 w-5" />}
                      <CardTitle className="text-base font-semibold leading-tight">{m.title}</CardTitle>
                      {m.isNew && <Badge className="ml-1" variant="secondary">New</Badge>}
                    </div>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-xs">{m.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{m.description}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="default" onClick={() => navigate(`/dashboard?module=${encodeURIComponent(m.id)}`)}>Open</Button>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard?module=${encodeURIComponent(m.id)}`)}>Preview</Button>
                      {isAdmin && suggestions[m.id]?.length ? (
                        <Badge variant="destructive" className="ml-auto">Potentially redundant</Badge>
                      ) : null}
                    </div>
                    {isAdmin && suggestions[m.id]?.length ? (
                      <div className="mt-3 text-xs text-muted-foreground">
                        <div className="mb-1 font-medium">Similar modules detected:</div>
                        <ul className="list-disc list-inside">
                          {suggestions[m.id].slice(0, 4).map(sim => {
                            const mod = UNIFIED_MODULES.find(x => x.id === sim);
                            if (!mod) return null;
                            return <li key={sim}>{mod.title}</li>;
                          })}
                        </ul>
                        <div className="mt-2">
                          <Button size="sm" variant="secondary" onClick={() => {
                            // Emit event to open a confirmation flow elsewhere without deleting
                            window.dispatchEvent(new CustomEvent('propose-module-deletion', { detail: { target: m.id, similar: suggestions[m.id] } }));
                            alert(`Proposed cleanup for: ${m.title}. I’ll wait for your confirmation before removing anything.`);
                          }}>
                            Propose cleanup
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
};

export default ModulesDirectory;
