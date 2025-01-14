import { useCallback, useEffect } from "react";

export const useKeyboard = (
  setView: (veiw: "firstPerson" | "map" | "orthographic") => void
) => {
  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key.toUpperCase()) {
        case "T":
          setView("orthographic");
          break;
        case "P":
          setView("map");
          break;
        case "D":
          setView("firstPerson");
          break;
        default:
      }
    },
    [setView]
  );

  useEffect(() => {
    window.addEventListener("keypress", handleKeyPress);

    return () => {
      window.removeEventListener("keypress", handleKeyPress);
    };
  }, [handleKeyPress]);
};
