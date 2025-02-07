import axios from 'axios';
import { MovieData } from '../types';

export class KinopoiskAPI {
  private baseUrl: string;
  private headers: { 'X-API-KEY': string };

  constructor(private apiKey: string) {
    this.baseUrl = 'https://api.kinopoisk.dev/v1.4';
    this.headers = {
      'X-API-KEY': this.apiKey
    };
  }

  async searchMovie(name: string, year?: string): Promise<MovieData> {
    try {
      const searchResponse = await axios.get(`${this.baseUrl}/movie/search`, {
        headers: this.headers,
        params: {
          query: name,
          year: year,
          limit: 1
        }
      });

      const movie = searchResponse.data.docs[0];
      if (!movie) {
        return this._createEmptyMovieResult('Not found');
      }

      const detailResponse = await axios.get(`${this.baseUrl}/movie/${movie.id}`, {
        headers: this.headers
      });

      const detailedMovie = detailResponse.data;
      return {
        link: `https://www.kinopoisk.ru/film/${detailedMovie.id}`,
        rating: detailedMovie.rating?.kp || 0,
        description: detailedMovie.description || '',
        poster: detailedMovie.poster?.url || ''
      };
    } catch (error) {
      console.error('Kinopoisk API error:', error instanceof Error ? error.message : error);
      return this._createEmptyMovieResult('Error occurred');
    }
  }

  private _createEmptyMovieResult(link: string): MovieData {
    return {
      link,
      rating: 0,
      description: '',
      poster: ''
    };
  }
}
