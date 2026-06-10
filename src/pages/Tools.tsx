import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tool, Category } from '@/lib/supabase';
import ToolCard from '@/components/ToolCard';
import { Search, SlidersHorizontal } from 'lucide-react';

type ToolWithCategory = Tool & { categories: Category | null };

const ToolsPage = () => {
  const [tools, setTools] = useState<ToolWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('');

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand-green text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Hire Tools</h1>
          <p className="text-green-200">Browse our full range and book online in minutes.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          <div className="relative">
            <SlidersHorizontal
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-green appearance-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading tools...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">No tools found.</p>
            <p className="text-sm mt-1">Try clearing the search or category filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                categoryName={tool.categories?.name}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolsPage;
