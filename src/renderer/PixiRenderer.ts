import * as PIXI from 'pixi.js';
import type {
  CanvasElement,
  ShapeElement,
  ImageElement,
  TextElement,
} from '../types';

export class PixiRenderer {
  private app: PIXI.Application | null = null;
  private elementSprites: Map<string, PIXI.Container> = new Map();
  private mainContainer: PIXI.Container;
  private initPromise: Promise<void>;

  constructor(canvas: HTMLCanvasElement) {
    this.mainContainer = new PIXI.Container();
    
    // 异步初始化
    this.initPromise = this.init(canvas);
  }

  private async init(canvas: HTMLCanvasElement): Promise<void> {
    try {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      const app = new PIXI.Application();
      await app.init({
        canvas: canvas,
        backgroundColor: 0xffffff,
        width: width,
        height: height,
        antialias: true,
        resolution: dpr,
        autoDensity: true,
      });
      
      this.app = app;
      this.app.stage.addChild(this.mainContainer);
      
      // 监听窗口大小变化
      window.addEventListener('resize', this.handleResize);
    } catch (err) {
      console.error('Failed to initialize PixiJS:', err);
    }
  }
  
  private handleResize = () => {
    if (!this.app) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.app.renderer.resize(width, height);
  };

  // 等待初始化完成
  public async waitForInit(): Promise<void> {
    await this.initPromise;
  }

  // 渲染单个元素
  public async renderElement(element: CanvasElement): Promise<void> {
    if (!this.app) return;
    
    // 如果元素已存在，先移除
    this.removeElement(element.id);

    let container: PIXI.Container;

    switch (element.type) {
      case 'rectangle':
      case 'rounded-rectangle':
      case 'circle':
      case 'triangle':
      case 'arrow':
        container = this.createShapeSprite(element as ShapeElement);
        break;
      case 'image':
        container = await this.createImageSprite(element as ImageElement);
        break;
      case 'text':
        container = this.createTextSprite(element as TextElement);
        break;
      default:
        return;
    }

    // 设置中心点为旋转中心
    container.pivot.set(element.width / 2, element.height / 2);
    // 位置要调整到元素的中心
    container.position.set(element.x + element.width / 2, element.y + element.height / 2);
    container.rotation = (element.rotation * Math.PI) / 180;
    container.zIndex = element.zIndex;

    this.mainContainer.addChild(container);
    this.elementSprites.set(element.id, container);
    this.mainContainer.sortChildren();
  }

