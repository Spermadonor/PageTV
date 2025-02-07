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
          rating: parseFloat(show.programData.rating) || 0,
          description: show.programData.description,
          link: show.programData.link,
          poster: show.programData.poster || '',
          channel: program.title,
          year: show.programData.year ? parseInt(show.programData.year) : undefined,
          countries: show.programData.countries || []
        });
      });
    });
    return movies;
  }

  private async _parseShowItem($: cheerio.Root, item: cheerio.Cheerio, programLink: string): Promise<ShowItem | null> {
    const name = item.find(".p-programms__item__name-link").text().trim();
    if (!name) return null;

    const id = item.attr("data-id");
    const time = item.attr("data-start") || '0';
    const programData = await this._getProgramData(id!, programLink);

    return {
      time,
      name,
      programData,
      movieData: programData // используем те же данные
    };
  }

  private async _getProgramData(id: string, url: string): Promise<ProgramData> {
    const link = `${url}/${id}`;
    const response = await axios.get(link);
    const $ = cheerio.load(response.data);

    const rating = $(".p-rate-flag__imdb-text").text().trim() || '0';
    const description = $(".p-show-more__content").text().trim();
    const year = this._extractYear($);
    const poster = this._extractPoster($);
    const countries = this._extractCountries($);

    return {
      link,
      rating,
      year,
      description,
      poster,
      countries
    };
  }

  private _extractPoster($: cheerio.Root): string {
    const posterImg = $(".p-picture__container img").first();
    return posterImg.attr("src") || '';
  }

  private _extractCountries($: cheerio.Root): string[] {
    const countries: string[] = [];
    $(".p-metadata__item").each((_, elem) => {
      const label = $(elem).find(".p-metadata__label").text().trim();
      if (label.includes("Страна")) {
        const countryText = $(elem).find(".p-metadata__value").text().trim();
        countries.push(...countryText.split(", "));
      }
    });
    return countries;
  }

  private _extractYear($: cheerio.Root): string | null {
    let yearText = '';
    $(".p-metadata__item").each((_, elem) => {
      const label = $(elem).find(".p-metadata__label").text().trim();
      if (label.includes("Год")) {
        yearText = $(elem).find(".p-metadata__value").text().trim();
      }
    });

    const yearMatch = yearText.match(/\d{4}/);
    return yearMatch ? yearMatch[0] : null;
  }
}
