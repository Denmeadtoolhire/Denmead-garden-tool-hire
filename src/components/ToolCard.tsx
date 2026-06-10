import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Calendar, Package } from 'lucide-react';
import type { Tool } from '@/lib/supabase';

interface ToolCardProps {
  tool: Tool;
  categoryName?: string;
}

const ToolCard = ({ tool, categoryName }: ToolCardProps) => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-100">
      {tool.image_url ? (
        <img
          src={tool.image_url}
          alt={tool.name}
          className="w-full h-48 object-contain bg-white p-3"
        />
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-brand-green to-brand-green-light flex items-center justify-center">
          <Package size={64} className="text-white opacity-50" />
        </div>
      )}

      <div className="p-5">
        {categoryName && (
          <span className="text-xs font-semibold text-brand-green bg-green-50 px-2 py-1 rounded-full">
            {categoryName}
          </span>
        )}

        <h3 className="text-lg font-bold text-gray-900 mt-2 mb-1">{tool.name}</h3>

        {tool.description && (
          <p className="text-gray-600 text-sm mb-3">{tool.description}</p>
        )}

        <div className="flex gap-3 mb-4">
          <div className="flex items-center gap-1 text-sm text-gray-700">
            <Clock size={14} className="text-brand-green" />
            <span>
              <span className="font-semibold">£{Number(tool.price_4hr).toFixed(2)}</span>
              <span className="text-gray-500"> / 4hr</span>
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-700">
            <Calendar size={14} className="text-brand-green" />
            <span>
              <span className="font-semibold">£{Number(tool.price_1day).toFixed(2)}</span>
              <span className="text-gray-500"> / day</span>
            </span>
          </div>
        </div>

        {tool.is_available ? (
          <Link
            to={`/tools/${tool.id}`}
            className="block w-full text-center bg-brand-green text-white font-semibold py-2 px-4 rounded-lg hover:bg-brand-green-dark transition-colors"
          >
            Book Now
          </Link>
        ) : (
          <button
            disabled
            className="block w-full text-center bg-gray-200 text-gray-500 font-semibold py-2 px-4 rounded-lg cursor-not-allowed"
          >
            Unavailable
          </button>
        )}
      </div>
    </div>
  );
};

export default ToolCard;
