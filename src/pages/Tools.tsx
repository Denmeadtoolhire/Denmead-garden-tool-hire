import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tool, Category } from '@/lib/supabase';
import ToolCard from '@/components/ToolCard';
import FloatingCartButton from '@/components/FloatingCartButton';
import { Search, SlidersHorizontal, Package } from 'lucide-react';

type ToolWithCategory = Tool & { categories: Category | null };

const ToolsPage = () => {
  const [tools, setTools] = useState<ToolWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('');

  // Define category order
  const categoryOrder = ['DIY', 'Garden', 'Home Tools'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [toolsRes, catsRes] = await Promise.all([
      supabase
        .from('tools')
        .select('*, categories(*)')
        .eq('is_available', true)
        .order('name'),
      supabase.from('categories').select('*').order('sort_order'),
    ]);

    setTools((toolsRes.data as ToolWithCategory[]) ?? []);
    setCategories(catsRes.data ?? []);
    setLoading(false);
  };

  const filtered = tools.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesCat = !selectedCat || t.category_id === selectedCat;
    return matchesSearch && matchesCat;
  });

  // Group tools by category and sort by category order
  const groupedTools = categories
    .sort((a, b) => categoryOrder.indexOf(a.name) - categoryOrder.indexOf(b.name))
    .map((cat) => ({
      category: cat,
      tools: filtered.filter((t) => t.category_id === cat.id),
    }))
    .filter((group) => group.tools.length > 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero banner */}
      <div className="bg-brand-green text-white py-16 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, #fff 0px, #fff 1px, transparent 1px, transparent 12px)',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4">
          <h1 className="text-4xl font-extrabold mb-2 tracking-tight">Hire Our Tools</h1>
          <p className="text-green-200 text-lg">
            Browse our full range and book online in minutes.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Search & filter card */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tools..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green text-sm"
              />
            </div>
            <div className="relative">
              <SlidersHorizontal
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="pl-9 pr-8 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-green appearance-none text-sm font-medium text-gray-700 min-w-[180px]"
              >
                <option value="">All Categories</option>
                {categories
                  .sort((a, b) => categoryOrder.indexOf(a.name) - categoryOrder.indexOf(b.name))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-gray-500 mb-6 font-medium">
            {filtered.length === 0
              ? 'No tools found'
              : `Showing ${filtered.length} tool${filtered.length !== 1 ? 's' : ''}`}
            {selectedCat && categories.find((c) => c.id === selectedCat)
              ? ` in ${categories.find((c) => c.id === selectedCat)?.name}`
              : ''}
            {search ? ` matching "${search}"` : ''}
          </p>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <div className="w-10 h-10 border-4 border-brand-green border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium">Loading tools...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-5">
              <Package size={36} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No tools found</h3>
            <p className="text-gray-400 text-sm max-w-sm">
              Try clearing the search term or selecting a different category.
            </p>
            {(search || selectedCat) && (
              <button
                onClick={() => { setSearch(''); setSelectedCat(''); }}
                className="mt-5 text-sm font-semibold text-brand-green hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            {groupedTools.map((group) => (
              <div key={group.category.id}>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-brand-green">
                  {group.category.name}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.tools.map((tool) => (
                    <ToolCard
                      key={tool.id}
                      tool={tool}
                      categoryName={tool.categories?.name}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <FloatingCartButton />
    </div>
  );
};

export default ToolsPage;
