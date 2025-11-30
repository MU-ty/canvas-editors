import React, { useEffect, useRef, useState } from 'react';
import type { CanvasElement, TextElement, ShapeElement, TextRangeStyle } from '../types';

interface RichTextEditorProps {
  element: CanvasElement | any;
  viewport: { x: number; y: number; scale: number };
  onUpdate: (content: string, rangeStyles?: TextRangeStyle[]) => void;
  onClose: () => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  element,
  viewport,
  onUpdate,
  onClose,
}) => {
  const [text, setText] = useState((element as any).content || '');
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [rangeStyles, setRangeStyles] = useState<TextRangeStyle[]>(
    (element as any).rangeStyles || (element as any).textRangeStyles || []
  );
  const [activeFormats, setActiveFormats] = useState<
    {
      bold: boolean;
      italic: boolean;
      underline: boolean;
      strikethrough: boolean;
    }
  >({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  // 更新活跃格式
  const updateActiveFormats = () => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;

    setSelectionStart(start);
    setSelectionEnd(end);

    // 检查当前选中范围内的格式
    const relevantStyles = rangeStyles.filter(
      (style) => !(style.end <= start || style.start >= end)
    );

    const hasFormat = (format: keyof typeof activeFormats) => {
      return relevantStyles.some((style) => style[format] === true);
    };

    setActiveFormats({
      bold: hasFormat('bold'),
      italic: hasFormat('italic'),
      underline: hasFormat('underline'),
      strikethrough: hasFormat('strikethrough'),
    });
  };

  const applyFormat = (format: keyof typeof activeFormats) => {
    if (selectionStart === selectionEnd) return; // 没有选中文本

    const newStyles = rangeStyles.filter((style) => {
      // 移除与当前范围重叠的相同格式
      if (style[format] && !(style.end <= selectionStart || style.start >= selectionEnd)) {
        return false;
      }
      return true;
    });

    // 添加新格式
    newStyles.push({
      start: selectionStart,
      end: selectionEnd,
      [format]: true,
    } as TextRangeStyle);

    setRangeStyles(newStyles);
    setActiveFormats((prev) => ({
      ...prev,
      [format]: !prev[format],
    }));

    // 重新聚焦
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(selectionStart, selectionEnd);
      }
    }, 0);
  };

  const handleBlur = () => {
    onUpdate(text, rangeStyles.length > 0 ? rangeStyles : undefined);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      e.stopPropagation();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleBlur();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      e.stopPropagation();
      applyFormat('bold');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      e.stopPropagation();
      applyFormat('italic');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
      e.preventDefault();
      e.stopPropagation();
      applyFormat('underline');
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.stopPropagation();
    }
  };

  const left = element.x * viewport.scale + viewport.x;
  const top = element.y * viewport.scale + viewport.y;
  const width = element.width * viewport.scale;
  const height = element.height * viewport.scale;

  const styleSource =
    element.type === 'text' ? (element as TextElement).style : (element as ShapeElement).textStyle;

  const fontSizeScaled = (styleSource?.fontSize || 16) * viewport.scale;

  return (
    <div style={{ position: 'absolute', left, top, width, height, zIndex: 10000 }}>
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '8px',
          backgroundColor: '#f3f4f6',
          borderTop: '2px solid #3b82f6',
          borderLeft: '2px solid #3b82f6',
          borderRight: '2px solid #3b82f6',
        }}
      >
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            applyFormat('bold');
          }}
          style={{
            padding: '4px 8px',
            backgroundColor: activeFormats.bold ? '#3b82f6' : '#ffffff',
            color: activeFormats.bold ? '#ffffff' : '#000000',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
          }}
          title="粗体 (Ctrl+B)"
        >
          B
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            applyFormat('italic');
          }}
          style={{
            padding: '4px 8px',
            backgroundColor: activeFormats.italic ? '#3b82f6' : '#ffffff',
            color: activeFormats.italic ? '#ffffff' : '#000000',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            fontStyle: 'italic',
            fontSize: '12px',
          }}
          title="斜体 (Ctrl+I)"
        >
          I
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            applyFormat('underline');
          }}
          style={{
            padding: '4px 8px',
            backgroundColor: activeFormats.underline ? '#3b82f6' : '#ffffff',
            color: activeFormats.underline ? '#ffffff' : '#000000',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontSize: '12px',
          }}
          title="下划线 (Ctrl+U)"
        >
          U
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            applyFormat('strikethrough');
          }}
          style={{
            padding: '4px 8px',
            backgroundColor: activeFormats.strikethrough ? '#3b82f6' : '#ffffff',
            color: activeFormats.strikethrough ? '#ffffff' : '#000000',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            textDecoration: 'line-through',
            fontSize: '12px',
          }}
          title="删除线"
        >
          S
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onSelect={updateActiveFormats}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={updateActiveFormats}
        style={{
          position: 'absolute',
          top: 'calc(100% - 2px)',
          left: 0,
          right: 0,
          width: '100%',
          height: `calc(100% - 40px)`,
          minHeight: 'auto',
          fontSize: fontSizeScaled,
          fontFamily: styleSource?.fontFamily || 'Arial',
          color: styleSource?.color || '#000000',
          backgroundColor: styleSource?.backgroundColor || 'transparent',
          fontWeight: styleSource?.bold ? 'bold' : 'normal',
          fontStyle: styleSource?.italic ? 'italic' : 'normal',
          textDecoration: styleSource?.underline ? 'underline' : styleSource?.strikethrough ? 'line-through' : 'none',
          border: '2px solid #3b82f6',
          borderTop: 'none',
          outline: 'none',
          padding: '6px 8px',
          resize: 'none',
          boxSizing: 'border-box',
          fontSizeAdjust: 'none',
          zIndex: 10001,
        }}
      />
    </div>
  );
};
