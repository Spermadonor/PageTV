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
        <div class="movie-header">
          <h2>${movie.time} - ${movie.name}</h2>
          <span class="channel-name">${movie.channel}</span>
        </div>
        ${movie.poster ? `<img src="${movie.poster}" alt="${movie.name}" class="movie-poster">` : ''}
        <div class="movie-info">
          ${movie.year ? `<span class="movie-year">Год: ${movie.year}</span>` : ''}
          ${movie.countries && movie.countries.length > 0
            ? `<span class="movie-countries">Страна: ${movie.countries.join(', ')}</span>`
            : ''
          }
        </div>
        ${movie.frames && movie.frames.length > 0 ? `
          <div class="movie-frames">
            ${movie.frames.map(frame => `
              <img src="${frame}" alt="Кадр из ${movie.name}" class="movie-frame">
            `).join('')}
          </div>
        ` : ''}
        <p class="rating">Рейтинг: ${movie.rating}</p>
        <p class="description">${movie.description}</p>
        <a href="${movie.link}" target="_blank">Подробнее на Кинопоиске</a>
      </div>
    `).join('');

    const currentDate = new Date().toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const html = template
      .replace(/\{\{date\}\}/g, currentDate)
      .replace('{{content}}', movieCards);
    await fs.writeFile(path.join(process.cwd(), 'dist/index.html'), html);
  }
}

const app = new TVGuideApp();
app.run();
