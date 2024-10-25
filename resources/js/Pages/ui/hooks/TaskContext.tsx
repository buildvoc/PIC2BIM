'use client'
import { createContext, useState, useContext } from 'react';
// Create the context
const TasksContext = createContext<any>([]);
export const TaskProvider =({children,navigate}:any)=>{

    const [tasksPhotos,setTasksPhotos] = useState([]);
    const [user,setUser] = useState({});


    return (
        <TasksContext.Provider value={{tasksPhotos,setTasksPhotos,user,setUser}}>
        {children}
        </TasksContext.Provider>
    );
}

export const useTasks = () => useContext(TasksContext)