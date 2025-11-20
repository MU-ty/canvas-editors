import { useEffect, useCallback } from 'react';
import { CanvasView } from './components/CanvasView';
import { Toolbar } from './components/Toolbar';
import { PropertyPanel } from './components/PropertyPanel';
import { useCanvasState } from './hooks/useCanvasState';
import { ElementType } from './types';
import './App.css';

function App() {
  const {
    elements,
    selectedIds,
    viewport,
    updateElement,
    deleteElements,
    selectElements,
    clearSelection,
    updateViewport,
    copySelected,
    paste,
    createElement,
    getSelectedElements,
  } = useCanvasState();

  // 处理键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + C: 复制
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        copySelected();
      }

      // Ctrl/Cmd + V: 粘贴
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        paste();
      }

      // Delete/Backspace: 删除
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          deleteElements(selectedIds);
        }
      }

      // Escape: 取消选择
      if (e.key === 'Escape') {
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, copySelected, paste, deleteElements, clearSelection]);

  // 创建元素（在画布中心）
  const handleCreateElement = useCallback(
    (type: ElementType) => {
      const centerX = -viewport.x / viewport.scale + window.innerWidth / 2 / viewport.scale;
      const centerY = -viewport.y / viewport.scale + window.innerHeight / 2 / viewport.scale;
      createElement(type, centerX - 75, centerY - 75);
    },
    [viewport, createElement]
  );

  // 处理图片上传
  const handleImageUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          // 创建临时图片对象获取尺寸
          const img = new Image();
          img.onload = () => {
            const centerX = -viewport.x / viewport.scale + window.innerWidth / 2 / viewport.scale;
            const centerY = -viewport.y / viewport.scale + window.innerHeight / 2 / viewport.scale;
            
            // 限制最大尺寸为400px
            const maxSize = 400;
            let width = img.width;
            let height = img.height;
            
            if (width > maxSize || height > maxSize) {
              const ratio = Math.min(maxSize / width, maxSize / height);
              width = width * ratio;
              height = height * ratio;
            }
            
            createElement(
              ElementType.IMAGE, 
              centerX - width / 2, 
              centerY - height / 2, 
              dataUrl,
              width,
              height
            );
          };
          img.src = dataUrl;
        }
      };
      reader.readAsDataURL(file);
    },
    [viewport, createElement]
  );

  // 重置视图
  const handleResetView = useCallback(() => {
    updateViewport({ x: 0, y: 0, scale: 1 });
  }, [updateViewport]);

  // 删除选中元素
  const handleDelete = useCallback(() => {
    if (selectedIds.length > 0) {
      deleteElements(selectedIds);
    }
  }, [selectedIds, deleteElements]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <CanvasView
        elements={elements}
        selectedIds={selectedIds}
        viewport={viewport}
        onSelectElements={selectElements}
        onUpdateElement={updateElement}
        onUpdateViewport={updateViewport}
        onClearSelection={clearSelection}
        onCopy={copySelected}
        onPaste={paste}
        onDelete={handleDelete}
      />
      
      <Toolbar
        onCreateElement={handleCreateElement}
        onUploadImage={handleImageUpload}
        onDelete={handleDelete}
        onCopy={copySelected}
        onPaste={paste}
        onResetView={handleResetView}
        hasSelection={selectedIds.length > 0}
      />

      <PropertyPanel
        selectedElements={getSelectedElements()}
        onUpdateElement={updateElement}
      />

      {/* 画布信息 */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#6b7280',
          zIndex: 1000,
        }}
      >
        元素数: {elements.length} | 缩放: {Math.round(viewport.scale * 100)}% | 
        位置: ({Math.round(viewport.x)}, {Math.round(viewport.y)})
      </div>
    </div>
  );
}

export default App;
