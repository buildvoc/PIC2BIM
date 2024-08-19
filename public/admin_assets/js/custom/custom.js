function restrictNumericInput(event, input) {
    if (event.keyCode == 46 || event.keyCode == 8 || event.keyCode == 9 || event.keyCode == 27 || event.keyCode == 13 ||
        (event.keyCode == 65 && event.ctrlKey === true) ||
        (event.keyCode == 67 && event.ctrlKey === true) ||
        (event.keyCode == 88 && event.ctrlKey === true) ||
        (event.keyCode >= 35 && event.keyCode <= 39)) {
        return;
    }
    if (event.keyCode == 46 || event.keyCode == 190) {
        if (input.value.indexOf('.') !== -1 || input.value.length === 0) {
        event.preventDefault();
        }
    } else if (event.keyCode < 48 || event.keyCode > 57) {
        event.preventDefault();
    }
}
