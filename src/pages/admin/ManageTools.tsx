import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import type { Tool, Category } from '@/lib/supabase';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';

type ToolWithCat = Tool & { categories: Category | null };

const emptyForm = {
  name: '',
  description: '',
  category_id: '',
  image_url: '',
  quantity: 1,
  price_4hr: 0,
  price_1day: 0,
  is_available: true,
};

const ManageTools = () => {
  const [tools, setTools] = useState<ToolWithCat[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [toolsRes, catsRes] = await Promise.all([
      supabase.from('tools').select('*, categories(*)').order('name'),
      supabase.from('categories').select('*').order('sort_order'),
    ]);
    setTools((toolsRes.data as ToolWithCat[]) ?? []);
    setCategories(catsRes.data ?? []);
    setLoading(false);
  };

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (tool: ToolWithCat) => {
    setEditId(tool.id);
    setForm({
      name: tool.name,
      description: tool.description ?? '',
      category_id: tool.category_id ?? '',
      image_url: tool.image_url ?? '',
      quantity: tool.quantity,
      price_4hr: Number(tool.price_4hr),
      price_1day: Number(tool.price_1day),
      is_available: tool.is_available,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category_id: form.category_id || null,
      image_url: form.image_url.trim() || null,
      quantity: form.quantity,
      price_4hr: form.price_4hr,
      price_1day: form.price_1day,
      is_available: form.is_available,
    };

    if (editId) {
      await supabase.from('tools').update(payload).eq('id', editId);
    } else {
      await supabase.from('tools').insert(payload);
    }

    await loadData();
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('tools').delete().eq('id', id);
    await loadData();
    setDeleteId(null);
  };

  const field = (key: keyof typeof form, val: typeof form[keyof typeof form]) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Tools</h1>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-brand-green text-white font-semibold px-4 py-2 rounded-lg hover:bg-brand-green-dark transition-colors"
          >
            <Plus size={18} />
            Add Tool
          </button>
        </div>

        {/* Form modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-screen overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between p-5 border-b">
                <h2 className="font-bold text-lg">{editId ? 'Edit Tool' : 'Add New Tool'}</h2>
                <button onClick={() => setShowForm(false)}>
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => field('name', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => field('description', e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => field('category_id', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
                  >
                    <option value="">No category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <input
                    type="url"
                    value={form.image_url}
                    onChange={(e) => field('image_url', e.target.value)}
                    placeholder="https://..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={form.quantity}
                      onChange={(e) => field('quantity', parseInt(e.target.value) || 1)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">4hr Price (£)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.price_4hr}
                      onChange={(e) => field('price_4hr', parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Day Price (£)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.price_1day}
                      onChange={(e) => field('price_1day', parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-green"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => field('is_available', !form.is_available)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.is_available ? 'bg-brand-green' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.is_available ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-gray-700">Available for hire</span>
                </div>
              </div>

              <div className="flex gap-3 p-5 border-t">
                <button
                  onClick={handleSave}
                  disabled={!form.name || saving}
                  className="flex-1 bg-brand-green text-white font-semibold py-2.5 rounded-lg hover:bg-brand-green-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  {saving ? 'Saving...' : 'Save Tool'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {deleteId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full">
              <h3 className="font-bold text-lg mb-2">Delete Tool?</h3>
              <p className="text-gray-600 text-sm mb-5">
                This will permanently delete the tool and cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="flex-1 bg-red-600 text-white font-semibold py-2.5 rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 border border-gray-200 py-2.5 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tools table */}
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Tool</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">
                    4hr
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">
                    Day
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">
                    Qty
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tools.map((tool) => (
                  <tr key={tool.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{tool.name}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      {tool.categories?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700 hidden md:table-cell">
                      £{Number(tool.price_4hr).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 hidden md:table-cell">
                      £{Number(tool.price_1day).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{tool.quantity}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          tool.is_available
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {tool.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => openEdit(tool)}
                          className="p-1.5 text-gray-400 hover:text-brand-green transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteId(tool.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {tools.length === 0 && (
              <div className="px-5 py-10 text-center text-gray-500">
                No tools yet. Add your first tool above.
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ManageTools;
