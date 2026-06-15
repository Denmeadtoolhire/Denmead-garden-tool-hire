import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { Tool } from '@/lib/supabase';

export interface CartItem {
  tool: Tool;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  hireType: '4hr' | '1day';
}

type CartAction =
  | { type: 'ADD_ITEM'; tool: Tool; quantity?: number }
  | { type: 'REMOVE_ITEM'; toolId: string }
  | { type: 'UPDATE_QUANTITY'; toolId: string; quantity: number }
  | { type: 'SET_HIRE_TYPE'; hireType: '4hr' | '1day' }
  | { type: 'CLEAR_CART' };

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.tool.id === action.tool.id);
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.tool.id === action.tool.id
              ? { ...item, quantity: item.quantity + (action.quantity || 1) }
              : item
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { tool: action.tool, quantity: action.quantity || 1 }],
      };
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.tool.id !== action.toolId),
      };
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item =>
          item.tool.id === action.toolId
            ? { ...item, quantity: Math.max(1, action.quantity) }
            : item
        ),
      };
    case 'SET_HIRE_TYPE':
      return { ...state, hireType: action.hireType };
    case 'CLEAR_CART':
      return { items: [], hireType: '4hr' };
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], hireType: '4hr' });

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
