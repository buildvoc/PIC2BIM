export interface login_user {
    login:string;
    pswd:string;
}

export interface authentication_response {
    status: string,
    error_msg: string,
    user: authenticated_user
}

export interface authenticated_user {
    id:number|never;
    name:string;
    surname:string;
    identification_number:number;
    email:string;
    vat:string
}