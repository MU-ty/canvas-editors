import React, { useEffect, useRef, useState } from 'react';
import type { TextElement } from '../types';

interface TextEditorProps {
  element: TextElement;
  viewport: { x: number; y: number; scale: number };
  onUpdate: (content: string) => void;
  onClose: () => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  element,
  viewport,
  onUpdate,
  onClose,
}) => {
  const [text, setText] = useState(element.content);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleBlur = () => {
    if (text.trim()) {
      onUpdate(text);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
  };

  const left = element.x * viewport.scale + viewport.x;
  const top = element.y * viewport.scale + viewport.y;
  const width = element.width * viewport.scale;

  return (
    <textarea
      ref={inputRef}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        minHeight: element.height * viewport.scale,
        fontSize: element.style.fontSize * viewport.scale,
        fontFamily: element.style.fontFamily,
        color: element.style.color,
        backgroundColor: element.style.backgroundColor || 'transparent',
        fontWeight: element.style.bold ? 'bold' : 'normal',
        fontStyle: element.style.italic ? 'italic' : 'normal',
        textDecoration: element.style.underline ? 'underline' : element.style.strikethrough ? 'line-through' : 'none',
        border: '2px solid #3b82f6',
        outline: 'none',
        padding: '4px',
        resize: 'none',
        overflow: 'hidden',
        zIndex: 1000,
      }}
    />
  );
};
