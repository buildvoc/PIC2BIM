import { Config } from 'ziggy-js';

export interface User {
  id: number;
  login: string;
  name: string;
  surname: string;
  email: string;
  identification_number: string;
  vat: string;
  email_verified_at: string;
  roles : Array<Role>;
}


export interface Role {
  id : number;
  role_id : number;
  user_id : number;
}



export interface Agency {
  id: number;
  name: string;
}

export interface TaskType {
  id: number;
  name: string;
  description: string;
}
export interface Officer {
  id: number;
  name: string;
  password: string;
  login: string;
  pa_id: number;
  surname : string;
  identification_number : string;
  email : string;
  active : number;
  vat : number;
  tasks_count : number;
  photo_count : number;
  unassigned_photos_count : number;
  tasks_provided_count : number;
}

export type PaginatedData<T> = {
  data: T[];
  links: PaginationLink[];
  total : number;
};

export interface PaginationLink {
  url: string;
  label: string;
  active: boolean;
}



export interface Task {
  id?:number;
  status?: string;
  photo_taken?: number;
  name?: string;
  text?: string;
  note?: string;
  date_created?: string;
  task_due_date?: string;
  flag_valid?: string;
  flag_deleted?:number;
  text_reason?:string;
  text_returned?:string;
  timestamp?:string;
  user_id?:number;
  flag_id?:number
}

export interface Photo {
  id:number;
  altitude: number;
  angle:number;
  vertical_view_angle: number | null;
  distance: number | null;
  nmea_distance: number | null;
  accuracy: number;
  device_manufacture: string | null;
  device_model: string | null;
  device_platform: string | null;
  device_version: string | null;
  efkLatGpsL1: number | null;
  efkLngGpsL1: number | null;
  efkAltGpsL1: number | null;
  efkTimeGpsL1: string | null;
  efkLatGpsL5: number | null;
  efkLngGpsL5: number | null;
  efkAltGpsL5: number | null;
  efkTimeGpsL5: string | null;
  efkLatGpsIf: number | null;
  efkLngGpsIf: number | null;
  efkAltGpsIf: number | null;
  efkTimeGpsIf: string | null;
  efkLatGalE1: number | null;
  efkLngGalE1: number | null;
  efkAltGalE1: number | null;
  efkTimeGalE1: string | null;
  efkLatGalE5: number | null;
  efkLngGalE5: number | null;
  efkAltGalE5: number | null;
  efkTimeGalE5: string | null;
  efkLatGalIf: number | null;
  efkLngGalIf: number | null;
  efkAltGalIf: number | null;
  efkTimeGalIf: string | null;
  note: string | null;
  lat: number;
  lng: number;
  photo_heading: number;
  timestamp:string;
  created: string;
  path: string;
  file_name: string;
  digest: string;
  photo: string | null;
  check:boolean;
  img?:string;
  mapImg?:string;
  link?: string;
}

export interface TaskPhotos extends Task{
  photo: Photo;
  farmer_name: string;
  location: [number, number]|any;
}
export interface Tasks extends Task{
  photos: Array<Photo>;
}

export interface MapProps{
  data:Array<TaskPhotos>;
  onClick?:(taskId:number) => void;
  isSelected?:boolean;
  isUnassigned?:boolean;
  paths?:Array<Path>;
  zoomFilter?:(leaves:Array<String>|undefined) => void;
  className?:string;
  style?:any
}


interface Point {
  id: number;
  lat: number;
  lng: number;
  altitude: number | null;
  accuracy: number | null;
  created: string;
}

interface Path {
  id: number;
  name: string;
  start: string;
  end: string;
  area: number;
  device_manufacture: string | null;
  device_model: string | null;
  device_platform: string | null;
  device_version: string | null;
  points: Point[];
}
export interface PathFilter{
  data: Array<Path>;
  filterIds:Array<number>
}

export interface GalleryProps{
  photos:Array<Photo>;
  isUnassigned?:boolean;
  setPhotos?:any
  destroy?:(id:string)=>void
  isSplitView?:boolean
  setFilterPhotos?: void
}

export interface GalleryModalProps{
  modal:any;
  setModal:any;
  handleClose:()=>void;
  photos:Array<Photo>;
  rotateLeft:(digest:string,direction:string)=>void;
  rotateRight:(digest:string,direction:string)=>void;

}

export interface SplitViewState {
  split: boolean;
  single: boolean;
}

export type PageProps<
  T extends Record<string, unknown> = Record<string, unknown>
> = T & {
  auth: {
    user: User;
  };
  flash: {
    success: string | null;
    error: string | null;
  };
  task:Task;
  tasks:Array<Tasks>;
  photos:Array<Photo>;
  photo:Photo;
  paths:Array<Path>
  total:number;
  ziggy: Config & { location: string };
};
