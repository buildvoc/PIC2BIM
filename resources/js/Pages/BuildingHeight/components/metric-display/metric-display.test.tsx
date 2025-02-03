import { render, screen } from "@testing-library/react";
import MetricDisplay from "./metric-display";

describe("Metric Display", () => {
  it("metric display shows supplied values", () => {
    render(<MetricDisplay label="volume" unit="m3" value={1000} />);
    const metricDisplayElement = screen.getByTestId("metric-display");
    const metricDisplayValue = metricDisplayElement.textContent;
    expect(metricDisplayElement).toBeInTheDocument();
    expect(metricDisplayValue).toEqual("volume (m3): 1000");
  });
});
