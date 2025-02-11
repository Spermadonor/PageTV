import { TVProgramParser } from './services/TVProgramParser';
import { TemplateRenderer } from './services/TemplateRenderer';
import { TVProgram, Movie } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

class TVGuideApp {
  private programs: TVProgram[];
  private templateRenderer: TemplateRenderer;

  constructor() {
    this.programs = [
      { title: "НСТ", link: "https://tv.mail.ru/sankt_peterburg/channel/929/" },
      { title: "Киноужас", link: "https://tv.mail.ru/sankt_peterburg/channel/3108/" }
    ];
    this.templateRenderer = new TemplateRenderer();
  }

  async run() {
    try {
      await this.templateRenderer.loadTemplate('template');
      await this.templateRenderer.loadTemplate('movie-card');

      const parser = new TVProgramParser(this.programs);

      for (const program of this.programs) {
        await parser.parseProgram(program);
      }

      const movies = parser.getMovies();
      await this.generateHTML(movies);
    } catch (error) {
      console.error('Application error:', error);
    }
  }

  private async generateHTML(movies: Movie[]) {
    const movieCards = movies.map(movie =>
      this.templateRenderer.render('movie-card', movie)
    ).join('');

    const currentDate = new Date().toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const html = this.templateRenderer.render('template', {
      date: currentDate,
      content: movieCards
    });

    await fs.writeFile(path.join(process.cwd(), 'dist/index.html'), html);
  }
}

const app = new TVGuideApp();
app.run();