  // 创建图形精灵
  private createShapeSprite(element: ShapeElement): PIXI.Container {
    const container = new PIXI.Container();
    const graphics = new PIXI.Graphics();
    let arrowHead: PIXI.Graphics | null = null;

    // 解析颜色
    const bgColor = this.parseColor(element.backgroundColor);
    const borderColor = this.parseColor(element.borderColor);

    // 绘制形状
    switch (element.type) {
      case 'rectangle':
        // 填充
        graphics.beginFill(bgColor);
        graphics.drawRect(0, 0, element.width, element.height);
        graphics.endFill();
        // 边框
        if (element.borderWidth > 0) {
          graphics.lineStyle(element.borderWidth, borderColor);
          graphics.drawRect(0, 0, element.width, element.height);
          graphics.stroke({ width: element.borderWidth, color: borderColor });
        }
        break;
      case 'rounded-rectangle':
        graphics.beginFill(bgColor);
        graphics.drawRoundedRect(
          0,
          0,
          element.width,
          element.height,
          element.cornerRadius || 10
        );
        graphics.endFill();
        if (element.borderWidth > 0) {
          graphics.lineStyle(element.borderWidth, borderColor);
          graphics.drawRoundedRect(
            0,
            0,
            element.width,
            element.height,
            element.cornerRadius || 10
          );
          graphics.stroke({ width: element.borderWidth, color: borderColor });
        }
        break;
      case 'circle':
        graphics.beginFill(bgColor);
        graphics.drawEllipse(element.width / 2, element.height / 2, element.width / 2, element.height / 2);
        graphics.endFill();
        if (element.borderWidth > 0) {
          graphics.lineStyle(element.borderWidth, borderColor);
          graphics.drawEllipse(element.width / 2, element.height / 2, element.width / 2, element.height / 2);
          graphics.stroke({ width: element.borderWidth, color: borderColor });
        }
        break;
      case 'triangle':
        graphics.beginFill(bgColor);
        graphics.moveTo(element.width / 2, 0);
        graphics.lineTo(element.width, element.height);
        graphics.lineTo(0, element.height);
        graphics.closePath();
        graphics.endFill();
        if (element.borderWidth > 0) {
          graphics.lineStyle(element.borderWidth, borderColor);
          graphics.moveTo(element.width / 2, 0);
          graphics.lineTo(element.width, element.height);
          graphics.lineTo(0, element.height);
          graphics.closePath();
          graphics.stroke({ width: element.borderWidth, color: borderColor });
        }
        break;
      case 'arrow': {
        const tailWidth = element.arrowTailWidth ?? element.borderWidth ?? 4;
        const start = element.arrowStart || { x: 0, y: element.height / 2 };
        const end = element.arrowEnd || { x: element.width, y: element.height / 2 };
        const headSize = element.arrowHeadSize || 16;
        const curve = element.arrowCurve ?? 0;

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const normalX = -dy / distance;
        const normalY = dx / distance;
        const curveStrength = curve * distance * 0.5;
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        const hasCurve = Math.abs(curve) > 0.001;
        const controlPoint = hasCurve
          ? { x: midX + normalX * curveStrength, y: midY + normalY * curveStrength }
          : null;

        graphics.lineStyle(tailWidth, borderColor);
        graphics.moveTo(start.x, start.y);
        if (controlPoint) {
          graphics.quadraticCurveTo(controlPoint.x, controlPoint.y, end.x, end.y);
        } else {
          graphics.lineTo(end.x, end.y);
        }
        graphics.stroke({ width: tailWidth, color: borderColor, cap: 'round', join: 'round' });

        const tangentX = controlPoint ? end.x - controlPoint.x : dx;
        const tangentY = controlPoint ? end.y - controlPoint.y : dy;
        const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY) || 1;
        const dirX = tangentX / tangentLength;
        const dirY = tangentY / tangentLength;
        const headLength = Math.max(headSize, tailWidth * 2);
        const headWidth = Math.max(headSize * 0.75, tailWidth * 1.5);
        const baseX = end.x - dirX * headLength;
        const baseY = end.y - dirY * headLength;
        const perpX = -dirY;
        const perpY = dirX;
        const leftPointX = baseX + perpX * (headWidth / 2);
        const leftPointY = baseY + perpY * (headWidth / 2);
        const rightPointX = baseX - perpX * (headWidth / 2);
        const rightPointY = baseY - perpY * (headWidth / 2);

        const head = new PIXI.Graphics();
        head.beginFill(borderColor);
        head.moveTo(end.x, end.y);
        head.lineTo(leftPointX, leftPointY);
        head.lineTo(rightPointX, rightPointY);
        head.closePath();
        head.endFill();
        arrowHead = head;
        break;
      }
    }

    container.addChild(graphics);
    if (arrowHead) {
      container.addChild(arrowHead);
    }

    // 如果图形带有内部文本，则渲染文本
    if ((element as any).content) {
      const content = (element as any).content as string;
      const styleObj = (element as any).textStyle as any;
      const textStyle = new PIXI.TextStyle({
        fontFamily: styleObj?.fontFamily || 'Arial',
        fontSize: styleObj?.fontSize || 16,
        fill: styleObj?.color || 0x000000,
        fontWeight: styleObj?.bold ? 'bold' : 'normal',
        fontStyle: styleObj?.italic ? 'italic' : 'normal',
        align: 'center',
        wordWrap: true,
        wordWrapWidth: Math.max(10, element.width - 8),
      });

      const text = new PIXI.Text(content, textStyle);
      text.resolution = Math.min(window.devicePixelRatio || 1, 2);
      // 先确保换行宽度，然后水平、垂直居中显示
      text.style.wordWrapWidth = Math.max(10, element.width - 12);
      text.x = Math.max(0, (element.width - text.width) / 2);
      text.y = Math.max(0, (element.height - text.height) / 2);
      container.addChild(text);
    }

