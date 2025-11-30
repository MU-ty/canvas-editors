import React from 'react';
import type { ShapeElement } from '../types';

interface ArrowHandlesProps {
  element: ShapeElement;
  viewport: { x: number; y: number; scale: number };
  onUpdateArrowPoint: (point: 'start' | 'end', x: number, y: number) => void;
}

export const ArrowHandles: React.FC<ArrowHandlesProps> = ({
  element,
  viewport,
  onUpdateArrowPoint,
}) => {
  if (element.type !== 'arrow' || !element.arrowStart || !element.arrowEnd) {
    return null;
  }

  // 计算起点和终点在屏幕上的位置
  const startScreenX = (element.x + element.arrowStart.x) * viewport.scale + viewport.x;
  const startScreenY = (element.y + element.arrowStart.y) * viewport.scale + viewport.y;
  const endScreenX = (element.x + element.arrowEnd.x) * viewport.scale + viewport.x;
  const endScreenY = (element.y + element.arrowEnd.y) * viewport.scale + viewport.y;

  const handleSize = 10;

  const handleMouseDown = (point: 'start' | 'end') => (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const initialPoint = point === 'start' ? element.arrowStart : element.arrowEnd;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / viewport.scale;
      const deltaY = (moveEvent.clientY - startY) / viewport.scale;
      
      const newX = initialPoint!.x + deltaX;
      const newY = initialPoint!.y + deltaY;
      
      onUpdateArrowPoint(point, newX, newY);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <>
      {/* 起点控制点 */}
      <div
        onMouseDown={handleMouseDown('start')}
        style={{
          position: 'absolute',
          left: startScreenX - handleSize / 2,
          top: startScreenY - handleSize / 2,
          width: handleSize,
          height: handleSize,
          backgroundColor: '#10b981',
          border: '2px solid white',
          borderRadius: '50%',
          cursor: 'move',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          zIndex: 1001,
        }}
        title="拖动调整箭头起点"
      />
      
      {/* 终点控制点 */}
      <div
        onMouseDown={handleMouseDown('end')}
        style={{
          position: 'absolute',
          left: endScreenX - handleSize / 2,
          top: endScreenY - handleSize / 2,
          width: handleSize,
          height: handleSize,
          backgroundColor: '#ef4444',
          border: '2px solid white',
          borderRadius: '50%',
          cursor: 'move',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          zIndex: 1001,
        }}
        title="拖动调整箭头终点"
      />
    </>
  );
};
