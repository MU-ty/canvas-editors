import React from 'react';
import type { CanvasElement } from '../types';
import { getBoundingBox } from '../utils/helpers';

interface ResizeHandlesProps {
  selectedElements: CanvasElement[];
  viewport: { x: number; y: number; scale: number };
  onResizeStart: (handle: string, e: React.MouseEvent) => void;
}

export const ResizeHandles: React.FC<ResizeHandlesProps> = ({
  selectedElements,
  viewport,
  onResizeStart,
}) => {
  if (selectedElements.length === 0) return null;

  const bbox = getBoundingBox(selectedElements);
  const left = bbox.x * viewport.scale + viewport.x;
  const top = bbox.y * viewport.scale + viewport.y;
  const width = bbox.width * viewport.scale;
  const height = bbox.height * viewport.scale;

  const handleSize = 10;
  const handles = [
    { pos: 'tl', x: left - handleSize / 2, y: top - handleSize / 2, cursor: 'nwse-resize' },
    { pos: 'tr', x: left + width - handleSize / 2, y: top - handleSize / 2, cursor: 'nesw-resize' },
    { pos: 'bl', x: left - handleSize / 2, y: top + height - handleSize / 2, cursor: 'nesw-resize' },
    { pos: 'br', x: left + width - handleSize / 2, y: top + height - handleSize / 2, cursor: 'nwse-resize' },
    { pos: 't', x: left + width / 2 - handleSize / 2, y: top - handleSize / 2, cursor: 'ns-resize' },
    { pos: 'b', x: left + width / 2 - handleSize / 2, y: top + height - handleSize / 2, cursor: 'ns-resize' },
    { pos: 'l', x: left - handleSize / 2, y: top + height / 2 - handleSize / 2, cursor: 'ew-resize' },
    { pos: 'r', x: left + width - handleSize / 2, y: top + height / 2 - handleSize / 2, cursor: 'ew-resize' },
  ];

  return (
    <React.Fragment>
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width,
          height,
          border: '2px solid #3b82f6',
          pointerEvents: 'none',
          boxSizing: 'border-box',
        }}
      />
      
      {handles.map((handle) => (
        <div
          key={handle.pos}
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeStart(handle.pos, e);
          }}
          style={{
            position: 'absolute',
            left: handle.x,
            top: handle.y,
            width: handleSize,
            height: handleSize,
            backgroundColor: 'white',
            border: '2px solid #3b82f6',
            borderRadius: '3px',
            cursor: handle.cursor,
            zIndex: 1001,
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            transition: 'transform 0.1s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        />
      ))}
    </React.Fragment>
  );
};
