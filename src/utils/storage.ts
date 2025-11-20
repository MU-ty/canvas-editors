import type { CanvasState } from '../types';

const STORAGE_KEY = 'canvas-editor-state';

// 保存画布状态到 localStorage
export const saveCanvasState = (state: CanvasState): void => {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save canvas state:', error);
  }
};

// 从 localStorage 加载画布状态
export const loadCanvasState = (): CanvasState | null => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (serialized === null) {
      return null;
    }
    const state = JSON.parse(serialized);
    
    // 验证数据结构
    if (!state || typeof state !== 'object') {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    // 验证必须字段
    if (!Array.isArray(state.elements) || !state.viewport) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    // 验证每个元素的完整性
    const isValid = state.elements.every((el: any) => {
      if (!el.id || !el.type) return false;
      // 文本元素必须有content
      if (el.type === 'text' && (!el.content || typeof el.content !== 'string')) {
        return false;
      }
      // 所有元素必须有基本属性
      if (typeof el.x !== 'number' || typeof el.y !== 'number' || 
          typeof el.width !== 'number' || typeof el.height !== 'number') {
        return false;
      }
      return true;
    });
    
    if (!isValid) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    return state;
  } catch (error) {
    console.error('Failed to load canvas state:', error);
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

// 清除画布状态
export const clearCanvasState = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear canvas state:', error);
  }
};
