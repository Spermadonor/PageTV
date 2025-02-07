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
}

export interface MovieData {
  link: string;
  rating: number;
  description: string;
  poster: string;
}

export interface ProgramData {
  link: string;
  rating: string;
  year: string | null;
  description: string;
}

export interface ShowItem {
  time: string;
  name: string;
  programData: ProgramData;
  movieData: MovieData;
}

export interface ProgramResult {
  title: string;
  shows: ShowItem[];
}
