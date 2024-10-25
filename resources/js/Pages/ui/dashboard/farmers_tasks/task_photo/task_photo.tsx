import { transform } from "next/dist/build/swc";
import styles from "./task_photo.module.css";

const TaskPhoto: any = ({ data, onClick }: any) => {
  const { farmer_name, task_name, photo, id } = data;
  const imageSrc: any = photo.photo
    ? `data:image/jpeg;base64,${photo.photo}`
    : null;

  return (
    <div style={{ cursor: "pointer" }} onClick={() => onClick && onClick(id,photo.digest)}>
      <div className={styles.js_popup}>
        <div>{farmer_name}</div>
        <div>{task_name}</div>
        <div className={styles.js_popup_border}>
          <div className={styles.js_azimuth}>
            <img
              className={styles.azimuth}
              src="/icon_azimuth.png"
              style={{ transform: `rotate(${photo.photo_heading}deg)` }}
            />
          </div>
          <div className={styles.marker_image}>
            {imageSrc && (
              <img className={styles.marker_image_img} src={imageSrc}></img>
            )}
          </div>
          <img
            className={`${styles.marker_border} ${styles.marker_border_web}`}
            src="/icon_photo.png"
          />
          <img
            className={`${styles.marker_border} ${styles.marker_border_pdf}`}
            src="/icon_photo_pdf.png"
          />
        </div>
      </div>
    </div>
  );
};

export default TaskPhoto;
