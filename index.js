require('dotenv').config();
const axios = require("axios");
const cheerio = require("cheerio");

class TVProgram {
  constructor(title, link) {
    this.title = title;
    this.link = link;
  }
}

class KinopoiskAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.kinopoisk.dev/v1.4';
    this.headers = {
      'X-API-KEY': this.apiKey
    };
  }

  async searchMovie(name, year) {
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
        description: detailedMovie.description || ''
      };
    } catch (error) {
      console.error('Kinopoisk API error:', error.message);
      return this._createEmptyMovieResult('Error occurred');
    }
  }

  _createEmptyMovieResult(link) {
    return {
      link,
      rating: 0,
      description: ''
    };
  }
}

class TelegramBot {
  constructor(token, chatId) {
    this.token = token;
    this.chatId = chatId;
  }

  async sendMessage(text) {
    const encodedText = encodeURIComponent(text);
    const url = `https://api.telegram.org/bot${this.token}/sendMessage?chat_id=${this.chatId}&text=${encodedText}`;
    await axios.get(url);
  }
}

class TVProgramParser {
  constructor(programs, kinopoiskApi) {
    this.programs = programs;
    this.kinopoiskApi = kinopoiskApi;
    this.result = [];
  }

  async parseProgram(program) {
    try {
      const response = await axios.get(program.link);
      const $ = cheerio.load(response.data);
      const programItems = $(".p-programms__item");

      const programResult = {
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
      console.error(`Error parsing program ${program.title}:`, error.message);
    }
  }

  async _parseShowItem($, item, programLink) {
    const name = item.find(".p-programms__item__name-link").text();
    if (!name) return null;

    const id = item.attr("data-id");
    const time = item.attr("data-start") || '0';
    const programData = await this._getProgramData(id, programLink);
    const movieData = await this.kinopoiskApi.searchMovie(name, programData.year);

    return {
      time,
      name,
      programData,
      movieData
    };
  }

  async _getProgramData(id, url) {
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

  _extractYear($) {
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

  formatResult() {
    return this.result.map(program => {
      let text = `${program.title}\n`;
      program.shows.forEach(show => {
        text += `${show.time} - ${show.name}\n`;
        text += `${show.movieData.rating} | ${show.movieData.link}\n`;
        text += `${show.programData.rating} | ${show.programData.link}\n\n`;
      });
      return text;
    }).join('\n');
  }
}

class TVGuideApp {
  constructor() {
    this.programs = [
      new TVProgram("НСТ", "https://tv.mail.ru/sankt_peterburg/channel/929/"),
      new TVProgram("Киноужас", "https://tv.mail.ru/sankt_peterburg/channel/3108/")
    ];

    // Используем переменные окружения
    this.kinopoiskApi = new KinopoiskAPI(
      process.env.KINOPOISK_API_KEY
    );

    this.telegramBot = new TelegramBot(
      process.env.TELEGRAM_BOT_TOKEN,
      process.env.TELEGRAM_CHAT_ID
    );
  }

  async run() {
    try {
      const parser = new TVProgramParser(this.programs, this.kinopoiskApi);

      for (const program of this.programs) {
        await parser.parseProgram(program);
      }

      const formattedResult = parser.formatResult();
      //console.log(formattedResult);
      await this.telegramBot.sendMessage(formattedResult);
    } catch (error) {
      console.error('Application error:', error);
    }
  }
}

// Запуск приложения
const app = new TVGuideApp();
app.run();
