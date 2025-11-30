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
    console.log('Loading saved state:', savedState);
    if (savedState && savedState.elements && savedState.elements.length > 0) {
      console.log('Found saved elements:', savedState.elements.length);
      // 立即设置状态，不使用 setTimeout
      setElements([...savedState.elements]);
      setViewport({...savedState.viewport});
      console.log('Elements set from saved state');
    } else {
      console.log('No saved state, creating initial elements');
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
        type: ElementType.ARROW,
        x: 150,
        y: 280,
        width: 220,
        height: 80,
        rotation: 0,
        zIndex: 4,
        backgroundColor: 'transparent',
        borderWidth: 4,
        borderColor: '#1e3a8a',
        arrowStart: { x: 20, y: 40 },
        arrowEnd: { x: 200, y: 40 },
        arrowHeadSize: 18,
        arrowTailWidth: 4,
        arrowCurve: 0,
      } as ShapeElement,
      {
        id: generateId(),
        type: ElementType.TEXT,
        x: 100,
        y: 300,
        width: 400,
        height: 100,
        rotation: 0,
        zIndex: 5,
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
          if (el.type === 'arrow') {
            const arrowEl = el as ShapeElement;
            const shapeUpdates = updates as Partial<ShapeElement>;

            const widthUpdated = typeof shapeUpdates.width === 'number';
            const heightUpdated = typeof shapeUpdates.height === 'number';
            const newWidth = widthUpdated ? (shapeUpdates.width as number) : arrowEl.width;
            const newHeight = heightUpdated ? (shapeUpdates.height as number) : arrowEl.height;

            const scaleX = widthUpdated && arrowEl.width !== 0 ? newWidth / arrowEl.width : 1;
            const scaleY = heightUpdated && arrowEl.height !== 0 ? newHeight / arrowEl.height : 1;

            const hasNewStart = shapeUpdates.arrowStart !== undefined;
            const hasNewEnd = shapeUpdates.arrowEnd !== undefined;

            const nextStart = hasNewStart
              ? shapeUpdates.arrowStart || undefined
              : arrowEl.arrowStart
              ? {
                  x: arrowEl.arrowStart.x * scaleX,
                  y: arrowEl.arrowStart.y * scaleY,
                }
              : undefined;

            const nextEnd = hasNewEnd
              ? shapeUpdates.arrowEnd || undefined
              : arrowEl.arrowEnd
              ? {
                  x: arrowEl.arrowEnd.x * scaleX,
                  y: arrowEl.arrowEnd.y * scaleY,
                }
              : undefined;

            const merged: ShapeElement = {
              ...arrowEl,
              ...shapeUpdates,
              width: newWidth,
              height: newHeight,
              arrowStart: nextStart,
              arrowEnd: nextEnd,
            } as ShapeElement;

            return merged as CanvasElement;
          }
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
            content: '',
            textStyle: {
              fontFamily: 'Arial',
              fontSize: 16,
              color: '#ffffff',
              bold: false,
              italic: false,
              underline: false,
              strikethrough: false,
            },
          } as ShapeElement;
          break;
        case ElementType.ARROW:
          newElement = {
            ...baseProps,
            type,
            width: 180,
            height: 60,
            backgroundColor: 'transparent',
            borderWidth: 4,
            borderColor: '#2563eb',
            arrowStart: { x: 20, y: 30 },
            arrowEnd: { x: 160, y: 30 },
            arrowHeadSize: 18,
            arrowTailWidth: 4,
            arrowCurve: 0,
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

  // 创建箭头（使用指定的起点和终点）
  const createArrowWithPoints = useCallback(
    (startX: number, startY: number, endX: number, endY: number) => {
      // 计算箭头的边界框
      const minX = Math.min(startX, endX);
      const minY = Math.min(startY, endY);
      const width = Math.max(Math.abs(endX - startX), 50);
      const height = Math.max(Math.abs(endY - startY), 50);
      
      // 转换为相对于边界框的坐标
      const relativeStartX = startX - minX;
      const relativeStartY = startY - minY;
      const relativeEndX = endX - minX;
      const relativeEndY = endY - minY;
      
      const newArrow: ShapeElement = {
        id: generateId(),
        type: ElementType.ARROW,
        x: minX,
        y: minY,
        width: width,
        height: height,
        rotation: 0,
        zIndex: elements.length,
        backgroundColor: 'transparent',
        borderWidth: 4,
        borderColor: '#2563eb',
        arrowStart: { x: relativeStartX, y: relativeStartY },
        arrowEnd: { x: relativeEndX, y: relativeEndY },
        arrowHeadSize: 18,
        arrowTailWidth: 4,
        arrowCurve: 0,
      };
      
      setElements((prev) => [...prev, newArrow]);
      setSelectedIds([newArrow.id]);
    },
    [elements.length]
  );

  // 更新箭头的起点或终点位置
  const updateArrowPoint = useCallback(
    (elementId: string, point: 'start' | 'end', x: number, y: number) => {
      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== elementId || el.type !== ElementType.ARROW) {
            return el;
          }

          const shapeEl = el as ShapeElement;
          
          // 更新点位置
          const updatedArrowStart = point === 'start' ? { x, y } : shapeEl.arrowStart!;
          const updatedArrowEnd = point === 'end' ? { x, y } : shapeEl.arrowEnd!;
          
          // 重新计算边界框
          const absoluteStartX = shapeEl.x + updatedArrowStart.x;
          const absoluteStartY = shapeEl.y + updatedArrowStart.y;
          const absoluteEndX = shapeEl.x + updatedArrowEnd.x;
          const absoluteEndY = shapeEl.y + updatedArrowEnd.y;
          
          const minX = Math.min(absoluteStartX, absoluteEndX);
          const minY = Math.min(absoluteStartY, absoluteEndY);
          const width = Math.max(Math.abs(absoluteEndX - absoluteStartX), 50);
          const height = Math.max(Math.abs(absoluteEndY - absoluteStartY), 50);
          
          // 转换为新的相对坐标
          const relativeStartX = absoluteStartX - minX;
          const relativeStartY = absoluteStartY - minY;
          const relativeEndX = absoluteEndX - minX;
          const relativeEndY = absoluteEndY - minY;
          
          return {
            ...shapeEl,
            x: minX,
            y: minY,
            width,
            height,
            arrowStart: { x: relativeStartX, y: relativeStartY },
            arrowEnd: { x: relativeEndX, y: relativeEndY },
          };
        })
      );
    },
    []
  );

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
    createArrowWithPoints,
    updateArrowPoint,
    getSelectedElements,
  };
};
