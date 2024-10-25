"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./gallery.module.css";
import useLocalStorage from "@/hooks/useLocalStorage";
import { get_tasks_photos, update_status } from "@/api/api_client";
import { FaChevronLeft } from "react-icons/fa";
import TaskGallery from "../task_gallery/task_gallery";
import { FaSignOutAlt } from "react-icons/fa";
import { loadJQuery } from "@/utils/helpers";
import { get_unassigned_photos,get_photo } from "@/api/api_client";
import { get_auth_session } from "@/utils/auth_operations";
import { authenticated_user } from "@/types/user_types";
const Gallery = () => {
  //Params
  const searchParams = useSearchParams();
  const taskId: any = searchParams.get("task_id");
  //States
  const [user, setUser] = useState<any>();
  //local sotrage
  const [photoGallery, setPhotoGallery] = useState<any>([]);


  useEffect(() => {
    const initJQuery = async () => {
      const $ = await loadJQuery();
      var timer: any;
      $(".tt").hover(
        function () {
          clearTimeout(timer);
          var elem = this;
          timer = setTimeout(function () {
            $(elem).find(".tt_body").fadeIn(250);
          }, 750);
        },
        function () {
          $(this).find(".tt_body").hide();
          clearTimeout(timer);
        }
      );

      return () => {
        $(".tt").off("hover");
        $("click").off("click");
      };
    };
    if (typeof window !== "undefined") {
      initJQuery();
    }

    const fetchData = async () => {
      var task_photo_data ;
      var photos_array: any = [];
      var map_unassigned_array = [];
      var map_unassigned_array2 = [];
      const session: any = await get_auth_session();
      let user: authenticated_user = await JSON.parse(session?.value);
      let photos_ids = await get_unassigned_photos(user.id);

      for (let id of photos_ids) {
        const result = await get_photo(id);
          // photos_array.push(result)
           task_photo_data = {
            id:id,

            farmer_name: `${user.name} ${user.surname}`,
            photo: result,
            location: [result?.lng, result?.lat],
          };
        
        // setUnAssignedPhotos(map_unassigned_array);
        map_unassigned_array.push(task_photo_data)
      }

      setPhotoGallery(map_unassigned_array)

    };

    fetchData()

  }, []);


  useEffect(()=>{console.log("parent reander---")},[])

  return (
    <div className={styles.container}>
      <TaskGallery taskPhotos={photoGallery} isUnassigned={true} />
    </div>
  );
};

export default Gallery;
