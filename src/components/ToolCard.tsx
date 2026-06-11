import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Calendar, Package, ArrowRight } from 'lucide-react';
import type { Tool } from '@/lib/supabase';

interface ToolCardProps {
  tool: Tool;
  categoryName?: string;
}

const ToolCard = ({ tool, categoryName }: ToolCardProps) => {
  return (
    <div className="card-hover bg-white rounded-2xl shadow-md hover:shadow-xl overflow-hidden border border-gray-100 flex flex-col">
      {/* Image */}
      <div className="relative">
        {tool.image_url ? (
          <img
            src={tool.image_url}
            alt={tool.name}
            className="w-full h-52 object-contain bg-white p-4"
          />
        ) : (
          <div className="w-full h-52 bg-gradient-to-br from-brand-green to-brand-green-light flex items-center justify-center">
            <Package size={64} className="text-white opacity-40" />
          </div>
        )}
        {categoryName && (
          <span className="absolute top-3 left-3 text-xs font-semibold text-white bg-brand-green px-2.5 py-1 rounded-full shadow-sm">
            {categoryName}
          </span>
        )}
        {!tool.is_available && (
          <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
            <span className="bg-white text-gray-700 font-bold text-sm px-4 py-2 rounded-full">
              Currently Unavailable
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-gray-900 mb-1 leading-snug">{tool.name}</h3>

        {tool.description && (
          <p className="text-gray-500 text-sm mb-4 line-clamp-3 leading-relaxed">{tool.description}</p>
        )}

        {/* Pricing badges */}
        <div className="flex gap-2 mb-4 mt-auto">
          <div className="flex items-center gap-1.5 bg-green-50 text-brand-green px-3 py-1.5 rounded-lg flex-1 justify-center">
            <Clock size={13} />
            <span className="text-xs font-semibold">4hr</span>
            <span className="text-sm font-bold">£{Number(tool.price_4hr).toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg flex-1 justify-center">
            <Calendar size={13} />
            <span className="text-xs font-semibold">Day</span>
            <span className="text-sm font-bold">£{Number(tool.price_1day).toFixed(2)}</span>
          </div>
        </div>

        {tool.is_available ? (
          <Link
            to={`/tools/${tool.id}`}
            className="flex items-center justify-center gap-2 w-full text-center bg-brand-green text-white font-bold py-2.5 px-4 rounded-xl hover:bg-brand-green-dark transition-colors"
          >
            Book Now
            <ArrowRight size={16} />
          </Link>
        ) : (
          <button
            disabled
            className="w-full text-center bg-gray-100 text-gray-400 font-semibold py-2.5 px-4 rounded-xl cursor-not-allowed"
          >
            Unavailable
          </button>
        )}
      </div>
    </div>
  );
};

export default ToolCard;
