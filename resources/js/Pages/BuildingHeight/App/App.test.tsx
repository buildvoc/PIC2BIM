import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders learn react link", () => {
  render(<App />);
  const homeElement = screen.getByTestId("App");
  expect(homeElement).toBeInTheDocument();
});
