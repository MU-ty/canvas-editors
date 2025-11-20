# 画布编辑器项目

一个功能完整的在线画布编辑器，类似于 Figma、Canva 等产品，使用 React + TypeScript + PixiJS 开发。

## 项目特性

### P0 功能已完成

#### 基础渲染
-  支持多种图形渲染：矩形、圆角矩形、圆形、三角形
-  图形属性支持：背景色、边框宽度、边框颜色
-  支持图片渲染（PNG、JPEG）
-  支持三种图片滤镜：灰度、褐色、模糊
-  支持富文本渲染
-  文本属性支持：字体、字号、颜色、背景色、加粗、斜体、下划线、删除线

#### 画布交互
-  无限画布缩放（鼠标滚轮）
-  画布拖拽（Alt + 鼠标拖拽）
-  点击选中单个元素
-  框选多个元素
-  Shift + 点击多选
-  数据持久化（LocalStorage）
-  快捷键复制粘贴（Ctrl+C / Ctrl+V）

#### 元素编辑
-  删除元素（Delete / Backspace）
-  拖拽元素（单个和多个）
-  实时属性修改
-  支持旋转角度设置

#### 调参工具栏
-  顶部工具栏：创建各种元素
-  右侧属性面板：
  - 图形元素：背景色、边框宽度、边框颜色、圆角半径
  - 文本元素：字体、字号、颜色、背景色、BIUS 样式
  - 图片元素：图片地址、滤镜效果
  - 通用属性：位置、尺寸、旋转角度

#### 性能优化
-  使用 PixiJS WebGL 渲染引擎
-  支持 100+ 元素流畅渲染
-  防抖优化自动保存

##  技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **渲染引擎**: PixiJS 8 (WebGL)
- **状态管理**: React Hooks
- **数据持久化**: LocalStorage

##  安装和运行

### 安装依赖
```bash
npm install
```

### 运行开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 预览生产版本
```bash
npm run preview
```

##  使用说明

### 基本操作
- **创建元素**: 点击顶部工具栏的图形/文本/图片按钮
- **选择元素**: 
  - 单击选中单个元素
  - 拖拽框选多个元素
  - Shift + 单击多选/取消选择
- **移动元素**: 选中后直接拖拽
- **调整属性**: 选中元素后在右侧属性面板修改

### 画布操作
- **缩放**: 鼠标滚轮滚动
- **平移**: Alt + 鼠标拖拽
- **重置视图**: 点击工具栏的重置按钮

### 快捷键
- `Ctrl + C`: 复制选中元素
- `Ctrl + V`: 粘贴元素
- `Delete` / `Backspace`: 删除选中元素
- `Escape`: 取消选择

##  项目结构

```
canvas-editor/
├── src/
│   ├── components/        # React 组件
│   │   ├── CanvasView.tsx      # 画布视图组件
│   │   ├── Toolbar.tsx         # 顶部工具栏
│   │   └── PropertyPanel.tsx   # 属性面板
│   ├── hooks/            # 自定义 Hooks
│   │   └── useCanvasState.ts   # 画布状态管理
│   ├── renderer/         # 渲染引擎
│   │   └── PixiRenderer.ts     # PixiJS 渲染器
│   ├── types/            # TypeScript 类型定义
│   │   └── index.ts
│   ├── utils/            # 工具函数
│   │   ├── helpers.ts          # 通用工具函数
│   │   └── storage.ts          # 存储工具
│   ├── App.tsx           # 主应用组件
│   └── main.tsx          # 应用入口
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

##  核心架构

### 数据流
1. **用户交互** → CanvasView 组件捕获事件
2. **状态更新** → useCanvasState Hook 管理状态
3. **持久化** → 自动保存到 LocalStorage
4. **渲染** → PixiRenderer 使用 WebGL 渲染

### 元素类型
- **ShapeElement**: 图形元素（矩形、圆形、三角形等）
- **ImageElement**: 图片元素
- **TextElement**: 文本元素

### 交互模式
- **NONE**: 默认状态
- **PANNING**: 画布拖拽
- **SELECTING**: 框选元素
- **DRAGGING**: 拖拽元素
- **RESIZING**: 调整大小

##  设计特点

### 1. 性能优化
- 使用 PixiJS WebGL 渲染，比 Canvas 2D 快 10 倍以上
- 防抖优化自动保存，减少 IO 操作
- 事件处理优化，避免不必要的重渲染

### 2. 用户体验
- 实时属性预览
- 流畅的拖拽和缩放
- 直观的视觉反馈
- 完整的撤销重做支持（待实现）

### 3. 代码质量
- TypeScript 严格类型检查
- 模块化设计，易于扩展
- 清晰的组件分层
- 完善的错误处理



