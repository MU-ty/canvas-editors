import { useEffect, useRef, useState, useCallback } from 'react';
import { PixiRenderer } from '../renderer/PixiRenderer';
import type { CanvasElement, SelectionBox } from '../types';
import {
  isElementInSelection,
  isPointInElement,
  screenToCanvas,
} from '../utils/helpers';
import { detectGuideLines, calculateSnappedPosition } from '../utils/guideLines';
import type { GuideLine } from '../utils/guideLines';
import { ResizeHandles } from './ResizeHandles';
import { ArrowHandles } from './ArrowHandles';
import TextEditor from './TextEditor.tsx';
import { ContextMenu } from './ContextMenu';
import { MiniMap } from './MiniMap';
import { GuideLineRenderer } from './GuideLineRenderer';

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
  onCreateArrow?: (startX: number, startY: number, endX: number, endY: number) => void;
  isDrawingArrow?: boolean;
  onCancelArrowDrawing?: () => void;
  onUpdateArrowPoint?: (elementId: string, point: 'start' | 'end', x: number, y: number) => void;
}

const InteractionMode = {
  NONE: 'none',
  PANNING: 'panning',
  SELECTING: 'selecting',
  DRAGGING: 'dragging',
  RESIZING: 'resizing',
  DRAWING_ARROW: 'drawing-arrow',
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
  onCreateArrow,
  isDrawingArrow = false,
  onCancelArrowDrawing,
  onUpdateArrowPoint,
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
  const [guidelines, setGuidelines] = useState<GuideLine[]>([]);
  const dragThreshold = 5; // 拖拽阈值(像素)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [arrowStartPoint, setArrowStartPoint] = useState<{ x: number; y: number } | null>(null);

  // 初始化渲染器
  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new PixiRenderer(canvasRef.current);
    rendererRef.current = renderer;

    // 等待渲染器初始化完成
    renderer.waitForInit().then(() => {
      console.log('Renderer initialized');
      // 确保 rendererRef 仍然指向当前 renderer（防止组件卸载后设置状态）
      if (rendererRef.current === renderer) {
        setRendererReady(true);
      }
    });

    return () => {
      if (renderer) {
        renderer.destroy();
      }
      rendererRef.current = null;
      setRendererReady(false);
    };
  }, []);

  // 渲染元素 - 确保在渲染器就绪且元素存在时触发
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !rendererReady) {
      console.log('Render skipped - rendererReady:', rendererReady, 'renderer:', !!renderer);
      return;
    }

    console.log('Render useEffect triggered - rendererReady:', rendererReady, 'elements:', elements.length);

    // 使用标记来处理竞态条件
    let cancelled = false;

    // 清空并重新渲染所有元素
    const renderAll = async () => {
      console.log('Starting render of', elements.length, 'elements');
      renderer.clear();
      
      for (const element of elements) {
        if (cancelled) {
          console.log('Render cancelled');
          return;
        }
        await renderer.renderElement(element);
      }
      
      if (!cancelled) {
        console.log('Finished rendering');
      }
    };
    
    renderAll();

    return () => {
      cancelled = true;
    };
  }, [elements, rendererReady]);

  // 更新视口
  useEffect(() => {
    console.log('Viewport update:', viewport, 'rendererReady:', rendererReady);
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

      // 如果正在绘制箭头
      if (isDrawingArrow) {
        if (!arrowStartPoint) {
          // 设置起点
          setArrowStartPoint({ x: canvasX, y: canvasY });
          setMode(InteractionMode.DRAWING_ARROW);
        } else {
          // 设置终点并创建箭头
          if (onCreateArrow) {
            onCreateArrow(arrowStartPoint.x, arrowStartPoint.y, canvasX, canvasY);
          }
          setArrowStartPoint(null);
          setMode(InteractionMode.NONE);
        }
        return;
      }

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
    [elements, selectedIds, viewport, onSelectElements, onClearSelection, editingTextId, isDrawingArrow, arrowStartPoint, onCreateArrow]
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

        // 获取所有选中的元素
        const draggedElements = Array.from(elementStartPos.entries()).map(([id, startPos]) => {
          const element = elements.find((e) => e.id === id);
          return element ? { ...element, x: startPos.x + dx, y: startPos.y + dy } : null;
        }).filter(Boolean) as CanvasElement[];

        // 检测辅助线（只检测第一个拖拽的元素）
        if (draggedElements.length > 0) {
          const otherElements = elements.filter((e) => !elementStartPos.has(e.id));
          const detectedGuideLines = detectGuideLines(draggedElements[0], otherElements, viewport);
          setGuidelines(detectedGuideLines);

          // 计算吸附位置（只吸附第一个元素，其他元素跟随）
          const snappedResult = calculateSnappedPosition(draggedElements[0], otherElements, viewport);
          const snappedDx = snappedResult.x - draggedElements[0].x;
          const snappedDy = snappedResult.y - draggedElements[0].y;

          // 应用位置更新（使用原始或吸附后的偏移）
          elementStartPos.forEach((startPos, id) => {
            onUpdateElement(id, {
              x: startPos.x + dx + snappedDx,
              y: startPos.y + dy + snappedDy,
            });
          });
        }
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
      elements,
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
    setGuidelines([]); // 清除辅助线
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

      // 如果双击的是文字元素或带有内部文本的图形，进入编辑模式
      if (
        clickedElement &&
        (clickedElement.type === 'text' || (['rectangle','rounded-rectangle','circle','triangle'] as string[]).includes(clickedElement.type))
      ) {
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

  // 处理键盘事件 - ESC 取消箭头绘制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawingArrow) {
        setArrowStartPoint(null);
        setMode(InteractionMode.NONE);
        if (onCancelArrowDrawing) {
          onCancelArrowDrawing();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawingArrow, onCancelArrowDrawing]);

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
            isDrawingArrow
              ? 'crosshair'
              : mode === InteractionMode.PANNING
              ? 'grabbing'
              : mode === InteractionMode.DRAGGING
              ? 'move'
              : 'default',
        }}
      />

      {/* 箭头绘制提示 */}
      {isDrawingArrow && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(59, 130, 246, 0.9)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            pointerEvents: 'none',
            zIndex: 2000,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        >
          {arrowStartPoint ? '点击确定箭头终点' : '点击确定箭头起点'}
          <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.9 }}>
            按 ESC 取消
          </div>
        </div>
      )}

      {/* 辅助线渲染 */}
      {canvasRef.current && (
        <GuideLineRenderer
          guidelines={guidelines}
          viewport={viewport}
          canvasWidth={canvasRef.current.width}
          canvasHeight={canvasRef.current.height}
        />
      )}

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

      {/* 箭头控制点 */}
      {!editingTextId && selectedIds.length === 1 && onUpdateArrowPoint && (() => {
        const selectedElement = elements.find((el) => el.id === selectedIds[0]);
        if (selectedElement?.type === 'arrow') {
          return (
            <ArrowHandles
              element={selectedElement as any}
              viewport={viewport}
              onUpdateArrowPoint={(point, x, y) => {
                onUpdateArrowPoint(selectedIds[0], point, x, y);
              }}
            />
          );
        }
        return null;
      })()}

      {/* 文字编辑器 */}
      {editingTextId && (() => {
        const textElement = elements.find((el) => el.id === editingTextId);
        if (!textElement) return null;
        // 允许 text 类型或 shape
        const isEditableShape = (['rectangle','rounded-rectangle','circle','triangle'] as string[]).includes(textElement.type);
        if (textElement.type !== 'text' && !isEditableShape) return null;
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

      {/* MiniMap */}
      <MiniMap
        elements={elements}
        viewport={viewport}
        canvasWidth={window.innerWidth}
        canvasHeight={window.innerHeight}
        onViewportChange={onUpdateViewport}
      />
    </div>
  );
};
