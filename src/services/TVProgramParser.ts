import axios from 'axios';
import * as cheerio from 'cheerio';
import { TVProgram, ProgramResult, ProgramData, ShowItem, Movie } from '../types';

export class TVProgramParser {
  private result: ProgramResult[] = [];

  constructor(private programs: TVProgram[]) {}

  async parseProgram(program: TVProgram): Promise<void> {
    try {
      const response = await axios.get(program.link);
      const $ = cheerio.load(response.data);
      const programItems = $(".p-programms__item");

      const programResult: ProgramResult = {
        title: program.title,
        shows: []
      };

      for (let i = 0; i < programItems.length; i++) {
        const item = programItems.eq(i);
        const time = item.attr("data-start") || '0';

        if (parseInt(time) >= 17) {
          const show = await this._parseShowItem($, item, program.link);
          if (show) {
            programResult.shows.push(show);
          }
        }
      }

      this.result.push(programResult);
    } catch (error) {
      console.error('Error parsing program:', error);
    }
  }

  getMovies(): Movie[] {
    const movies: Movie[] = [];
    this.result.forEach(program => {
      program.shows.forEach(show => {
        movies.push({
          time: show.time,
          name: show.name,
          rating: parseFloat(show.programData.rating) || 0,
          description: show.programData.description,
          link: show.programData.link,
          poster: show.programData.poster,
          channel: program.title,
          frames: show.programData.frames,
          content: show.programData.content
        });
      });
    });
    return movies;
  }

  private async _parseShowItem($: cheerio.Root, item: cheerio.Cheerio, baseUrl: string): Promise<ShowItem | null> {
    try {
      const time = item.attr("data-start") || '';
      const name = item.find(".p-programms__item__name-link").text().trim() ||
                  item.find(".p-programms__item-name").text().trim();
      const id = item.attr("data-id") || '';

      if (!id) return null;

      const programData = await this._getProgramData(id, baseUrl);

      return {
        time,
        name,
        programData,
      };
    } catch (error) {
      console.error('Error parsing show item:', error);
      return null;
    }
  }

  private async _getProgramData(id: string, url: string): Promise<ProgramData> {
    const link = `${url}/${id}`;
    const response = await axios.get(link);
    const $ = cheerio.load(response.data);

    // Получаем рейтинг
    const rating = $('.p-rate-flag__imdb-text').first().text().trim() || '0';

    // Получаем описание
    const description = $('.p-show-more__content').first().text().trim();

    // Получаем постер
    const poster = $('.p-movie-cover__image').attr('src') || '';

    // Получаем информацию о фильме из блока tv__EventInfo
    const eventInfo = $('[data-logger="tv__EventInfo"]').first();
    const content = eventInfo.text().trim();

    // Получаем кадры из фильма
    const frames: string[] = [];
    $('.p-picture_object-fit img').each((_, elem) => {
      const src = $(elem).data('lazy-block-src');
      if (src) frames.push(src);
      if (frames.length >= 3) return false;
    });

    return {
      link,
      rating,
      description,
      poster,
      content,
      frames
    };
  }
}
