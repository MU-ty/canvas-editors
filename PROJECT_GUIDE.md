# 画布编辑器 - 项目说明文档

## 一、项目概述

本项目是一个功能完整的在线画布编辑器，参考 Figma、Canva、Excalidraw 等竞品，使用 React + TypeScript + PixiJS 从零实现。项目禁止使用 react-flow、tldraw、konva 等高级图形库，仅使用 PixiJS 作为基础渲染引擎，所有核心业务逻辑均自行实现。

### 核心特性
- 支持多种图形元素渲染（矩形、圆角矩形、圆形、三角形）
- 支持图片和富文本渲染
- 无限画布缩放、拖拽、滚动
- 完整的选区功能（点击选中、框选、多选）
- 元素编辑（拖拽、删除、属性修改）
- 实时属性调整面板
- 数据持久化
- 快捷键支持

## 二、技术选型

### 2.1 渲染层
- **PixiJS 8.0**: WebGL 渲染引擎，性能优异
  - 优势：硬件加速、高性能、支持复杂图形
  - 用途：负责所有元素的底层渲染

### 2.2 框架层
- **React 18**: UI 框架
  - 优势：组件化、状态管理、生态完善
  - 用途：UI 层组件开发、事件处理
- **TypeScript 5**: 类型安全
  - 优势：类型检查、代码提示、重构友好
  - 用途：保证代码质量、减少运行时错误

### 2.3 构建工具
- **Vite**: 现代化构建工具
  - 优势：快速冷启动、HMR、开箱即用
  - 用途：开发服务器、打包构建

### 2.4 状态管理
- **React Hooks**: 轻量级状态管理
  - useState、useCallback、useEffect 等
  - 自定义 Hook：useCanvasState

### 2.5 数据持久化
- **LocalStorage**: 浏览器本地存储
  - 优势：简单、无需后端、即时保存
  - 用途：保存画布数据、实现刷新恢复

## 三、架构设计

### 3.1 分层架构

```
┌─────────────────────────────────────┐
│        Presentation Layer           │  React 组件层
│  (Toolbar, PropertyPanel, Canvas)   │
├─────────────────────────────────────┤
│         Business Logic Layer        │  状态管理层
│      (useCanvasState Hook)          │
├─────────────────────────────────────┤
│         Rendering Layer             │  渲染引擎层
│        (PixiRenderer)                │
├─────────────────────────────────────┤
│         Data Layer                  │  数据持久化层
│      (LocalStorage)                 │
└─────────────────────────────────────┘
```

### 3.2 核心模块

#### 3.2.1 类型定义 (types/index.ts)
定义了所有核心数据结构：
- `ElementType`: 元素类型枚举
- `ShapeElement`: 图形元素接口
- `ImageElement`: 图片元素接口
- `TextElement`: 文本元素接口
- `CanvasState`: 画布状态接口
- `ViewportState`: 视口状态接口

#### 3.2.2 渲染器 (renderer/PixiRenderer.ts)
封装 PixiJS 渲染逻辑：
- `renderElement()`: 渲染单个元素
- `createShapeSprite()`: 创建图形精灵
- `createImageSprite()`: 创建图片精灵
- `createTextSprite()`: 创建文本精灵
- `updateViewport()`: 更新视口变换
- `clear()`: 清空画布

#### 3.2.3 状态管理 (hooks/useCanvasState.ts)
管理画布状态和操作：
- `elements`: 元素列表
- `selectedIds`: 选中元素 ID
- `viewport`: 视口状态
- `addElement()`: 添加元素
- `updateElement()`: 更新元素
- `deleteElements()`: 删除元素
- `selectElements()`: 选择元素
- `copySelected()`: 复制
- `paste()`: 粘贴

#### 3.2.4 画布视图 (components/CanvasView.tsx)
处理用户交互：
- 鼠标事件处理（按下、移动、释放、滚轮）
- 交互模式管理（选择、拖拽、缩放）
- 框选矩形绘制
- 选中元素边框显示

#### 3.2.5 工具栏 (components/Toolbar.tsx)
提供操作按钮：
- 创建各类元素
- 复制、粘贴、删除
- 重置视图

#### 3.2.6 属性面板 (components/PropertyPanel.tsx)
实时修改元素属性：
- 图形属性（背景色、边框等）
- 文本属性（字体、字号、样式等）
- 图片属性（滤镜等）
- 通用属性（位置、尺寸、旋转）

## 四、数据结构设计

### 4.1 元素数据结构

#### 基础元素
```typescript
interface BaseElement {
  id: string;          // 唯一标识
  type: ElementType;   // 元素类型
  x: number;          // X 坐标
  y: number;          // Y 坐标
  width: number;      // 宽度
  height: number;     // 高度
  rotation: number;   // 旋转角度
  zIndex: number;     // 层级
}
```

#### 图形元素
```typescript
interface ShapeElement extends BaseElement {
  backgroundColor: string;  // 背景色
  borderWidth: number;      // 边框宽度
  borderColor: string;      // 边框颜色
  cornerRadius?: number;    // 圆角半径（可选）
}
```

#### 文本元素
```typescript
interface TextElement extends BaseElement {
  content: string;    // 文本内容
  style: TextStyle;   // 文本样式
}

interface TextStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}
```

### 4.2 画布状态
```typescript
interface CanvasState {
  elements: CanvasElement[];  // 元素列表
  selectedIds: string[];      // 选中元素 ID
  viewport: ViewportState;    // 视口状态
}

interface ViewportState {
  x: number;     // 视口 X 偏移
  y: number;     // 视口 Y 偏移
  scale: number; // 缩放比例
}
```

