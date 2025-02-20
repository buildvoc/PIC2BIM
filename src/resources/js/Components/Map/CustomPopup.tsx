
const styles = {
  container: {
    width: "300px",
  },
  text: {
    color: "rgb(50, 173, 230)",
    fontSize: 16,
    fontWeight: "500",
  },
};

const CustomPopup = ({
  points,
  pathText,
  latitude,
  longitude,
  altitude,
  accuracy,
  time,
}: any) => {
  return (
    <div style={styles.container}>
      <h2 className="mb-4 font-semibold text-base">Point {points}</h2>
      <div style={styles.text}>Path: {pathText}</div>
      <div style={styles.text}>Latitude: {latitude}</div>
      <div style={styles.text}>Longitude: {longitude}</div>
      <div style={styles.text}>Altitude: {altitude}</div>
      <div style={styles.text}>Accuracy: {accuracy}</div>
      <div style={styles.text}>Created time: {time}</div>
    </div>
  );
};
export default CustomPopup;
