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

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
    auth: {
        user: User;
    };
    ziggy: Config & { location: string };
};
