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
  frames: string[];
  content: string;
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
  description: string;
  poster: string;
  content: string;
  frames: string[];
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
