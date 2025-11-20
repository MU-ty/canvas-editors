import { ElementType } from '../types';

interface ToolbarProps {
  onCreateElement: (type: ElementType) => void;
  onUploadImage: (file: File) => void;
  onDelete: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onResetView: () => void;
  hasSelection: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onCreateElement,
  onUploadImage,
  onDelete,
  onCopy,
  onPaste,
  onResetView,
  hasSelection,
}) => {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onUploadImage(file);
    }
    // 重置input以允许选择同一文件
    e.target.value = '';
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        backgroundColor: 'white',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        maxWidth: '800px',
        zIndex: 1000,
      }}
    >
      <div style={{ display: 'flex', gap: '4px', borderRight: '1px solid #e5e7eb', paddingRight: '8px' }}>
        <button
          onClick={() => onCreateElement(ElementType.RECTANGLE)}
          style={buttonStyle}
          title="创建矩形"
        >
          □
        </button>
        <button
          onClick={() => onCreateElement(ElementType.ROUNDED_RECTANGLE)}
          style={buttonStyle}
          title="创建圆角矩形"
        >
          ▢
        </button>
        <button
          onClick={() => onCreateElement(ElementType.CIRCLE)}
          style={buttonStyle}
          title="创建圆形"
        >
          ○
        </button>
        <button
          onClick={() => onCreateElement(ElementType.TRIANGLE)}
          style={buttonStyle}
          title="创建三角形"
        >
          △
        </button>
        <button
          onClick={() => onCreateElement(ElementType.TEXT)}
          style={buttonStyle}
          title="创建文本"
        >
          T
        </button>
        <label
          style={{
            ...buttonStyle,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="上传图片"
        >
          🖼️
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: '4px', borderRight: '1px solid #e5e7eb', paddingRight: '8px' }}>
        <button
          onClick={onCopy}
          disabled={!hasSelection}
          style={buttonStyle}
          title="复制 (Ctrl+C)"
        >
          📋
        </button>
        <button
          onClick={onPaste}
          style={buttonStyle}
          title="粘贴 (Ctrl+V)"
        >
          📄
        </button>
        <button
          onClick={onDelete}
          disabled={!hasSelection}
          style={{ ...buttonStyle, color: '#ef4444' }}
          title="删除 (Delete)"
        >
          🗑️
        </button>
      </div>

      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={onResetView}
          style={buttonStyle}
          title="重置视图"
        >
          🔄
        </button>
      </div>

      <div style={{ fontSize: '12px', color: '#6b7280', alignSelf: 'center', marginLeft: '8px' }}>
        提示: Alt+拖拽 = 移动画布 | 滚轮 = 缩放 | Shift+点击 = 多选
      </div>
    </div>
  );
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  backgroundColor: 'white',
  cursor: 'pointer',
  fontSize: '16px',
  transition: 'all 0.2s',
  minWidth: '40px',
};