    return container;
  }

  // 创建图片精灵
  private async createImageSprite(element: ImageElement): Promise<PIXI.Container> {
    const container = new PIXI.Container();
    try {
      // Use Assets.load for both data URLs and remote URLs.
      const texture = await PIXI.Assets.load(element.src);
      const sprite = new PIXI.Sprite(texture);
      sprite.width = element.width;
      sprite.height = element.height;
      this.applyImageFilter(sprite, element.filter);
      container.addChild(sprite);
    } catch (error) {
      console.error('Failed to load image:', element.src.substring(0, 50), error);
      const errorGraphics = new PIXI.Graphics();
      errorGraphics.beginFill(0xcccccc);
      errorGraphics.drawRect(0, 0, element.width, element.height);
      errorGraphics.endFill();
      const errorText = new PIXI.Text('图片加载失败', new PIXI.TextStyle({ fontSize: 16, fill: 0x666666 }));
      errorText.x = element.width / 2 - errorText.width / 2;
      errorText.y = element.height / 2 - errorText.height / 2;
      container.addChild(errorGraphics);
      container.addChild(errorText);
    }
    return container;
  }

  // 应用图片滤镜
  private applyImageFilter(sprite: PIXI.Sprite, filter: string): void {
    const filters: PIXI.Filter[] = [];

    switch (filter) {
      case 'grayscale':
        const grayscaleFilter = new PIXI.ColorMatrixFilter();
        grayscaleFilter.desaturate();
        filters.push(grayscaleFilter);
        break;
      case 'sepia':
        const sepiaFilter = new PIXI.ColorMatrixFilter();
        sepiaFilter.sepia(true);
        filters.push(sepiaFilter);
        break;
      case 'blur':
        filters.push(new PIXI.BlurFilter(8));
        break;
    }

    if (filters.length > 0) {
      sprite.filters = filters;
    }
  }

  // 创建文本精灵
  private createTextSprite(element: TextElement): PIXI.Container {
    const container = new PIXI.Container();

    // 背景
    if (element.style.backgroundColor) {
      const bg = new PIXI.Graphics();
      const bgColor = this.parseColor(element.style.backgroundColor);
      bg.beginFill(bgColor);
      bg.drawRect(0, 0, element.width, element.height);
      bg.endFill();
      container.addChild(bg);
    }

    // 文本样式
    const style = new PIXI.TextStyle({
      fontFamily: element.style.fontFamily,
      fontSize: element.style.fontSize,
      fill: element.style.color,
      fontWeight: element.style.bold ? 'bold' : 'normal',
      fontStyle: element.style.italic ? 'italic' : 'normal',
      wordWrap: true,
      wordWrapWidth: element.width,
    });

    const text = new PIXI.Text({ text: element.content, style });
    // 降低文字分辨率以减少WebGPU警告，但仍保持清晰
    text.resolution = Math.min(window.devicePixelRatio || 1, 2);
    container.addChild(text);

    // 添加下划线和删除线（使用Graphics模拟）
    if (element.style.underline || element.style.strikethrough) {
      const lineColor = this.parseColor(element.style.color);
      const textWidth = text.width;
      const textHeight = text.height;

      if (element.style.underline) {
        const underline = new PIXI.Graphics();
        underline.moveTo(0, textHeight - 2);
        underline.lineTo(textWidth, textHeight - 2);
        underline.stroke({ width: 2, color: lineColor });
        container.addChild(underline);
      }

      if (element.style.strikethrough) {
        const strikethrough = new PIXI.Graphics();
        const y = textHeight / 2;
        strikethrough.moveTo(0, y);
        strikethrough.lineTo(textWidth, y);
        strikethrough.stroke({ width: 2, color: lineColor });
        container.addChild(strikethrough);
      }
    }
    return container;
  }


  // 移除元素
  public removeElement(id: string): void {
    const sprite = this.elementSprites.get(id);
    if (sprite) {
      this.mainContainer.removeChild(sprite);
      sprite.destroy({ children: true });
      this.elementSprites.delete(id);
    }
  }

  // 更新视口
  public updateViewport(x: number, y: number, scale: number): void {
    this.mainContainer.position.set(x, y);
    this.mainContainer.scale.set(scale, scale);
  }

  // 清空画布
  public clear(): void {
    this.elementSprites.forEach((sprite) => {
      this.mainContainer.removeChild(sprite);
      sprite.destroy({ children: true });
    });
    this.elementSprites.clear();
  }

  // 获取 PIXI Application
  public getApp(): PIXI.Application | null {
    return this.app;
  }

  // 获取主容器
  public getMainContainer(): PIXI.Container {
    return this.mainContainer;
  }

  // 解析颜色字符串到数字
  private parseColor(color: string): number {
    if (color.startsWith('#')) {
      return parseInt(color.slice(1), 16);
    }
    if (color.startsWith('rgb')) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        const r = parseInt(matches[0]);
        const g = parseInt(matches[1]);
        const b = parseInt(matches[2]);
        return (r << 16) | (g << 8) | b;
      }
    }
    return 0x000000;
  }

  // 销毁渲染器
  public destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    this.clear();
    if (this.app) {
      this.app.destroy(false, { children: true });
    }
  }
}
