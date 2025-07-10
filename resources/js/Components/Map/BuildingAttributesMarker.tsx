import styles from "./task_photo.module.css";

const BuildingAttributesMarker: any = ({ data, onClick }: any) => {
  const imageSrc: any = data.link
    ? data.link
    : null;

  return (
    <div style={{ cursor: "pointer" }} onClick={() => onClick && onClick(data.id,data.digest)}>
      <div className={styles.js_popup}>
        <div className={styles.js_popup_border}>
          <div className={styles.js_azimuth}>
            <img
              className={styles.azimuth}
    
              src="/icon_azimuth.png"
              style={{ transform: `rotate(${data.photo_heading}deg)` }}
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

export default BuildingAttributesMarker;
