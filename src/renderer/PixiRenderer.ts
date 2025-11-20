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

    container.position.set(element.x, element.y);
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
        const radius = Math.min(element.width, element.height) / 2;
        graphics.beginFill(bgColor);
        graphics.drawCircle(element.width / 2, element.height / 2, radius);
        graphics.endFill();
        if (element.borderWidth > 0) {
          graphics.lineStyle(element.borderWidth, borderColor);
          graphics.drawCircle(element.width / 2, element.height / 2, radius);
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
    }

    container.addChild(graphics);
    return container;
  }

  // 创建图片精灵
  private async createImageSprite(element: ImageElement): Promise<PIXI.Container> {
    const container = new PIXI.Container();
    
    try {
      // 对于Base64图片，直接使用Sprite.from
      let sprite: PIXI.Sprite;
      
      if (element.src.startsWith('data:')) {
        // Base64图片，使用Sprite.from
        sprite = PIXI.Sprite.from(element.src);
        // 等待纹理加载
        await sprite.texture.source.load();
      } else {
        // URL图片，使用Assets.load
        const texture = await PIXI.Assets.load(element.src);
        sprite = new PIXI.Sprite(texture);
      }
      
      sprite.width = element.width;
      sprite.height = element.height;

      // 应用滤镜
      this.applyImageFilter(sprite, element.filter);

      container.addChild(sprite);
    } catch (error) {
      console.error('Failed to load image:', element.src.substring(0, 50), error);
      // 创建一个错误占位符
      const errorGraphics = new PIXI.Graphics();
      errorGraphics.beginFill(0xcccccc);
      errorGraphics.drawRect(0, 0, element.width, element.height);
      errorGraphics.endFill();
      
      // 添加错误文本
      const errorText = new PIXI.Text({
        text: '图片加载失败',
        style: new PIXI.TextStyle({ fontSize: 16, fill: 0x666666 })
      });
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
