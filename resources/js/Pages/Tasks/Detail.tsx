import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {Head, Link, usePage, router} from '@inertiajs/react';
import {Agency, Officer, PageProps, PaginatedData} from '@/types';
import Table from "@/Components/Table/Table";
import {PlusCircleIcon, Trash2, Edit} from "lucide-react";
import FilterBar from "@/Components/FilterBar/FilterBar";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faBan, faEye, faChevronLeft, faCheck, faTimes, faReply, faTrash, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { useState, useEffect } from 'react';

interface Tasks {
  id : number;
  status : string;
  photo_taken : number;
  verified : string;
  name : string;
  text : string;
  date_created : string;
  task_due_date : string;
  flag_id : number;
  note:string;
  text_returned:string;
  purpose : string;
  created_id : number;
}

export default function Dashboard({ auth }: PageProps) {
  const { task, user, errors  } = usePage<{
    task: Tasks;
    user : Officer
    errors : string[]
  }>().props;
  
  if(typeof errors[0] != 'undefined'){
    alert(errors[0]);
  }

  const deleteTask = (id:number) => {
    if(confirm('Delete task?')){
        router.delete(route('tasks.destroy',id));
    }
  }

  const moveFromOpenTask = (task : Tasks) => {
    const textNote = prompt('Change status to "Data provided"?', task.note);
    if (textNote && textNote.length > 0){
        router.post(route('task.moveOpen',task.id),{note : textNote});
    }
  }
  const acceptTask = (task:Tasks) => {
    if(confirm('Accept task?')){
        router.post(route('tasks.bulkAccept',task.id),{tasks : [task.id]},{
            onSuccess : ((res) =>{
            }),
            onError :((err) => {
                console.log(err);
            })
        })
    }
  }

  const declineTask = (task:Tasks) => {
    const textNote = prompt('Decline task? Enter reason of decline, please.', "");
    if(textNote && textNote.length > 0){
        router.post(route('tasks.decline'),{id : task.id, reason : textNote})
    }
  }

  const returnTask = (task:Tasks) => {
    const textNote = prompt('Return task to farmer? Enter reason of reopening, please..', "");
    if(textNote && textNote.length > 0){
        router.post(route('tasks.return'),{id : task.id, reason : textNote},{
            onSuccess : ((res) =>{
                console.log(res);
            }),
            onError :((err) => {
                console.log(err);
            })
        })
    }
  }

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">{user.surname + ' ' + user.name + " task detail"} </h2>}
    >
      <Head title="Task detail" />

      <div className="py-12">
        <div className="max-w mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div
              className="flex items-center justify-between mb-6 w-full border-gray-200 dark:border-gray-700 p-4 text-gray-700 dark:text-gray-300 border-b text-lg font-medium"
            >
              <span className="hidden md:inline">
                {user.surname + ' ' + user.name + " task detail"} 
              </span>
            </div>

            <Table
              columns={[
                {
                  label: 'Status',
                  name: 'status_sortorder.sortorder',
                  renderCell: row => (
                    <>
                        {task.status}
                    </>
                  )
                },
                {
                  label: 'Verified',
                  name: 'surname',
                  renderCell: row => (
                    <>
                      
                    </>
                  )
                },
                {
                  label: 'Purpose',
                  name: 'purpose',
                  renderCell: row => (
                    <>
                      {task.purpose}
                    </>
                  )
                },
                {
                  label: 'Name',
                  name: 'name',
                  renderCell: row => (
                    <>
                      {task.name}
                    </>
                  )
                },
                {
                  label: 'Note',
                  name: 'text',
                  renderCell: row => (
                    <>
                      {task.note}
                    </>
                  )
                },
                {
                  label: 'Description',
                  name: 'description',
                  renderCell: row => (
                    <>
                      {task.text}
                    </>
                  )
                },
                {
                  label: 'Repoen reason',
                  name: 'text_returned',
                  renderCell: row => (
                    <>
                      {task.text_returned}
                    </>
                  )
                },
                {
                  label: 'Date created',
                  name: 'date_created',
                  renderCell: row => (
                    <>
                      {task.date_created}
                    </>
                  )
                },
                {
                  label: 'due date',
                  name: 'task_due_date',
                  renderCell: row => (
                    <>
                      {task.task_due_date}
                    </>
                  )
                },
                {
                  label: 'Actions',
                  name: 'flag_id',
                  renderCell: row => (
                    <>
                       {(
                            <>
                                {task.flag_id === 1 && (
                                    <div className="mr-2 btn bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Accepted</div>
                                )}
                                {task.flag_id === 2 && (
                                    <div className="mr-2 btn bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">Declined</div>
                                )}
                                {task.status === 'data provided' && (
                                    <>
                                        <button
                                            className="mr-2 btn bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 js_ack tt"
                                            title="Accept"
                                            type='button'
                                            onClick={()=>acceptTask(task)}
                                        >
                                            <FontAwesomeIcon icon={faCheck} />
                                        </button>
                                        <button
                                            className="mr-2 btn bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 js_decline tt"
                                            title="Decline"
                                            type='button'
                                            onClick={ () => declineTask(task)}
                                        >
                                            <FontAwesomeIcon icon={faTimes} />
                                        </button>
                                        <button
                                            className="mr-2 btn bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 js_return tt"
                                            title="Return"
                                            type='button'
                                            onClick={ () => returnTask(task)}
                                        >
                                            <FontAwesomeIcon icon={faReply} />
                                        </button>
                                    </>
                                )}
                                {task.status === 'new' && task.created_id == auth.user.id && (
                                <button
                                    className="mr-2 btn bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 js_delete tt"
                                    title="Delete"
                                    type='button'
                                    onClick={() => deleteTask(task.id)}
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                                )}
                            </>
                            )}

                            {task.status === 'new' && (
                                <button
                                    className="mr-2 btn bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 js_move_from_open tt"
                                    title="Move to Data provided"
                                    type='button'
                                    onClick={ () => moveFromOpenTask(task)}
                                >
                                    <FontAwesomeIcon icon={faSignOutAlt} />
                                </button>
                            )}
                            {task.status === 'open' && (
                            <button
                                className="mr-2 btn bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 js_move_from_open tt"
                                title="Move to Data provided"
                                type='button'
                                onClick={ () => moveFromOpenTask(task)}
                            >
                                <FontAwesomeIcon icon={faSignOutAlt} />
                            </button>
                            )}
                            {task.status === 'returned' && (
                            <button
                                className="mr-2 btn bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 js_move_from_open tt"
                                title="Move to Data provided"
                                type='button'
                                onClick={ () => moveFromOpenTask(task)}
                            >
                                <FontAwesomeIcon icon={faSignOutAlt} />
                            </button>
                        )}
                    </>
                  )
                }
              ]}
              rows={[task]}
            />
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
