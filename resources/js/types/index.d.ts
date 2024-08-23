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
}

export interface Agency {
  id: number;
  name: string;
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
}

export type PaginatedData<T> = {
  data: T[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
};

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
