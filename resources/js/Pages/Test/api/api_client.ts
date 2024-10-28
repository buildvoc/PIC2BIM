import { authentication_response } from "../types/user_types";
const endpoint = "https://api.pic2bim.co.uk/";

export const login = async (event: any) => {
  const { username, password } = event
  const response = await fetch(
    `${endpoint}comm_login.php?login=${username}&pswd=${password}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  let res: authentication_response = await response.json();
  if (!response.ok) {
    return { error: "Network response was not ok" };
  }
  if (res.user) {
    return res
  } else {
    return { error: "Login credentials don't match!" };
  }
};

export const get_tasks = async (user_id: number) => {

  try {
    const response = await fetch(
      `${endpoint}comm_tasks.php?user_id=${user_id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    let res: any = await response.json();

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    if (res.tasks) {
      return res?.tasks;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Failed to fetch the catalogue:", error);
    return [];
  }
};

export const get_tasks_photos = async (task_id: number, user_id: number) => {

  try {
    const response = await fetch(
      `${endpoint}comm_task_photos.php?task_id=${task_id}&user_id=${user_id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    let res: any = await response.json();
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    if (res.photos) {
      return res?.photos;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Failed to fetch the catalogue:", error);
    return [];
  }
};

export const get_photo = async (photo_id: number) => {

  try {
    const response = await fetch(
      `${endpoint}comm_get_photo.php?photo_id=${photo_id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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

export const update_status = async (
  task_id: number,
  status: string,
  note: string
) => {
  try {
    const response = await fetch(
      `${endpoint}comm_status.php?task_id=${task_id}&status=${status}&note=${note}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    let res: any = await response.json();
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    if (res) {
      return res;
    }
  } catch (error) {
    console.error("Failed to fetch the catalogue:", error);
    return [];
  }
};

export const get_paths = async (user_id: number) => {

  try {
    const response = await fetch(
      `${endpoint}comm_get_paths.php?user_id=${user_id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    let res: any = await response.json();

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    if (res.paths) {
      return res?.paths;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Failed to fetch the catalogue:", error);
    return [];
  }
};

export const get_unassigned_photos = async (user_id: number) => {

  try {
    const response = await fetch(
      `${endpoint}comm_unassigned.php?user_id=${user_id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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