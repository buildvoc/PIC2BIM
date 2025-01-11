import Typography from "@mui/material/Typography";
import { ComputedMetric } from "../../types/metric";

const MetricDisplay = ({ label, unit, value }: ComputedMetric): JSX.Element => {
  return (
    <Typography gutterBottom data-testid="metric-display">
      {label} &#40;{unit}&#41;: {parseFloat(value.toFixed(2))}
    </Typography>
  );
};

export default MetricDisplay;
