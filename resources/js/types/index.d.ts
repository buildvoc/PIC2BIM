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
  photos_count : number;
  unassigned_photos_count : number;
  tasks_provided_count : number;
}

export type PaginatedData<T> = {
  data: T[];
  links: PaginationLink[];
};

export interface PaginationLink {
  url: string;
  label: string;
  active: boolean;
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
  ziggy: Config & { location: string };
};
