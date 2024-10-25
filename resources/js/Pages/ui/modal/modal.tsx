import { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { FaSync } from "react-icons/fa";
import { FaArrowLeft } from "react-icons/fa";
import { FaArrowRight } from "react-icons/fa";
import { cnvrtImgUrl } from "@/utils/helpers";
import useLocalStorage from "@/hooks/useLocalStorage";

const Modal_ = ({
  modal,
  setModal,
  handleClose,
  photos,
  rotateLeft,
  rotateRight,
}: any) => {
  const imageSrc = cnvrtImgUrl(photos[modal.index]?.photo?.photo);
  const [image, setImage] = useState(imageSrc);
  const [selectedTaskPhotos, setSelectedTasksPhoto] = useLocalStorage(
    "tasksPhotos",
    []
  );
  useEffect(() => {
    setImage(imageSrc);
  }, [imageSrc]);

  const handleImageLeft = () => {
    let indexCheck = modal.index;
    if (--indexCheck >= 0) {
      let image = photos[indexCheck];
      setModal((prevData: any) => ({
        ...prevData,
        index: indexCheck,
      }));
      setImage(cnvrtImgUrl(image?.photo?.photo));
    }
  };
  const handleImageRight = () => {
    let indexCheck = modal.index;
    if (++indexCheck < photos.length) {
      let image = photos[indexCheck];
      setModal((prevData: any) => ({
        ...prevData,
        index: indexCheck,
      }));
      setImage(cnvrtImgUrl(image?.photo?.photo));
    }
  };

  return (
    <Modal
      show={modal?.isShow}
      onHide={handleClose}
      size="lg"
      id="image-gallery"
    >
      <Modal.Header className="modal-header">
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            alignItems: "end",
          }}
        >
          <button
            type="button"
            className="close"
            data-dismiss="modal"
            onClick={handleClose}
          >
            <span aria-hidden="true">×</span>
            <span className="sr-only"></span>
          </button>
        </div>
      </Modal.Header>
      <Modal.Body className="modal_body">
        <a onClick={()=>{
          setSelectedTasksPhoto([])
          const selectedArray=[photos[modal?.index]]
          setSelectedTasksPhoto(selectedArray)

          window.open(`./photo_detail?index=${modal?.index}`)
        }} target="_blank">
          <img
            src={image}
            className="img-fluid"
            style={{ transform: `rotate(${photos[modal.index]?.angle}deg)` }}
          />
        </a>
      </Modal.Body>
      <Modal.Footer
        style={{
          display: "flex",
          flex: "1",
          flexDirection: "column",
          padding: 20,
        }}
      >
        <div className="js_photo_rotate">
          <button
            type="button"
            className="btn btn-primary"
            id="show-previous-image"
            onClick={handleImageLeft}
            style={{ opacity: modal.index != 0 ? 1 : 0 }}
          >
            <FaArrowLeft className="fa" />
          </button>

          <div style={{ width: "20%" }} />
          {
            rotateLeft && (          <div
              className="js_photo_rotate_left"
              data-pht_id="image-gallery-image"
              onClick={() => {
                return rotateLeft(photos[modal.index].photo.digest, "left");
              }}
            >
              {" "}
              <i>
                <FaSync className="fas" />
              </i>
              Rotate Left
            </div>)
          }

          {
            rotateRight && (
              <div
              className="js_photo_rotate_right"
              data-pht_id="image-gallery-image"
              onClick={() => {
                return rotateRight(photos[modal.index].photo.digest, "right");
              }}
            >
              <i>
                <FaSync className="fas" />
              </i>
              Rotate Right
            </div>
            )
          }
          <div style={{ width: "20%" }} />
          <button
            type="button"
            id="show-next-image"
            className="btn btn-primary "
            onClick={handleImageRight}
            style={{ opacity: modal.index < photos.length - 1 ? 1 : 0 }}
          >
            <FaArrowRight className="fa" />
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default Modal_;
