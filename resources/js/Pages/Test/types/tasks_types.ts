
export interface task_list {
    tasks:task[]
}
export interface task {
    id:number|never;
    name:string;
    text:string,
    text_returned:null,
    date_created:string,
    task_due_date:string,
    note:string,
    number_of_photos:string,
    flag_valid:number,
    flag_invalid:number,
    photos_ids:[]
}

