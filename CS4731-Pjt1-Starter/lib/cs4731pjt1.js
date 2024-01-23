/**
 * Get the viewbox dimensions from an XML file, or get the default if there are no dimensions.
 *
 * @param xmlDoc The XML document that contains the viewbox attribute
 * @param defaultDims The default viewbox dimensions to use if we can't get any from the XML document.
 * @returns {(number|number)[]} The viewbox dimensions.
 */
function xmlGetViewbox(xmlDoc, defaultDims) {

    //Initialize to the default viewbox, since that's what we'll fall back on
    //if there's a problem parsing the SVG file.
    let splitDims = defaultDims;

    //Get the viewbox attribute from the XML document.
    let viewBox = xmlDoc.getElementsByTagName("svg")[0].getAttribute("viewBox");

    if(viewBox !== null) {
        let dims = viewBox.split(" ");
        if(dims.length === 4) {     //A viewbox has exactly 4 dimensions

            //Converts every value in the array to an integer
            let dimsToFloat = dims.map(function (x) { return parseFloat(x); });

            //Checks that every converted value is a number
            let res = dimsToFloat.every(function(x) {return !isNaN(x);});

            if(res) splitDims = dimsToFloat;
        }
    }
    return splitDims;
}

/**
 * Gets the lines to draw from the XML document.
 *
 * @param xmlDoc The XML document containing the lines.
 * @param defaultColor The default color to use if we can't get any color information for a line.
 * @returns {*[][]} An array of two lists,
 *   where the first contains the vertices,
 *   and the second contains the corresponding colors
 */
function xmlGetLines(xmlDoc, defaultColor) {
    let polyLinePoints = [];
    let polyLineColors = [];

    //Gets all the lines and puts them into an array
    let line = xmlDoc.getElementsByTagName("line");

    if(line != null) {
        for (let i = 0; i < line.length; i++) {
            let thisLine = xmlDoc.getElementsByTagName("line")[i];

            //Get the endpoints of the line
            let x1 = thisLine.getAttribute("x1");
            let y1 = thisLine.getAttribute("y1");
            let x2 = thisLine.getAttribute("x2");
            let y2 = thisLine.getAttribute("y2");

            //Add the vertices to the first list
            polyLinePoints.push(vec2(parseFloat(x1), parseFloat(y1)));
            polyLinePoints.push(vec2(parseFloat(x2), parseFloat(y2)));

            //We need a color value for each vertex to keep the fragment shader happy
            //Get the stroke color if it exists or the default color otherwise
            let stroke = thisLine.getAttribute("stroke");
            let thisColor = defaultColor;

            //Check for stroke attribute
            if (stroke !== null) {
                thisColor = hexToRgb(stroke);
            }
            else {
                //Check for stroke information in a style attribute
                //ex. style="fill:none;stroke:#f40000;stroke-width:1.165"
                let style = thisLine.getAttribute("style");
                if(style != null) {
                    let strokeSubstr = style.match("stroke:#[0-9A-Fa-f]{6}");
                    if (strokeSubstr != null) {
                        thisColor = hexToRgb(strokeSubstr[0].match("#[0-9A-Fa-f]{6}"));
                    }
                }
            }

            //Add the colors to the second list
            polyLineColors.push(vec4(thisColor.r, thisColor.g, thisColor.b, 1.0));
            polyLineColors.push(vec4(thisColor.r, thisColor.g, thisColor.b, 1.0));
        }
    }
    return [polyLinePoints, polyLineColors];
}

/**
 * Sets up a FileReader object to read an uploaded file as a text file.
 *
 * @param evt The fired event that contains the uploaded file.
 * @returns {FileReader} The FileReader object for the uploaded file.
 */
function readTextFile(evt)
{
    //https://stackoverflow.com/questions/35915620/uncaught-typeerror-cannot-read-property-target-of-undefined
    //https://stackoverflow.com/questions/16404327/how-to-pass-event-as-argument-to-an-inline-event-handler-in-javascript
    let file = evt.target.files[0];

    let reader = new FileReader();
    reader.readAsText(file);
    return reader;
}


/**
 * Converts a hexadecimal value to the RGB value (0.0 - 1.0) that the
 * fragment shader understands.
 * Thanks to https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
 *
 * @param hex The hexadecimal value
 * @returns {{r: number, b: number, g: number}|null} The RGB equivalent, or null if the input is invalid.
 */
function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16)/255.0,
        g: parseInt(result[2], 16)/255.0,
        b: parseInt(result[3], 16)/255.0
    } : null;
}