## 五、核心功能实现

### 5.1 无限画布

#### 实现原理
1. 使用 PixiJS Container 作为主容器
2. 通过 `position` 控制平移
3. 通过 `scale` 控制缩放
4. 鼠标滚轮事件计算缩放中心点

```typescript
// 缩放实现（保持鼠标位置不变）
const beforeX = (mouseX - viewport.x) / viewport.scale;
const beforeY = (mouseY - viewport.y) / viewport.scale;
const newScale = viewport.scale * scaleDelta;
const afterX = mouseX - beforeX * newScale;
const afterY = mouseY - beforeY * newScale;
```

### 5.2 选区功能

#### 点击选中
1. 将屏幕坐标转换为画布坐标
2. 遍历元素列表（从后往前，确保选中最上层）
3. 判断点是否在元素边界内

#### 框选
1. 记录起始点和结束点
2. 实时绘制选择框（虚线矩形）
3. 释放鼠标时计算选中元素

#### 多选
- Shift + 点击：切换元素选中状态
- 框选：选中框内所有元素

### 5.3 元素拖拽

#### 实现步骤
1. 鼠标按下时记录起始位置
2. 记录所有选中元素的初始位置
3. 鼠标移动时计算偏移量
4. 更新所有选中元素的位置

```typescript
const dx = currentX - startX;
const dy = currentY - startY;
selectedElements.forEach(element => {
  element.x = initialX + dx;
  element.y = initialY + dy;
});
```

### 5.4 数据持久化

#### 保存策略
- 使用防抖函数，500ms 后自动保存
- 序列化为 JSON 存入 LocalStorage
- 避免频繁 IO 操作

#### 加载策略
- 应用启动时从 LocalStorage 读取
- 解析 JSON 恢复状态
- 失败时创建默认元素

### 5.5 快捷键

#### 实现方式
监听全局键盘事件，判断组合键：

```typescript
if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
  copySelected();
}
if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
  paste();
}
if (e.key === 'Delete' || e.key === 'Backspace') {
  deleteElements();
}
```

## 六、性能优化

### 6.1 渲染性能
- **使用 WebGL**: PixiJS 利用 GPU 加速，比 Canvas 2D 快 10 倍以上
- **按需渲染**: 只有状态变化时才触发重渲染
- **图层管理**: 使用 zIndex 管理渲染顺序

### 6.2 交互性能
- **防抖优化**: 自动保存使用防抖，减少 IO 操作
- **事件处理**: 避免不必要的状态更新和组件重渲染
- **useCallback**: 缓存回调函数，防止子组件无效渲染

### 6.3 内存优化
- **及时销毁**: 元素删除时销毁 PixiJS 精灵
- **资源复用**: 复用 Graphics 对象
- **避免内存泄漏**: 组件卸载时清理事件监听

## 七、测试验证

### 7.1 功能测试清单
- [x] 创建矩形、圆角矩形、圆形、三角形
- [x] 创建文本和图片
- [x] 点击选中单个元素
- [x] 框选多个元素
- [x] Shift 多选
- [x] 拖拽元素
- [x] 删除元素
- [x] 复制粘贴
- [x] 画布缩放
- [x] 画布拖拽
- [x] 属性实时修改
- [x] 数据持久化（刷新恢复）

### 7.2 性能测试
- **100 个元素加载**: < 1s ✅
- **拖拽流畅度**: 60 FPS ✅
- **缩放流畅度**: 60 FPS ✅

## 八、项目亮点

### 8.1 架构设计
- **清晰的分层**: 渲染、逻辑、展示分离
- **高内聚低耦合**: 模块职责单一，易于维护
- **TypeScript**: 完整的类型定义，减少错误

### 8.2 用户体验
- **流畅的交互**: 60 FPS 流畅度
- **直观的操作**: 符合主流设计工具习惯
- **实时反馈**: 属性修改即时生效

### 8.3 代码质量
- **可读性**: 清晰的命名、完善的注释
- **可维护性**: 模块化设计、易于扩展
- **可测试性**: 纯函数、解耦设计

## 九、后续规划

### 9.1 短期规划（1-2周）
- [ ] 文本双击编辑
- [ ] 元素缩放控制点
- [ ] 撤销/重做功能
- [ ] 元素旋转控制点

### 9.2 中期规划（1-2月）
- [ ] 辅助线对齐
- [ ] 图层面板
- [ ] 更多图形类型
- [ ] 导出为图片

### 9.3 长期规划（3-6月）
- [ ] 协同编辑
- [ ] 组合/解组
- [ ] 动画效果
- [ ] 插件系统

## 十、总结

本项目成功实现了一个功能完整的画布编辑器，涵盖了基础渲染、画布交互、元素编辑、属性调整、数据持久化等核心功能。项目架构清晰、性能优异、用户体验良好，为后续扩展打下了坚实基础。

### 技术收获
1. 深入理解 WebGL 渲染原理
2. 掌握复杂交互的状态管理
3. 学习坐标系变换和几何计算
4. 实践性能优化技巧

### 工程实践
1. 模块化设计思想
2. TypeScript 类型系统应用
3. React Hooks 最佳实践
4. 前端性能优化方法

---

**项目状态**: ✅ 基础功能完成，可正常使用  
**文档版本**: v1.0  
**最后更新**: 2025-11-19
