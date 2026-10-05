export type Coords = [number, number];

export interface FileContents {
  type: string;
  coordinates: Coords[][][];
}
