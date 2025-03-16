let endpoint="https://pic2bim.co.uk/"

export const get_photo = async (photo_id: number, bearerToken:string) => {
  "use server";

  try {
    const response = await fetch(
      `/comm_get_photo?photo_id=${photo_id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${bearerToken}`, 

        },
      }
    );
    let res: any = await response.json();
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    if (res.photo) {
      return res?.photo;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Failed to fetch the catalogue:", error);
    return [];
  }
};

export const get_unassigned_photos = async (user_id: number,bearerToken:string) => {
  "use server";
  console.log("Bearer token applied ---",bearerToken)
  try {
    const response = await fetch(
      `/comm_unassigned?user_id=${user_id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${bearerToken}`, 

        },
      }
    );
    let res: any = await response.json();
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    if (res.photos_ids) {
      return res?.photos_ids;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Failed to fetch the catalogue:", error);
    return [];
  }
};
