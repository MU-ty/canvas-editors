import { useState, useCallback, useEffect } from 'react';
import type {
  CanvasState,
  CanvasElement,
  ViewportState,
  ShapeElement,
  ImageElement,
  TextElement,
} from '../types';
import { ElementType, ImageFilter } from '../types';
import { generateId, cloneElement, debounce } from '../utils/helpers';
import { saveCanvasState, loadCanvasState } from '../utils/storage';

const DEFAULT_VIEWPORT: ViewportState = {
  x: 0,
  y: 0,
  scale: 1,
};

export const useCanvasState = () => {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewport, setViewport] = useState<ViewportState>(DEFAULT_VIEWPORT);
  const [clipboard, setClipboard] = useState<CanvasElement[]>([]);
  const [initialized, setInitialized] = useState(false);

  // 加载初始状态
  useEffect(() => {
    const savedState = loadCanvasState();
    if (savedState && savedState.elements && savedState.elements.length > 0) {
      setElements(savedState.elements);
      setViewport(savedState.viewport);
    } else {
      // 创建一些初始元素用于演示
      createInitialElements();
    }
    // 标记为已初始化
    setInitialized(true);
  }, []);

  // 自动保存
  const debouncedSave = useCallback(
    debounce((state: CanvasState) => {
      saveCanvasState(state);
    }, 500),
    []
  );

  useEffect(() => {
    if (!initialized) return;
    debouncedSave({ elements, selectedIds, viewport });
  }, [elements, viewport, selectedIds, debouncedSave, initialized]);

  // 创建初始元素
  const createInitialElements = () => {
    const initialElements: CanvasElement[] = [
      {
        id: generateId(),
        type: ElementType.RECTANGLE,
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        rotation: 0,
        zIndex: 0,
        backgroundColor: '#3b82f6',
        borderWidth: 2,
        borderColor: '#1e40af',
      } as ShapeElement,
      {
        id: generateId(),
        type: ElementType.ROUNDED_RECTANGLE,
        x: 350,
        y: 100,
        width: 200,
        height: 150,
        rotation: 0,
        zIndex: 1,
        backgroundColor: '#10b981',
        borderWidth: 2,
        borderColor: '#059669',
        cornerRadius: 20,
      } as ShapeElement,
      {
        id: generateId(),
        type: ElementType.CIRCLE,
        x: 600,
        y: 100,
        width: 150,
        height: 150,
        rotation: 0,
        zIndex: 2,
        backgroundColor: '#f59e0b',
        borderWidth: 2,
        borderColor: '#d97706',
      } as ShapeElement,
      {
        id: generateId(),
        type: ElementType.TRIANGLE,
        x: 850,
        y: 100,
        width: 150,
        height: 150,
        rotation: 0,
        zIndex: 3,
        backgroundColor: '#ef4444',
        borderWidth: 2,
        borderColor: '#dc2626',
      } as ShapeElement,
      {
        id: generateId(),
        type: ElementType.TEXT,
        x: 100,
        y: 300,
        width: 400,
        height: 100,
        rotation: 0,
        zIndex: 4,
        content: '欢迎使用画布编辑器！',
        style: {
          fontFamily: 'Arial',
          fontSize: 32,
          color: '#1f2937',
          backgroundColor: '#fef3c7',
          bold: true,
        },
      } as TextElement,
    ];
    setElements(initialElements);
  };

  // 添加元素
  const addElement = useCallback((element: CanvasElement) => {
    setElements((prev) => [...prev, element]);
  }, []);

  // 更新元素
  const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setElements((prev) =>
      prev.map((el) => {
        if (el.id === id) {
          // 如果是文字元素且更新了 style，需要深度合并
          if (el.type === 'text' && 'style' in updates) {
            const textEl = el as TextElement;
            const textUpdates = updates as Partial<TextElement>;
            return {
              ...textEl,
              ...textUpdates,
              style: { ...textEl.style, ...textUpdates.style },
            } as CanvasElement;
          }
          return { ...el, ...updates } as CanvasElement;
        }
        return el;
      })
    );
  }, []);

  // 删除元素
  const deleteElements = useCallback((ids: string[]) => {
    setElements((prev) => prev.filter((el) => !ids.includes(el.id)));
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
  }, []);

  // 选择元素
  const selectElements = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  // 切换选择
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  // 清空选择
  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // 更新视口
  const updateViewport = useCallback((updates: Partial<ViewportState>) => {
    setViewport((prev) => ({ ...prev, ...updates }));
  }, []);

  // 复制选中元素
  const copySelected = useCallback(() => {
    const selected = elements.filter((el) => selectedIds.includes(el.id));
    setClipboard(selected.map(cloneElement));
  }, [elements, selectedIds]);

  // 粘贴元素
  const paste = useCallback(() => {
    if (clipboard.length === 0) return;

    const newElements = clipboard.map((el) => {
      const cloned = cloneElement(el);
      cloned.id = generateId();
      cloned.x += 20;
      cloned.y += 20;
      return cloned;
    });

    setElements((prev) => [...prev, ...newElements]);
    setSelectedIds(newElements.map((el) => el.id));
    setClipboard(newElements); // 更新剪贴板，方便连续粘贴
  }, [clipboard]);

  // 创建新元素
  const createElement = useCallback(
    (type: ElementType, x: number, y: number, imageUrl?: string, width?: number, height?: number) => {
      let newElement: CanvasElement;

      const baseProps = {
        id: generateId(),
        x,
        y,
        rotation: 0,
        zIndex: elements.length,
      };

      switch (type) {
        case ElementType.RECTANGLE:
        case ElementType.ROUNDED_RECTANGLE:
        case ElementType.CIRCLE:
        case ElementType.TRIANGLE:
          newElement = {
            ...baseProps,
            type,
            width: 150,
            height: 150,
            backgroundColor: '#3b82f6',
            borderWidth: 2,
            borderColor: '#1e40af',
            cornerRadius: type === ElementType.ROUNDED_RECTANGLE ? 20 : undefined,
          } as ShapeElement;
          break;
        case ElementType.TEXT:
          newElement = {
            ...baseProps,
            type,
            width: 300,
            height: 80,
            content: '双击编辑文本',
            style: {
              fontFamily: 'Arial',
              fontSize: 24,
              color: '#000000',
              bold: false,
              italic: false,
              underline: false,
              strikethrough: false,
            },
          } as TextElement;
          break;
        case ElementType.IMAGE:
          // 使用传入的图片URL和尺寸，或使用默认值
          newElement = {
            ...baseProps,
            type,
            width: width || 200,
            height: height || 200,
            src: imageUrl || 'https://via.placeholder.com/200',
            filter: ImageFilter.NONE,
          } as ImageElement;
          break;
        default:
          return;
      }

      addElement(newElement);
      selectElements([newElement.id]);
    },
    [elements.length, addElement, selectElements]
  );

  // 获取选中的元素
  const getSelectedElements = useCallback(() => {
    return elements.filter((el) => selectedIds.includes(el.id));
  }, [elements, selectedIds]);

  return {
    elements,
    selectedIds,
    viewport,
    addElement,
    updateElement,
    deleteElements,
    selectElements,
    toggleSelection,
    clearSelection,
    updateViewport,
    copySelected,
    paste,
    createElement,
    getSelectedElements,
  };
};
