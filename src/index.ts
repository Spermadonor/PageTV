import dotenv from 'dotenv';
import { KinopoiskAPI } from './services/KinopoiskAPI';
import { TVProgramParser } from './services/TVProgramParser';
import { TVProgram, Movie } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

dotenv.config();

class TVGuideApp {
  private programs: TVProgram[];
  private kinopoiskApi: KinopoiskAPI;

  constructor() {
    this.programs = [
      { title: "НСТ", link: "https://tv.mail.ru/sankt_peterburg/channel/929/" },
      { title: "Киноужас", link: "https://tv.mail.ru/sankt_peterburg/channel/3108/" }
    ];

    this.kinopoiskApi = new KinopoiskAPI(
      process.env.KINOPOISK_API_KEY || ''
    );
  }

  async run() {
    try {
      const parser = new TVProgramParser(this.programs, this.kinopoiskApi);

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
    const template = await fs.readFile(path.join(process.cwd(), 'templates/template.html'), 'utf-8');
    const movieCards = movies.map(movie => `
      <div class="movie-card">
        <h2>${movie.time} - ${movie.name}</h2>
        <p class="rating">Рейтинг: ${movie.rating}</p>
        <p class="description">${movie.description}</p>
        <a href="${movie.link}" target="_blank">Подробнее на Кинопоиске</a>
      </div>
    `).join('');

    const html = template.replace('{{content}}', movieCards)
                        .replace('{{date}}', new Date().toLocaleDateString('ru-RU'));

    await fs.writeFile(path.join(process.cwd(), 'dist/index.html'), html);
  }
}

const app = new TVGuideApp();
app.run();
