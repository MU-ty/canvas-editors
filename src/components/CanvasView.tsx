import { useEffect, useRef, useState, useCallback } from 'react';
import { PixiRenderer } from '../renderer/PixiRenderer';
import type { CanvasElement, SelectionBox } from '../types';
import {
  isElementInSelection,
  isPointInElement,
  screenToCanvas,
} from '../utils/helpers';
import { ResizeHandles } from './ResizeHandles';
import { TextEditor } from './TextEditor';
import { ContextMenu } from './ContextMenu';

interface CanvasViewProps {
  elements: CanvasElement[];
  selectedIds: string[];
  viewport: { x: number; y: number; scale: number };
  onSelectElements: (ids: string[]) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onUpdateViewport: (updates: { x?: number; y?: number; scale?: number }) => void;
  onClearSelection: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
}

const InteractionMode = {
  NONE: 'none',
  PANNING: 'panning',
  SELECTING: 'selecting',
  DRAGGING: 'dragging',
  RESIZING: 'resizing',
} as const;

type InteractionMode = typeof InteractionMode[keyof typeof InteractionMode];

export const CanvasView: React.FC<CanvasViewProps> = ({
  elements,
  selectedIds,
  viewport,
  onSelectElements,
  onUpdateElement,
  onUpdateViewport,
  onClearSelection,
  onCopy,
  onPaste,
  onDelete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<PixiRenderer | null>(null);
  const [mode, setMode] = useState<InteractionMode>(InteractionMode.NONE);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [elementStartPos, setElementStartPos] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());
  const [rendererReady, setRendererReady] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStartData, setResizeStartData] = useState<{
    mouseX: number;
    mouseY: number;
    elements: Map<string, { x: number; y: number; width: number; height: number }>;
    shiftKey: boolean;
  } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragThreshold = 5; // 拖拽阈值(像素)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // 初始化渲染器
  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new PixiRenderer(canvasRef.current);
    rendererRef.current = renderer;

    // 等待渲染器初始化完成
    renderer.waitForInit().then(() => {
      setRendererReady(true);
    });

    return () => {
      if (renderer) {
        renderer.destroy();
      }
      rendererRef.current = null;
    };
  }, []);

  // 渲染元素
  useEffect(() => {
    if (!rendererRef.current || !rendererReady) return;

    // 清空并重新渲染所有元素
    const renderAll = async () => {
      rendererRef.current!.clear();
      for (const element of elements) {
        await rendererRef.current!.renderElement(element);
      }
    };
    
    renderAll();
  }, [elements, rendererReady]);

  // 更新视口
  useEffect(() => {
    if (!rendererRef.current || !rendererReady) return;
    rendererRef.current.updateViewport(viewport.x, viewport.y, viewport.scale);
  }, [viewport, rendererReady]);

  // 鼠标按下
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // 如果正在编辑文字，不处理其他交互
      if (editingTextId) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const { x: canvasX, y: canvasY } = screenToCanvas(screenX, screenY, viewport);

      // 空格键 + 鼠标按下 = 拖拽画布
      if (e.button === 0 && e.nativeEvent.which === 1 && e.altKey) {
        setMode(InteractionMode.PANNING);
        setDragStart({ x: screenX, y: screenY });
        return;
      }

      // 检查是否点击到元素
      let clickedElement: CanvasElement | null = null;
      for (let i = elements.length - 1; i >= 0; i--) {
        if (isPointInElement(canvasX, canvasY, elements[i])) {
          clickedElement = elements[i];
          break;
        }
      }

      if (clickedElement) {
        // 点击元素
        if (!e.shiftKey) {
          // 非 Shift 点击，选中单个元素
          if (!selectedIds.includes(clickedElement.id)) {
            onSelectElements([clickedElement.id]);
          }
        } else {
          // Shift 点击，切换选择
          if (selectedIds.includes(clickedElement.id)) {
            onSelectElements(selectedIds.filter((id) => id !== clickedElement.id));
          } else {
            onSelectElements([...selectedIds, clickedElement.id]);
          }
        }

        // 准备拖拽(但不立即开始,等待鼠标移动超过阈值)
        setMode(InteractionMode.DRAGGING);
        setDragStart({ x: canvasX, y: canvasY });
        setIsDragging(false);

        // 记录所有选中元素的初始位置
        const startPositions = new Map<string, { x: number; y: number }>();
        const targetIds = selectedIds.includes(clickedElement.id)
          ? selectedIds
          : [clickedElement.id];

        targetIds.forEach((id) => {
          const el = elements.find((e) => e.id === id);
          if (el) {
            startPositions.set(id, { x: el.x, y: el.y });
          }
        });
        setElementStartPos(startPositions);
      } else {
        // 未点击元素，开始框选
        setMode(InteractionMode.SELECTING);
        setSelectionBox({
          startX: canvasX,
          startY: canvasY,
          endX: canvasX,
          endY: canvasY,
        });
        if (!e.shiftKey) {
          onClearSelection();
        }
      }
    },
    [elements, selectedIds, viewport, onSelectElements, onClearSelection, editingTextId]
  );

  // 鼠标移动
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // 如果正在编辑文字，不处理其他交互
      if (editingTextId) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      if (mode === InteractionMode.PANNING && dragStart) {
        // 拖拽画布
        const dx = screenX - dragStart.x;
        const dy = screenY - dragStart.y;
        onUpdateViewport({
          x: viewport.x + dx,
          y: viewport.y + dy,
        });
        setDragStart({ x: screenX, y: screenY });
      } else if (mode === InteractionMode.SELECTING && selectionBox) {
        // 更新框选区域
        const { x: canvasX, y: canvasY } = screenToCanvas(screenX, screenY, viewport);
        setSelectionBox({
          ...selectionBox,
          endX: canvasX,
          endY: canvasY,
        });
      } else if (mode === InteractionMode.DRAGGING && dragStart) {
        // 拖拽元素
        const { x: canvasX, y: canvasY } = screenToCanvas(screenX, screenY, viewport);
        const dx = canvasX - dragStart.x;
        const dy = canvasY - dragStart.y;

        // 检查是否超过拖拽阈值
        if (!isDragging) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > dragThreshold / viewport.scale) {
            setIsDragging(true);
          } else {
            return; // 未超过阈值,不执行拖拽
          }
        }

        elementStartPos.forEach((startPos, id) => {
          onUpdateElement(id, {
            x: startPos.x + dx,
            y: startPos.y + dy,
          });
        });
      }
      // RESIZING 模式由 document 监听器处理
    },
    [
      mode,
      dragStart,
      selectionBox,
      elementStartPos,
      isDragging,
      dragThreshold,
      viewport,
      onUpdateViewport,
      onUpdateElement,
      editingTextId,
    ]
  );

  // 鼠标释放
  const handleMouseUp = useCallback(() => {
    // 如果正在编辑文字，不处理其他交互
    if (editingTextId) return;
    
    if (mode === InteractionMode.SELECTING && selectionBox) {
      // 完成框选
      const selectedElements = elements.filter((el) =>
        isElementInSelection(el, selectionBox)
      );
      const newSelectedIds = selectedElements.map((el) => el.id);
      onSelectElements(newSelectedIds);
      setSelectionBox(null);
    }

    setMode(InteractionMode.NONE);
    setDragStart(null);
    setElementStartPos(new Map());
    setResizeHandle(null);
    setResizeStartData(null);
    setIsDragging(false);
  }, [mode, selectionBox, elements, onSelectElements, editingTextId]);

  // 开始缩放
  const handleResizeStart = useCallback(
    (handle: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const { x: canvasX, y: canvasY } = screenToCanvas(screenX, screenY, viewport);

      setMode(InteractionMode.RESIZING);
      setResizeHandle(handle);

      // 记录所有选中元素的初始状态
      const elementData = new Map<
        string,
        { x: number; y: number; width: number; height: number }
      >();
      selectedIds.forEach((id) => {
        const el = elements.find((e) => e.id === id);
        if (el) {
          elementData.set(id, {
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
          });
        }
      });

      setResizeStartData({
        mouseX: canvasX,
        mouseY: canvasY,
        elements: elementData,
        shiftKey: e.shiftKey,
      });
    },
    [elements, selectedIds, viewport]
  );

  // 监听wheel事件（用原生事件以避免passive警告）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      // 计算缩放前的画布坐标
      const beforeX = (screenX - viewport.x) / viewport.scale;
      const beforeY = (screenY - viewport.y) / viewport.scale;

      // 计算新的缩放比例
      const scaleDelta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.1, Math.min(5, viewport.scale * scaleDelta));

      // 计算缩放后的画布坐标
      const afterX = screenX - beforeX * newScale;
      const afterY = screenY - beforeY * newScale;

      onUpdateViewport({
        scale: newScale,
        x: afterX,
        y: afterY,
      });
    };

    canvas.addEventListener('wheel', handleWheelEvent, { passive: false });
    
    return () => {
      canvas.removeEventListener('wheel', handleWheelEvent);
    };
  }, [viewport, onUpdateViewport]);

  // 监听document的mousemove和mouseup，以便在resize时鼠标移出canvas也能继续工作
  useEffect(() => {
    const handleDocumentMouseMove = (e: MouseEvent) => {
      if (mode === InteractionMode.RESIZING && resizeStartData && resizeHandle && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const { x: canvasX, y: canvasY } = screenToCanvas(screenX, screenY, viewport);
        
        const dx = canvasX - resizeStartData.mouseX;
        const dy = canvasY - resizeStartData.mouseY;
        const keepAspectRatio = !resizeStartData.shiftKey;

        resizeStartData.elements.forEach((startData, id) => {
          let newX = startData.x;
          let newY = startData.y;
          let newWidth = startData.width;
          let newHeight = startData.height;
          
          // 角控制点
          if (resizeHandle === 'tl' || resizeHandle === 'tr' || 
              resizeHandle === 'bl' || resizeHandle === 'br') {
            
            if (keepAspectRatio) {
              const aspectRatio = startData.width / startData.height;
              
              if (resizeHandle === 'br') {
                newWidth = Math.max(20, startData.width + dx);
                newHeight = Math.max(20, newWidth / aspectRatio);
              } else if (resizeHandle === 'tl') {
                newWidth = Math.max(20, startData.width - dx);
                newHeight = Math.max(20, newWidth / aspectRatio);
                newX = startData.x + startData.width - newWidth;
                newY = startData.y + startData.height - newHeight;
              } else if (resizeHandle === 'tr') {
                newWidth = Math.max(20, startData.width + dx);
                newHeight = Math.max(20, newWidth / aspectRatio);
                newY = startData.y + startData.height - newHeight;
              } else if (resizeHandle === 'bl') {
                newWidth = Math.max(20, startData.width - dx);
                newHeight = Math.max(20, newWidth / aspectRatio);
                newX = startData.x + startData.width - newWidth;
              }
            } else {
              if (resizeHandle === 'br') {
                newWidth = Math.max(20, startData.width + dx);
                newHeight = Math.max(20, startData.height + dy);
              } else if (resizeHandle === 'tl') {
                newWidth = Math.max(20, startData.width - dx);
                newHeight = Math.max(20, startData.height - dy);
                newX = startData.x + startData.width - newWidth;
                newY = startData.y + startData.height - newHeight;
              } else if (resizeHandle === 'tr') {
                newWidth = Math.max(20, startData.width + dx);
                newHeight = Math.max(20, startData.height - dy);
                newY = startData.y + startData.height - newHeight;
              } else if (resizeHandle === 'bl') {
                newWidth = Math.max(20, startData.width - dx);
                newHeight = Math.max(20, startData.height + dy);
                newX = startData.x + startData.width - newWidth;
              }
            }
          } else {
            // 边控制点
            if (resizeHandle === 't') {
              newHeight = Math.max(20, startData.height - dy);
              newY = startData.y + startData.height - newHeight;
            } else if (resizeHandle === 'b') {
              newHeight = Math.max(20, startData.height + dy);
            } else if (resizeHandle === 'l') {
              newWidth = Math.max(20, startData.width - dx);
              newX = startData.x + startData.width - newWidth;
            } else if (resizeHandle === 'r') {
              newWidth = Math.max(20, startData.width + dx);
            }
          }

          onUpdateElement(id, {
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
          });
        });
      }
    };

    const handleDocumentMouseUp = () => {
      if (mode === InteractionMode.RESIZING) {
        setMode(InteractionMode.NONE);
        setResizeHandle(null);
        setResizeStartData(null);
      }
    };

    if (mode === InteractionMode.RESIZING) {
      document.addEventListener('mousemove', handleDocumentMouseMove);
      document.addEventListener('mouseup', handleDocumentMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleDocumentMouseMove);
        document.removeEventListener('mouseup', handleDocumentMouseUp);
      };
    }
  }, [mode, resizeHandle, resizeStartData, viewport, onUpdateElement]);

  // 鼠标滚轮（缩放）
  // 右键菜单
  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    []
  );

  // 双击事件 - 用于文字编辑
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const { x: canvasX, y: canvasY } = screenToCanvas(screenX, screenY, viewport);

      // 查找被双击的元素
      let clickedElement: CanvasElement | null = null;
      for (let i = elements.length - 1; i >= 0; i--) {
        if (isPointInElement(canvasX, canvasY, elements[i])) {
          clickedElement = elements[i];
          break;
        }
      }

      // 如果双击的是文字元素，进入编辑模式
      if (clickedElement && clickedElement.type === 'text') {
        e.stopPropagation();
        onSelectElements([clickedElement.id]);
        setEditingTextId(clickedElement.id);
        // 清除拖拽状态
        setMode(InteractionMode.NONE);
        setDragStart(null);
        setIsDragging(false);
      }
    },
    [elements, viewport, onSelectElements]
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor:
            mode === InteractionMode.PANNING
              ? 'grabbing'
              : mode === InteractionMode.DRAGGING
              ? 'move'
              : 'default',
        }}
      />

      {/* 框选矩形 */}
      {selectionBox && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(selectionBox.startX, selectionBox.endX) * viewport.scale + viewport.x,
            top: Math.min(selectionBox.startY, selectionBox.endY) * viewport.scale + viewport.y,
            width:
              Math.abs(selectionBox.endX - selectionBox.startX) * viewport.scale,
            height:
              Math.abs(selectionBox.endY - selectionBox.startY) * viewport.scale,
            border: '2px dashed #3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 缩放控制点 */}
      {!editingTextId && (
        <ResizeHandles
          selectedElements={elements.filter((el) => selectedIds.includes(el.id))}
          viewport={viewport}
          onResizeStart={handleResizeStart}
        />
      )}

      {/* 文字编辑器 */}
      {editingTextId && (() => {
        const textElement = elements.find((el) => el.id === editingTextId);
        if (!textElement || textElement.type !== 'text') return null;
        return (
          <TextEditor
            element={textElement}
            viewport={viewport}
            onUpdate={(content: string) => {
              onUpdateElement(editingTextId, { content } as any);
            }}
            onClose={() => setEditingTextId(null)}
          />
        );
      })()}

      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          hasSelection={selectedIds.length > 0}
          onCopy={onCopy}
          onPaste={onPaste}
          onDelete={onDelete}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};
