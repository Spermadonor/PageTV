import axios from 'axios';
import * as cheerio from 'cheerio';
import { TVProgram, ProgramResult, ProgramData, ShowItem, Movie } from '../types';
import { KinopoiskAPI } from './KinopoiskAPI';

export class TVProgramParser {
  private result: ProgramResult[] = [];

  constructor(
    private programs: TVProgram[],
    private kinopoiskApi: KinopoiskAPI
  ) {}

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
      console.error(`Error parsing program ${program.title}:`, error instanceof Error ? error.message : error);
    }
  }

  getMovies(): Movie[] {
    const movies: Movie[] = [];
    this.result.forEach(program => {
      program.shows.forEach(show => {
        movies.push({
          time: show.time,
          name: show.name,
          rating: show.movieData.rating,
          description: show.movieData.description,
          link: show.movieData.link,
          poster: show.movieData.poster
        });
      });
    });
    return movies;
  }

  private async _parseShowItem($: cheerio.Root, item: cheerio.Cheerio, programLink: string): Promise<ShowItem | null> {
    const name = item.find(".p-programms__item__name-link").text();
    if (!name) return null;

    const id = item.attr("data-id");
    const time = item.attr("data-start") || '0';
    const programData = await this._getProgramData(id!, programLink);
    const movieData = await this.kinopoiskApi.searchMovie(name, programData.year || undefined);

    return {
      time,
      name,
      programData,
      movieData
    };
  }

  private async _getProgramData(id: string, url: string): Promise<ProgramData> {
    const link = `${url}/${id}`;
    const response = await axios.get(link);
    const $ = cheerio.load(response.data);

    const rating = $(".p-rate-flag__imdb-text").text().trim() || '0';
    const description = $(".p-show-more__content").text();
    const year = this._extractYear($);

    return {
      link,
      rating,
      year,
      description
    };
  }

  private _extractYear($: cheerio.Root): string | null {
    const listLink = $('.link_black');
    for (let i = 0; i < listLink.length; i++) {
      const text = listLink.eq(i).text();
      const years = text.match(/\d{4}/g);
      if (years) {
        const year = parseInt(years[0]);
        return `${year - 1}-${year + 1}`;
      }
    }
    return null;
  }
}
