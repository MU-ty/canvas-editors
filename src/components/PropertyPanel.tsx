import type {
  CanvasElement,
  ShapeElement,
  TextElement,
  ImageElement,
} from '../types';
import { ElementType, ImageFilter } from '../types';

interface PropertyPanelProps {
  selectedElements: CanvasElement[];
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedElements,
  onUpdateElement,
}) => {
  if (selectedElements.length === 0) {
    return null;
  }

  const element = selectedElements[0];

  const renderShapeProperties = (shape: ShapeElement) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div>
        <label style={labelStyle}>背景色:</label>
        <input
          type="color"
          value={shape.backgroundColor}
          onChange={(e) =>
            onUpdateElement(shape.id, { backgroundColor: e.target.value })
          }
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>边框宽度:</label>
        <input
          type="number"
          value={shape.borderWidth}
          onChange={(e) =>
            onUpdateElement(shape.id, { borderWidth: Number(e.target.value) })
          }
          min="0"
          max="20"
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>边框颜色:</label>
        <input
          type="color"
          value={shape.borderColor}
          onChange={(e) =>
            onUpdateElement(shape.id, { borderColor: e.target.value })
          }
          style={inputStyle}
        />
      </div>
      {shape.type === ElementType.ROUNDED_RECTANGLE && (
        <div>
          <label style={labelStyle}>圆角半径:</label>
          <input
            type="number"
            value={shape.cornerRadius || 10}
            onChange={(e) =>
              onUpdateElement(shape.id, { cornerRadius: Number(e.target.value) })
            }
            min="0"
            max="100"
            style={inputStyle}
          />
        </div>
      )}
    </div>
  );

  const renderTextProperties = (text: TextElement) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div>
        <label style={labelStyle}>字体:</label>
        <select
          value={text.style.fontFamily}
          onChange={(e) =>
            onUpdateElement(text.id, {
              style: { ...text.style, fontFamily: e.target.value },
            })
          }
          style={inputStyle}
        >
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}>字号:</label>
        <input
          type="number"
          value={text.style.fontSize}
          onChange={(e) =>
            onUpdateElement(text.id, {
              style: { ...text.style, fontSize: Number(e.target.value) },
            })
          }
          min="8"
          max="120"
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>颜色:</label>
        <input
          type="color"
          value={text.style.color}
          onChange={(e) =>
            onUpdateElement(text.id, {
              style: { ...text.style, color: e.target.value },
            })
          }
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>背景色:</label>
        <input
          type="color"
          value={text.style.backgroundColor || '#ffffff'}
          onChange={(e) =>
            onUpdateElement(text.id, {
              style: { ...text.style, backgroundColor: e.target.value },
            })
          }
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() =>
            onUpdateElement(text.id, {
              style: { ...text.style, bold: !text.style.bold },
            })
          }
          style={{
            ...checkboxButtonStyle,
            backgroundColor: text.style.bold ? '#3b82f6' : 'white',
            color: text.style.bold ? 'white' : 'black',
          }}
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() =>
            onUpdateElement(text.id, {
              style: { ...text.style, italic: !text.style.italic },
            })
          }
          style={{
            ...checkboxButtonStyle,
            backgroundColor: text.style.italic ? '#3b82f6' : 'white',
            color: text.style.italic ? 'white' : 'black',
          }}
        >
          <em>I</em>
        </button>
        <button
          onClick={() =>
            onUpdateElement(text.id, {
              style: { ...text.style, underline: !text.style.underline },
            })
          }
          style={{
            ...checkboxButtonStyle,
            backgroundColor: text.style.underline ? '#3b82f6' : 'white',
            color: text.style.underline ? 'white' : 'black',
          }}
        >
          <u>U</u>
        </button>
        <button
          onClick={() =>
            onUpdateElement(text.id, {
              style: { ...text.style, strikethrough: !text.style.strikethrough },
            })
          }
          style={{
            ...checkboxButtonStyle,
            backgroundColor: text.style.strikethrough ? '#3b82f6' : 'white',
            color: text.style.strikethrough ? 'white' : 'black',
          }}
        >
          <s>S</s>
        </button>
      </div>
    </div>
  );

  const renderImageProperties = (image: ImageElement) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div>
        <label style={labelStyle}>图片地址:</label>
        <input
          type="text"
          value={image.src}
          onChange={(e) => onUpdateElement(image.id, { src: e.target.value })}
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>滤镜:</label>
        <select
          value={image.filter}
          onChange={(e) =>
            onUpdateElement(image.id, { filter: e.target.value as ImageFilter })
          }
          style={inputStyle}
        >
          <option value={ImageFilter.NONE}>无</option>
          <option value={ImageFilter.GRAYSCALE}>灰度</option>
          <option value={ImageFilter.SEPIA}>褐色</option>
          <option value={ImageFilter.BLUR}>模糊</option>
        </select>
      </div>
    </div>
  );

  const renderCommonProperties = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={labelStyle}>X:</label>
          <input
            type="number"
            value={Math.round(element.x)}
            onChange={(e) => onUpdateElement(element.id, { x: Number(e.target.value) })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Y:</label>
          <input
            type="number"
            value={Math.round(element.y)}
            onChange={(e) => onUpdateElement(element.id, { y: Number(e.target.value) })}
            style={inputStyle}
          />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={labelStyle}>宽度:</label>
          <input
            type="number"
            value={Math.round(element.width)}
            onChange={(e) => onUpdateElement(element.id, { width: Number(e.target.value) })}
            min="10"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>高度:</label>
          <input
            type="number"
            value={Math.round(element.height)}
            onChange={(e) => onUpdateElement(element.id, { height: Number(e.target.value) })}
            min="10"
            style={inputStyle}
          />
        </div>
      </div>
      <div>
        <label style={labelStyle}>旋转角度:</label>
        <input
          type="number"
          value={element.rotation}
          onChange={(e) => onUpdateElement(element.id, { rotation: Number(e.target.value) })}
          style={inputStyle}
        />
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: 'white',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        minWidth: '250px',
        maxWidth: '300px',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
        zIndex: 1000,
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>
        属性面板
      </h3>
      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
        {selectedElements.length > 1
          ? `已选中 ${selectedElements.length} 个元素`
          : `类型: ${element.type}`}
      </div>

      {renderCommonProperties()}

      {element.type === ElementType.RECTANGLE && renderShapeProperties(element as ShapeElement)}
      {element.type === ElementType.ROUNDED_RECTANGLE && renderShapeProperties(element as ShapeElement)}
      {element.type === ElementType.CIRCLE && renderShapeProperties(element as ShapeElement)}
      {element.type === ElementType.TRIANGLE && renderShapeProperties(element as ShapeElement)}
      {element.type === ElementType.TEXT && renderTextProperties(element as TextElement)}
      {element.type === ElementType.IMAGE && renderImageProperties(element as ImageElement)}
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '500',
  marginBottom: '4px',
  color: '#374151',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '14px',
  boxSizing: 'border-box',
};

const checkboxButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px',
  transition: 'all 0.2s',
};
