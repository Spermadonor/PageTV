export interface TVProgram {
  title: string;
  link: string;
}

export interface Movie {
  time: string;
  name: string;
  rating: number;
  description: string;
  link: string;
  poster: string;
  channel: string;
  frames?: string[];
  year?: number;
  countries?: string[];
}

export interface MovieData {
  link: string;
  rating: number;
  description: string;
  poster: string;
  frames?: string[];
  year?: number;
  countries?: string[];
}

export interface ProgramData {
  link: string;
  rating: string;
  year: string | null;
  description: string;
  poster: string;
  countries: string[];
}

export interface ShowItem {
  time: string;
  name: string;
  programData: ProgramData;
  movieData: ProgramData;
}

export interface ProgramResult {
  title: string;
  shows: ShowItem[];
}
