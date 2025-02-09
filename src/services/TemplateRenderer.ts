import * as fs from 'fs/promises';
import * as path from 'path';

export class TemplateRenderer {
  private templates: Map<string, string> = new Map();

  async loadTemplate(name: string): Promise<void> {
    const templatePath = path.join(process.cwd(), 'templates', `${name}.html`);
    const content = await fs.readFile(templatePath, 'utf-8');
    this.templates.set(name, content);
  }

  render(templateName: string, data: Record<string, any>): string {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    let result = template;

    // Обработка условных блоков
    result = result.replace(/\{\{#if ([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, condition, content) => {
      const value = this.getValueFromPath(data, condition.trim());
      return value ? this.renderContent(content, data) : '';
    });

    // Обработка циклов
    result = result.replace(/\{\{#each ([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, arrayPath, content) => {
      const array = this.getValueFromPath(data, arrayPath.trim());
      if (!Array.isArray(array)) return '';

      return array.map(item => {
        // Создаем новый контекст для каждого элемента массива
        const itemContext = {
          ...data,
          this: item,
          // Добавляем доступ к родительскому контексту через ../
          '../': data
        };
        return this.renderContent(content, itemContext);
      }).join('');
    });

    // Замена переменных
    result = result.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
      const value = this.getValueFromPath(data, path.trim());
      return value !== undefined ? value : '';
    });

    return result;
  }

  private renderContent(content: string, data: Record<string, any>): string {
    let result = content;

    // Рекурсивно обрабатываем условные блоки
    result = result.replace(/\{\{#if ([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, condition, content) => {
      const value = this.getValueFromPath(data, condition.trim());
      return value ? this.renderContent(content, data) : '';
    });

    // Рекурсивно обрабатываем циклы
    result = result.replace(/\{\{#each ([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, arrayPath, content) => {
      const array = this.getValueFromPath(data, arrayPath.trim());
      if (!Array.isArray(array)) return '';

      return array.map(item => {
        const itemContext = {
          ...data,
          this: item,
          '../': data
        };
        return this.renderContent(content, itemContext);
      }).join('');
    });

    // Замена переменных
    result = result.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
      const value = this.getValueFromPath(data, path.trim());
      return value !== undefined ? value : '';
    });

    return result;
  }

  private getValueFromPath(obj: Record<string, any>, path: string): any {
    // Обработка родительского контекста
    if (path.startsWith('../')) {
      return this.getValueFromPath(obj['../'] || {}, path.slice(3));
    }
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
  }
}
