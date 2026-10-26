"use strict";
// nPlot graphing program
var version = "6.20i";
// iPad edition (6.20i): touch/pointer input, no-keyboard alternatives for ctrl/shift actions, Safari clipboard fix,
//   export/import of graphs as files, Copy Slopes for the tangent finder, and error bars / uncertainties hidden by default.
//   Adapted by Alan Calac (St. Ignatius College Prep) with permission of Geoff Nunes.  Look for "iPad edition" comments.
document.getElementById("version").innerHTML = 'nPlot v'  + version;
// TO DO LIST
//
// KNOWN BUGS
//  
//
// Debugging flag ****************************************************************************************************************
var debug = false;

// Section:  Keeping track *****************************************************************************************************
// global variables for keeping track of curves and fits
//
var activeSheet = "A"                       // letter code for the active data set 
var nSheets = 5;                            // number of separate data curves we can handle
var activePanel = 'basic';                  // which model panel is displayed
var sheetFitTypes = ['none', 'none', 'none', 'none', 'none'];  // array to hold type of fit for each sheet
var sheetSymbols = ['circle', 'square', 'diamond', 'triUp', 'triDown'];
var sheetColors = ['npColor1', 'npColor2', 'npColor3', 'npColor4', 'npColor5'];
var sheetDashes = [1e12, 2, 5, 10, 25];
var activePrefSheet = 'A';
var selectedFitInfo = {fitType: 'none', ia: [], iaa: [], DOF: 0};  // key parameters for performing the fit
var fitDownload = ['','','','',''];
var nRows = 100;       // number of rows in the data spreadsheet

// Section:  Canvas ************************************************************************************************************
// define the canvas and dimensional parameters for plotting
//
var canvas1 = document.getElementById("canvas1");   // define the drawing area for the graph
var ctx = canvas1.getContext("2d");                 // get a handle by which we can refer to this drawing area
var plotParams = {xFull: 650,      // Canvas width  pixels
		  yFull: 600,      // Canvas height in pixels
		  xBord: 55,       // x Border area for labels   //original value:  50
		  yBord: 30,       // y Border area for labels
		  xSize: 535,      // Width of graphing area
		  ySize: 525,      // Height of graphing area
		  xWidth: 590,     // xSize plus xBord          //original value:  585   
		  yWidth: 555,     // ySize plus yBord
		  xLO: 8,          // offset from Canvas edge for x axis labels
		  yLO: 16,         // offset from Canvas edge for y axis labels  //original value: 21
		  pTO: 10,         // offset from Canvas edge for plot title
		  tCO: -9,         // Tweak to make title appear more centered
		  sO: 5,           // baseline offset for super- and sub-scripts
		  aSO: 3,          // baseline offset for super- and sub-scripts in annotation
		  xAnnMin: 61,     // minimum x position for annotation
		  yAnnMin: 41,     // minimum y position for annotation
		  annLinSpac: 16,  // line spacing for annotation
		  annBord: 5,       // buffer around annotation text
		  titleFont: '20px Arial',   // Font for axis labeling
		  subFont: '15px Arial',     // Font for axis label subscripts & annotation
		  annSubFont: '11px Arial',  // font for annotation subscripts
		 };

// Section:  Global variables **************************************************************************************************
//
// Used for managing the the graph on the canvas
var theBox = {xmin: 0, xmax: 0, ymin: 0, ymax: 0};         // defines the graph axes box
var downloading = false;
var madeGraph = false;
var thereIsNoGraph = true;
var xLabelText= '';
var yLabelText = '';
var greekArray = [];

// Things in the Settings menu
var yesDownload = false;
var includeFit = false;
var yesGrid = true;
var yesPoints = [true, true, true, true, true];
var scaleWithBars = true;
var includeFormulas = true;
var requireOrigin = true;
var profMode = true;
var noUncertainty = true;       // iPad edition: uncertainties suppressed by default (setting is now saved)
var showErrorBars = false;      // iPad edition: error bars from the ±x/±y columns hidden by default (setting is saved)
var autoZoom = true;

// iPad edition: device detection and touch bookkeeping
var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);   // iPadOS reports itself as a Mac
var longPressFired = false;     // set when a long press opened a menu, so the click that follows is ignored
var pendingImport = null;       // graph read from a file, waiting for the "erase current graph?" confirmation
var lastFits = [null, null, null, null, null];   // most recent good fit on each sheet (used by Copy Slopes)

// Position of the cursor in the canvas and flags related to user interactions
var mouseX = 0;
var mouseY = 0;
var ctrlKeyDown = false;
var updateAcknowledge = false;

// Manage nonlinear fits
var justGuessing = false;
var stillGuessing = false;
var nlpar = 17;

// Colors
var backgroundColor = "#F0F0F0";
var selectedColor = "#D0D0D0";
var sheetTabColor = "#E0E0E0";
var sheetSelectColor = "#C0C0C0";
var gridColor = "#B0B0B0";
var inkColor = "#000000";
var trumpsFavoriteColor = "#FFFFFF";
var axisColor = "#808080";
var hiLiteColor = "#FF0000";
var cellSelectColor = "#C0C0F0";
var fontColor = "#4C6A94";
var curveColors = ["#990235", "#88C000", "#0088C0", "#C08800", "#C00088", "#000000",
		   "#FF0000", "#00FF00", "#0000FF", "#FF00FF", "#00FFFF"];
var tangentColor = "#0000FF";

// Flags for managing the tangent finding feature
var tangentChecked = false
var lockToDataChecked = false;

// Things used in annotating the graph
var noteClicks = 0;
var haveText = false;
var addingArrow = false;
var arrowStarted = false;
var addingLine = false;
var lineStarted = false;
var annotation = {text: [], x:[], y: [], isFit: [], tWidth: [], tHeight: [], activeSheetNum: [], fitType: [], color: [], index: 0};
var editWhich = -1;
var editNoteFlag = false;
var editArrowFlag = false;
var deleteFlag = false;
var annotateWhat = 0;
var sheetAnnoteStatus = [0,0,0,0,0];
var hiLitePoints = -1;
var savedPoint = {x: 0, y: 0, text: '', tW: 0, tH: 0};

// Variables used in invoking scientific notation for axis numbering
var scaleThreshold = 4;
var xScale = 0;
var yScale = 0;

// Variable used to manage data linearization
var dataLinearized = false;
var labelsLinearized = false;
var transformationString = "";
var xform = 'none';
var savedXTitle = "";
var savedXUnit = "";

// Variables for interacting with the data spreadsheet (scrolling, pasting, etc.)
var mousePagey = 0;
const scrollPoint = 340;
var vScrolling = false;
var vScrollAmount = 22;
var mouseDownCell;
var mouseDownInCell = false;
var mouseDownColumn = 0;
var mouseDownRow = 0;
var mouseUpColumn = 0;
var mouseUpRow = 0;
var selectStartRow = 0;
var selectStartColumn = 0;
var selectEndRow = 0;
var selectEndColumn = 0;
var nSelected = 0;

// global variables for graph saving and recalling
var nGraphs, recalledAnnotation, savedName, styles;
var graphs, points, xLabs, yLabs, xUnits, yUnits, titles, fits, xData, yData, xErrs, yErrs;
var xGraphDataList, yGraphDataList, xGraphErrList, yGraphErrList;
var graphList, pointsList, xLabelList, xUnitList, yLabelList, yUnitList, titleList, fitsList;
var styleList, aTextList, aXList, aYList, aIsFitList, aTWList, aTHList, aWhichCurveList, aWhatFitList, aColorList, aNNotesList;


// Section:  Initialization ****************************************************************************************************
// A few things to do before we get real
//
hideTheFit();
clearTangentData();
document.getElementById('IBOption').style.display = 'none';
fillGreek();
checkVersion();
checkSettings();
clearTangentData();
document.getElementById("sheetButton1").style.backgroundColor = sheetSelectColor;  // sheet 1 is active at the start:  shade the tab
setScreenZoom(false);

// Section:  Spreadsheet *******************************************************************************************************
// create the data spreadsheets
//
// this section of code creates the data spreadsheet.  Actually, it creates FIVE of them
// the top row contains the strings listed in the heads array below
// the left column contains a row number
// the rest are the cells, each of which is an input field.  Each cell has a unique HTML id, structured as follows:
//      the cell with id AA1 is the upper left cell in Sheet 1.  Cell BC7, is on in column B, on sheet 3, in row number 7.
// the cells also have their own class (cellClass) so they can be referred to as a group
// oh, and there is a right-most column filled with check boxes
//
var heads = ["", " x data ", " y data ", " &plusmn; x ", " &plusmn; y ", "skip"];
for (var k=1; k<6; k++) {          // loop over the five sheets
    var sheetName = "Sheet" + k;   // name the sheet
    var idLetter = String.fromCharCode("A".charCodeAt(0)+k-1);         // create id letter to identify sheet
    for (var i=0; i<nRows+1; i++) {                                    // loop over the number of table rows
	var row = document.getElementById(sheetName).insertRow(-1);    // create a table row
	for (var j=0; j<6; j++) {                                      // loop over 6 columns
	    var letter = String.fromCharCode("A".charCodeAt(0)+j-1);   // create a string to label each cell
	    letter = letter + idLetter;
	    // the next line of code does a lot all at once, and uses some javascript voodoo
	    // if either i or j are non-zero, then we give an input id to the cell (e.g. a1 or or d17)
	    // but if one is zero, then we get the value of i, and if i is non zero, we get heads[j]
	    // This trickery generates our row and column labels in the spreadsheet
	    var theId = letter + i;
	    if (i > 0 && j == 5) {
		row.insertCell(-1).innerHTML = "<input type='checkbox' id='"+ theId +"' onclick='computeAll()' class='chkClass'/>";
	    } else {
		row.insertCell(-1).innerHTML = i&&j ? "<input  id='"+ theId +"' class='cellClass'/>" : i||heads[j];
	    }
	}
    }
}
var DATA={}, INPUTS=[].slice.call(document.querySelectorAll(".cellClass"));  // create a data object and an array of inputs

// Section:   Interactions *****************************************************************************************************
// handle user interactions with the spreadsheets
//
INPUTS.forEach(function(elm) {
    elm.onfocus = function(e) {
	// function called when a cell gets focus
        e.target.value = sessionStorage[e.target.id] || "";   // set the input field to hold our local storage value
	var clett = e.target.id.substring(0,1);               // determine the letter (column) of the selected cell
	var cnum = clett.charCodeAt(0);                       // get the character code of that letter
	var rnum = parseFloat(e.target.id.substring(2));      // get the row number
	var newid = clett + activeSheet + rnum;                // build the id of this input field
	var inCell = false;                                   // flag for in-cell text editing
	e.target.onkeydown = function(kdown) {
	    if (kdown.key == 'Enter') {
		// if the user presses the Enter key in this cell, we move focus to the first column in the next row
		cnum = 65;
		rnum = rnum + 1;
		if (rnum >= nRows+1) {rnum = nRows}
		newid = String.fromCharCode(cnum) + activeSheet + rnum;
		e.target.blur();
		document.getElementById(newid).focus();
	    } else if (kdown.key == 'ArrowRight' && !inCell) {
		// user pressed right arrow, move one to the right, or wrap to first column in next row
		if (cnum >= 68) {
		    cnum = 65
		    rnum = rnum + 1;
		    if (rnum >=nRows+1) {rnum = 1}
		} else {
		    cnum = cnum + 1;
		}
		newid = String.fromCharCode(cnum) + activeSheet + rnum;
		e.target.blur();
		document.getElementById(newid).focus();
	    } else if (kdown.key == 'ArrowLeft' && !inCell) {
		// user pressed left arrow, move one to the left, or wrap to last column in row above
		if (cnum <= 65) {
		    cnum = 68;
		    rnum = rnum - 1;
		    if (rnum <=0) {rnum = nRows}
		} else {
		    cnum = cnum - 1;
		}
		newid = String.fromCharCode(cnum) + activeSheet + rnum;
		e.target.blur();
		document.getElementById(newid).focus();
	    } else if (kdown.key == 'ArrowUp') {
		// up arrow, move up one, or wrap to bottom cell in the same column
		inCell = false;
		if (rnum <= 1) {
		    rnum = nRows;
		} else {
		    rnum = rnum - 1;
		}
		newid = String.fromCharCode(cnum) + activeSheet + rnum;
		e.target.blur();
		document.getElementById(newid).focus();
	    } else if (kdown.key == 'ArrowDown') {
		// down arrow, move down one, or wrap to top cell in same column
		inCell = false;
		if (rnum >= nRows) {
		    rnum = 1;
		} else {
		    rnum = rnum + 1;
		}
		newid = String.fromCharCode(cnum) + activeSheet + rnum;
		e.target.blur();
		document.getElementById(newid).focus();
	    } else if (kdown.shiftKey && kdown.keyCode == 46) {
		e.target.value = "";
	    }
	}
	e.target.ondblclick = function() {                         // Double-click in a cell causes arrow keys to move cursor
	    e.target.style.backgroundColor = trumpsFavoriteColor;  //    within the cell instead of beween cells.
	    inCell = true;
	}
    };
    elm.onblur = function(e) {
	// when a cell loses focus, we copy the html input value to the local storage object.
	e.target.style.backgroundColor = backgroundColor;
	if (!mouseDownInCell) {
	    var valid = isValid(e.target.value);
	    if (!valid) {
		e.target.style.backgroundColor = "red";
	    }
	}
	if (sessionStorage[e.target.id] != e.target.value) {
	    if (activePanel == 'expert') {
		hideTheFit();
		justGuessing = true;
		showGuessInputs(sheetFitTypes[getSheetNumber(activeSheet)]);;
	    }
	}
	sessionStorage[e.target.id] = e.target.value;
        computeAll();   // ...and we call computeAll, with does everything!!
    };

    // this function called (via the get mechanism) to retrieve data from session storage and populate the HTML spreadsheet
    // Whatever the user originally typed is kept in sessionStorage.  When that storage is accessed, the string held
    // there is processed through this function for plotting, and also for display in the spreadsheet.
    var getter = function() {
        var value = sessionStorage[elm.id] || "";   // returns empty string if the first argument evaluates to "false"

	var foo = nParse(value);             // this function evaluates the cell, allowing math in a cell
	if (isNaN(parseFloat(foo))) {
	    return foo;
	} else {
	    var tmp = parseFloat(foo);                                     // convert to number
	    if (tmp != 0) {
		if (Math.abs(tmp) >= 1000000 || Math.abs(tmp) <= .000001) {  // test to see if should be in sci. notation
	    	    tmp = tmp.toExponential();                               // display in sci notation
		}
	    }
	    return tmp;
	}
    };
    
    elm.onpaste = function(e) { 
	// function to take data pasted from Excel or Google Sheets and get it into a 2D array
	var clipboardData, pastedData;

	// Stop data actually being pasted into div
	e.stopPropagation();
	e.preventDefault();

	// Get pasted data via clipboard API
	clipboardData = e.clipboardData;
	pastedData = clipboardData.getData('Text');  // pastedData is a string holding the clipped data

	var cellData = [];                  // array to hold pasted cell data
	var isOK = false;                   // flag to prevent pasting bad data
	var someOK = false;                 // another flag related to bad data

	// the next line uses a regular expression to handle data on Macs and other pieces of Apple evil
	// the g (global) modifier directs to find all matches instead of stopping at the first match
	// the pasted data is split into an array (named rows) in which each element is a row of data
	var rows = pastedData.split(/\r\n|\r|\n/g);  // split pastedData into rows, which are separated by new lines
	
	for (var rowNr = 0; rowNr < rows.length; rowNr++) {         // loop over the array of rows
            var data = rows[rowNr].split('\t');                     // data in rows is tab delimitted: make each row an array
	    isOK = true;                                            // Because Microsoft is Microsoft...
	    for (var cellNr = 0; cellNr < data.length; cellNr++) {  // ...need to check pasted data for non-numerics...
		if (!isValid(data[cellNr]) || data[cellNr] == "") { // ...and also for a null character
		    isOK = false;
		    if (data[cellNr] != "") {
			showBadPaste();
		    }
		} else {
		    someOK = true;
		}
	    }
	    if (isOK) {	                      // we only push a row if all elements are numeric
		cellData.push(data);          // each element of cellData is an array containing a row
	    }
	}
	if (someOK) {
	    var pasteCol = e.target.id.charCodeAt(0) - 64;                  // determine the column for paste start
	    var pasteRow = parseInt(e.target.id.substring(2));              // determine the row for paste start
	    var rowLimit = Math.min(cellData.length, nRows+1 - pasteRow);   // determine the max # of rows to paste (no wrapping)
	    var colLimit = Math.min(cellData[0].length, 5 - pasteCol);      // determine the max # of columns to paste (no rapping!)
	    for (var i=0; i<rowLimit; i++) {                                             // loop over rows...
		for (var j=0; j<colLimit; j++) {                                         // ...and columns
		    var letter = String.fromCharCode("A".charCodeAt(0)+pasteCol+j-1);    // get the cell letter
		    letter = letter + activeSheet;                                        // plus curve letter for multiple curves
		    var cellId = letter + parseInt(pasteRow + i);                        // get the cell number
		    sessionStorage[cellId] = cellData[i][j];                             // paste the data into the cell
		}
	    }
	    e.target.value = cellData[0][0];
	    e.target.blur();
	}
	if (isOK || someOK) {
	    hideTheFit();
	    if (activePanel == 'expert') {
		justGuessing = true;
		showGuessInputs(sheetFitTypes[getSheetNumber(activeSheet)]);;
	    }
	    computeAll();
	}	    
    };
    elm.onmousedown = function (e) {
	if (nSelected == 0) {
	    mouseDownInCell = true;
	    var clett = e.target.id.substring(0,1);
	    mouseDownColumn = e.target.id.substring(0,1).charCodeAt(0);
	    mouseDownRow = parseFloat(e.target.id.substring(2));
	    mouseDownCell = e.target;
	} else {
	    nSelected = 0;
	    var elements = document.getElementsByClassName('cellClass');
	    for (let i = 0; i < elements.length; i++) {
		elements[i].style.backgroundColor = "";
	    }
	}	    
    };
    elm.onmouseleave = function(e) {
	if (mouseDownInCell) {
	    e.target.blur();
	}
    };
    elm.onmouseenter = function(e) {
	if (mouseDownInCell) {
	    var clett = e.target.id.substring(0,1);
	    mouseUpColumn = e.target.id.substring(0,1).charCodeAt(0);
	    mouseUpRow = parseFloat(e.target.id.substring(2));
	    var elements = document.getElementsByClassName('cellClass');
	    for (let i = 0; i < elements.length; i++) {
		elements[i].style.backgroundColor = "";
	    }
	    if (mouseUpColumn >= mouseDownColumn) {
		selectStartColumn = mouseDownColumn;
		selectEndColumn = mouseUpColumn;
	    } else {
		selectStartColumn = mouseUpColumn;
		selectEndColumn = mouseDownColumn;
	    }
	    if (mouseUpRow >= mouseDownRow) {
		selectStartRow = mouseDownRow;
		selectEndRow = mouseUpRow;
	    } else {
		selectStartRow = mouseUpRow;
		selectEndRow = mouseDownRow;
	    }
	    nSelected = 0;
	    for (let i = selectStartColumn; i <= selectEndColumn; i++) {
		for (let j = selectStartRow; j <= selectEndRow; j++) {
		    var cellId = String.fromCharCode(i) + activeSheet + j.toString();
		    document.getElementById(cellId).style.backgroundColor = cellSelectColor;
		    nSelected = nSelected + 1;
		}
	    }
	}
    };
    
    Object.defineProperty(DATA, elm.id, {get:getter});               // when DATA object is accessed, return data through
    Object.defineProperty(DATA, elm.id.toLowerCase(), {get:getter}); // function named getter (see above).
});

document.body.onmouseup = function(e) {
    mouseDownInCell = false;
    vScrolling = false;
};

document.body.oncopy = function(e) {
    if (nSelected > 0) {
	var dataText = '';
	for (let i = selectStartRow; i <= selectEndRow; i++) {
	    for (let j = selectStartColumn; j <= selectEndColumn; j++) {
		var cellId = String.fromCharCode(j) + activeSheet + i.toString();
		cellId = cellId.toLowerCase();
		var value = DATA[cellId];
		dataText = dataText + value;
		if (j < selectEndColumn) {
		    dataText = dataText + '\t';
		}
	    }
	    dataText = dataText + '\n';
	}
	navigator.clipboard.writeText(dataText);
	nSelected = 0;
	var elements = document.getElementsByClassName('cellClass');
	for (let i = 0; i < elements.length; i++) {
	    elements[i].style.backgroundColor = "";
	}
    }
};

document.body.onkeydown = function(kdown) {
    if (kdown.key === "Delete") {
	if (nSelected > 0) {
	    for (let i = selectStartRow; i <= selectEndRow; i++) {
		for (let j = selectStartColumn; j <= selectEndColumn; j++) {
		    var cellId = String.fromCharCode(j) + activeSheet + i.toString();
		    cellId = cellId.toUpperCase();
		    document.getElementById(cellId).value = "";
		    sessionStorage[cellId] = '';
		}
	    }
	    nSelected = 0;
	    var elements = document.getElementsByClassName('cellClass');
	    for (let i = 0; i < elements.length; i++) {
		elements[i].style.backgroundColor = "";
	    }
	}
    computeAll();
    }
};

// Section:  Buttons  **********************************************************************************************************
// Event listeners for front panel buttons
//
document.getElementById("sheetButton1").addEventListener("click", function(e) {
    setSheet('A');
});

document.getElementById("sheetButton2").addEventListener("click", function(e) {
    setSheet('B');
});

document.getElementById("sheetButton3").addEventListener("click", function(e) {
    setSheet('C');
});

document.getElementById("sheetButton4").addEventListener("click", function(e) {
    setSheet('D');
});

document.getElementById("sheetButton5").addEventListener("click", function(e) {
    setSheet('E');
});

document.getElementById("miniSheetPanel").addEventListener("mousemove", function(e) {
    if(e.target.classList.contains("miniSheet")) {
	vScroll(e);
    }
});

document.getElementById("settingsButton").addEventListener("click", function(e) {
    showSettings();
});

document.getElementById("linearizeButton").addEventListener("click", function(e) {
    showLinearize();
});

document.getElementById("undoLinearizeButton").addEventListener("click", function(e) {
    undoLinearize();
});

document.getElementById("tradeButton").addEventListener("click", function(e) {
    if (e.ctrlKey) {
	tradeData(true);
    } else {
	tradeData(false);
    }
});

document.getElementById("clearDataButton").addEventListener("click", function(e){
    if( e.ctrlKey) {
	clearAllData();
    } else {
	clearData(activeSheet, false);
    }
});

document.getElementById("saveGraphButton").addEventListener("click", function(e){
    saveGraph();
});

document.getElementById("showSavedGraphsButton").addEventListener("click", function(e){
    showSavedGraphs();
});

document.getElementById("downloadImageButton").addEventListener('click', function(e) {
    if (e.ctrlKey && !yesDownload) {
	downloadGraph(true);
    } else {
	downloadGraph(false);
    }
});

document.getElementById("annotateButton").addEventListener("click", function(e){
    showAnnotate();
});

document.getElementById("getHelpButton").addEventListener("click", function(e){
    showHelp();
});

document.getElementById("aboutButton").addEventListener("click", function(e){
    showAbout();
});

document.getElementById("basicModelsTab").addEventListener("click", function(e){
    activePanel = setModelsPanel("basic");
});

document.getElementById("advancedModelsTab").addEventListener("click", function(e){
    activePanel = setModelsPanel("advanced");
});

document.getElementById("expertModelsTab").addEventListener("click", function(e){
    activePanel = setModelsPanel("expert");
});

document.body.addEventListener("keydown", function(e) {
    if (e.ctrlKey && !ctrlKeyDown) {
	ctrlKeyDown = true;
	document.getElementById("clearDataButton").innerHTML = "Clear All";
	document.getElementById("tradeButton").style.fontSize = "11px";
	document.getElementById("tradeButton").style.paddingTop = "3px";
	document.getElementById("tradeButton").innerHTML = "Swap x &amp; y <b><i>and</i></b> also labels";
	if (!yesDownload) {
	    document.getElementById("downloadImageButton").innerHTML = "Graph in New Tab";
	}
    } 	
});

document.body.addEventListener("keyup", function(e) {
    if (!e.ctrlKey && ctrlKeyDown) {
	ctrlKeyDown = false;
	document.getElementById("clearDataButton").innerHTML = "Clear Data";
	document.getElementById("tradeButton").innerHTML = "Swap x &amp; y";
	document.getElementById("tradeButton").style.fontSize = "14px";
	document.getElementById("tradeButton").style.paddingTop = "8px";
	if (!yesDownload) {
	    document.getElementById("downloadImageButton").innerHTML = "Graph to Clipboard";
	}
    }
});

// Section:  Models ************************************************************************************************************
// Event listeners for the model controls
//
document.getElementById("fitNone").addEventListener("click", function(e) {
    changeModel('none');
});

document.getElementById("noRelation").addEventListener("click", function(e) {
    changeModel('noRelation');
});

document.getElementById("yEqualsX").addEventListener("click", function(e) {
    changeModel('exactProportion');
});

document.getElementById("yEqualsAX").addEventListener("click", function(e) {
    changeModel('proportional');
});

document.getElementById("fitLinear").addEventListener("click", function(e) {
    changeModel('linear');
});

document.getElementById("fitSquare").addEventListener("click", function(e) {
    changeModel('squareLaw');
});

document.getElementById("fitQuadratic").addEventListener("click", function(e) {
    changeModel('quadratic');
});

document.getElementById("fitInverse").addEventListener("click", function(e) {
    changeModel('inverse');
});

document.getElementById("fitInverseSquare").addEventListener("click", function(e) {
    changeModel('inverseSquare');
});

document.getElementById("fitSquareRoot").addEventListener("click", function(e) {
    changeModel('root');
});

document.getElementById("fitInvSqrRoot").addEventListener("click", function(e) {
    changeModel('inverseRoot');
});

document.getElementById("advFitNone").addEventListener("click", function(e) {
    changeModel('none');
});

document.getElementById("fitPowerLaw").addEventListener("click", function(e) {
    changeModel('powerLaw');
});

document.getElementById("fitExponential").addEventListener("click", function(e) {
    changeModel('expDecay');
});

document.getElementById("fitLogarithm").addEventListener("click", function(e) {
    changeModel('log');
});

document.getElementById("expFitNone").addEventListener("click", function(e) {
    changeModel('none');
});

document.getElementById("fitCosine").addEventListener("click", function(e) {
    changeModel('cosine');
});

document.getElementById("fitDampedCosine").addEventListener("click", function(e) {
    changeModel('dampedCosine');
});

document.getElementById("fitRelaxation").addEventListener("click", function(e) {
    changeModel('relaxation');
});

document.getElementById("fitGaussian").addEventListener("click", function(e) {
    changeModel('gaussian');
});

// Section:  Nonlinear *********************************************************************************************************
// Event listeners for managing nonlinear (expert) fits
//

document.getElementById("guessA").addEventListener("keydown", function(e) {
    if (e.key === 'Enter') {
	stillGuessing = true;
	computeAll();
    }
});

document.getElementById("guessB").addEventListener("keydown", function(e) {
    if (e.key === 'Enter') {
	stillGuessing = true;
	computeAll();
    }
});

document.getElementById("guessC").addEventListener("keydown", function(e) {
    if (e.key === 'Enter') {
	stillGuessing = true;
	computeAll();
    }
});

document.getElementById("guessD").addEventListener("keydown", function(e) {
    if (e.key === 'Enter') {
	stillGuessing = true;
	computeAll();
    }
});

document.getElementById("goFitButton").addEventListener("click", function(e) {
    justGuessing = false;
    stillGuessing = false;
    computeAll();
});
    
// Section:  Finder ************************************************************************************************************
// Event listeners for the tangent finder
//
document.getElementById("trackSlope").addEventListener("click", function(e){
    if (tangentChecked) {
    	document.getElementById("trackSlope").checked = false;
    	tangentChecked = false;
    	lockToDataChecked = false;
	clearTangentData();
    	document.getElementById("lockToData").checked = false;
	computeAll();
    } else {
    	document.getElementById("trackSlope").checked = true;
    	document.getElementById("lockToData").checked = true;
    	tangentChecked = true;
    	lockToDataChecked = true;
    }
});

document.getElementById("lockToData").addEventListener("click", function(e){   // listen for clicks on the Lock To Data button
    if (lockToDataChecked) {
    	document.getElementById("lockToData").checked = false;
    	lockToDataChecked = false;
    } else {
	if (tangentChecked) {
    	    document.getElementById("lockToData").checked = true;
    	    lockToDataChecked = true;
	} else {
    	    document.getElementById("lockToData").checked = false;
    	    lockToDataChecked = false;
	}
    }
});

// Section:  Settings **********************************************************************************************************
// Event listeners for items in the settings menu
//
document.getElementById("yesDownload").addEventListener("click", function(e){
    toggleYesDownload();
});

document.getElementById("includeFit").addEventListener("click", function(e){
    toggleIncludeFit();
});

document.getElementById("showGrid").addEventListener("click", function (e) {
    toggleGrid();
});

document.getElementById("ptsSheetA").addEventListener("click", function (e) {
    togglePoints(0);
});

document.getElementById("ptsSheetB").addEventListener("click", function (e) {
    togglePoints(1);
});

document.getElementById("ptsSheetC").addEventListener("click", function (e) {
    togglePoints(2);
});

document.getElementById("ptsSheetD").addEventListener("click", function (e) {
    togglePoints(3);
});

document.getElementById("ptsSheetE").addEventListener("click", function (e) {
    togglePoints(4);
});

document.getElementById("includeBars").addEventListener("click", function (e) {
    toggleInclude();
});

document.getElementById("inclFormulas").addEventListener("click", function (e) {
    toggleIncludeFormulas();
});

document.getElementById("requireOrigin").addEventListener("click", function (e) {
    toggleRequireOrigin();
});

document.getElementById("professionalMode").addEventListener("click", function (e) {
    toggleProfessionalMode();
});

document.getElementById("noUncertainty").addEventListener("click", function (e) {
    toggleShowUncertainty();
});

document.getElementById("showErrorBars").addEventListener("click", function (e) {
    toggleShowErrorBars();
});

document.getElementById("autoZoom").addEventListener("click", function (e) {
    toggleAutoZoom();
});

window.addEventListener('resize', function (e) {
    setScreenZoom(true);
});

const choosers = document.getElementsByName("prefSheets");
choosers.forEach((element) => {
    element.addEventListener("click", e => {
	var sheet = e.target.id;
	sheet = sheet.replace('prefSheet', '');
	activePrefSheet = sheet;
	updateSelectors();
    });
});

document.getElementById("pointSelectorButton").addEventListener("click", function(e) {
    selectorDisplay('point', 'show');
});
    
document.getElementById("pointSelectorContent").addEventListener("click", function(e) {
    var sheetNumber = getSheetNumber(activePrefSheet);
    sheetSymbols[sheetNumber] = getSelection('point', e.target.id, e.target.parentNode.id);
    storeSelectorPrefs('points');
    computeAll();
});


document.getElementById("colorSelectorButton").addEventListener("click", function(e) {
    selectorDisplay('color', 'show');
});
    
document.getElementById("colorSelectorContent").addEventListener("click", function(e) {
    var sheetNumber = getSheetNumber(activePrefSheet);
    sheetColors[sheetNumber] = getSelection('color', e.target.id, e.target.parentNode.id);
    storeSelectorPrefs('colors');
    computeAll();
});

document.getElementById("dashSelectorButton").addEventListener("click", function(e) {
    selectorDisplay('dash', 'show');
});
    
document.getElementById("dashSelectorContent").addEventListener("click", function(e) {
    var sheetNumber = getSheetNumber(activePrefSheet);
    sheetDashes[sheetNumber] = getSelection('dash', e.target.id, e.target.parentNode.id);
    storeSelectorPrefs('dashes');
    computeAll();
});

document.getElementById("closeSettingsButton").addEventListener("click", function (e) {
    closeSettings();
});

document.getElementById("closeLinearizeButton").addEventListener("click", function (e) {
    closeLinearize();
});

// Section:  Modals ************************************************************************************************************
// Event listeners for modal elements
//
document.getElementById("savedGraphList").addEventListener("click", function(e) {
    // iPad edition: each list item now carries its name in a data attribute and has its own delete (×) control,
    //   so deleting no longer requires a shift-click.  Shift-click still works for keyboard users.
    var item = e.target.closest('li');
    if (!item || item.dataset.name === undefined) {
	return;
    }
    var graphListName = item.dataset.name;
    if (e.target.classList.contains('delGraph')) {
	if (window.confirm('Delete the saved graph "' + graphListName + '"?  This cannot be undone.')) {
	    removeGraph(graphListName);
	}
    } else if (e.shiftKey) {
	removeGraph(graphListName);
    } else {
	showDialog(graphListName);
    }
});

document.getElementById("exportGraphButton").addEventListener("click", function(e) {
    exportGraphFile();
});

document.getElementById("importGraphButton").addEventListener("click", function(e) {
    document.getElementById("importFileInput").value = "";
    document.getElementById("importFileInput").click();
});

document.getElementById("importFileInput").addEventListener("change", function(e) {
    if (e.target.files && e.target.files.length > 0) {
	readGraphFile(e.target.files[0]);
    }
});

document.getElementById("copySlopesButton").addEventListener("click", function(e) {
    copySlopes();
});

document.getElementById("recallProceedButton").addEventListener("click", function(e) {
    proceedWithRecall();
});

document.getElementById("recallCancelButton").addEventListener("click", function(e) {
    cancelRecall();
});

document.body.addEventListener("mouseup", function(e){                // close the saved graph list on any mouse up
    closeSideModal();
});

document.addEventListener("click", function(event) {
    if(event.target.classList.contains("close")) {
	event.target.parentNode.parentNode.style.display = "none";
    }
});

document.addEventListener("click", function(event) {
    if(event.target.classList.contains("modal")) {
	event.target.style.display = "none";
    }
});
							       
// Section:  Annotation ********************************************************************************************************
// Event listners for graph annotation feature
//
document.getElementById('noteTextInput').addEventListener("keypress", function(e) {
    noteReady();
});

document.getElementById('addFitButton').addEventListener("click", function(e) {
    buildFitList();
});

document.getElementById('addNoteButton').addEventListener("click", function(e) {
    addNoteText();
});

document.getElementById('addArrowButton').addEventListener("click", function(e) {
    addArrow();
});

document.getElementById('editAnnotationButton').addEventListener("click", function(e) {
    buildAnnotationList();
});

document.getElementById('cancelAddNoteButton').addEventListener("click", function(e) {
    handleDonePress();
});

document.getElementById('manualLineButton').addEventListener("click", function(e) {
    addLine();
});

document.getElementById('addFitDoneButton').addEventListener("click", function(e) {
    hideFitList(0);
});

document.getElementById('editDoneButton').addEventListener("click", function(e) {
    handleEditing();
});

document.getElementById('annotationList').addEventListener("click", function(e) {
    var hiliteWhich = e.target.id;
    var idx = Number(hiliteWhich.replace(/\D/g, ''));
    if (annotation.color[idx] !== undefined) {      // iPad edition: a tap never sends mouseout, so un-highlight here
	annotation.color[idx] = "black";
    }
    hiLitePoints = -1;
    modifyOneNote(idx);
});

document.getElementById('annotationList').addEventListener("mouseover", function(e) {
    var hiliteWhich = e.target.id;
    var idx = Number(hiliteWhich.replace(/\D/g, ''));
    hiLitePoints = idx;
    annotation.color[idx] = "red";
    computeAll();
});
document.getElementById('annotationList').addEventListener("mouseout", function(e) {
    var hiliteWhich = e.target.id;
    var idx = Number(hiliteWhich.replace(/\D/g, ''));
    annotation.color[idx] = "black";
    hiLitePoints = -1;
    computeAll();
});

document.getElementById('fitList').addEventListener("click", function(e) {
    var hiliteWhich = e.target.id;
    var idx = Number(hiliteWhich.replace(/\D/g, ''));
    hiLitePoints = -1;                              // iPad edition: a tap never sends mouseout, so un-highlight here
    hideFitList(1);
    addFitText(idx);
});

document.getElementById('fitList').addEventListener("mouseover", function(e) {
    var hiliteWhich = e.target.id;
    hiLitePoints = Number(hiliteWhich.replace(/\D/g, ''));
    computeAll();
});

document.getElementById('fitList').addEventListener("mouseout", function(e) {
    hiLitePoints = -1;
    computeAll();
});

// iPad edition: the graph now listens for pointer events, which cover mouse, finger, and Apple Pencil.
//   Mouse:  unchanged -- move to position, click to drop.
//   Touch/pen:  there is no hover, so put a finger down and drag to position, then lift to drop.  An arrow or IB line
//   takes two touches (lift once at the start point, then drag to the end point and lift again).  The tangent finder
//   follows your finger as you drag along the curve.
function canvasIsBusy() {
    return tangentChecked || haveText || addingArrow || addingLine;
}

if (window.PointerEvent) {
    canvas1.addEventListener("pointermove", function(e) {
	getMouse(e);
    });
    canvas1.addEventListener("pointerdown", function(e) {
	if (e.pointerType == 'mouse') {
	    getMouse(e);
	    dropText(e);
	} else {
	    if (canvasIsBusy()) {
		try { canvas1.setPointerCapture(e.pointerId); } catch(err) {}
	    }
	    getMouse(e);
	}
    });
    canvas1.addEventListener("pointerup", function(e) {
	if (e.pointerType != 'mouse') {
	    getMouse(e);
	    dropText(e);
	}
    });
    // While the graph is being worked on, keep a finger drag from scrolling or zooming the page
    // (and suppress the emulated mouse events Safari sends after a touch, which would drop things twice).
    canvas1.addEventListener("touchstart", function(e) {
	if (canvasIsBusy()) {
	    e.preventDefault();
	}
    }, {passive: false});
    canvas1.addEventListener("touchmove", function(e) {
	if (canvasIsBusy()) {
	    e.preventDefault();
	}
    }, {passive: false});
} else {
    canvas1.addEventListener("mousemove", function(e) {
	getMouse(e);
    });
    canvas1.addEventListener("mousedown", function(e) {
	dropText(e);
    });
}

// Section: Compute All ********************************************************************************************************
// The Main Event!!    This function is called pretty much every time the user does anything.  It does the plotting, the
//                     fitting, handles the HTML inputs and controls, and anything else that is outside the data array.
//
(window.computeAll = function() {
    // this function is called every time focus is moved from a cell or a control is updated on the web page
    var xp, yp, xbar, ybar;
    var slope, intcpt;
    var curves = ["A","B","C","D","E"]
    var npts = [0,0,0,0,0]
    var xdata = [];
    var ydata = [];
    var xerrs = [];
    var yerrs = [];
    var makeGraph = false;
    var axesLabeled = checkForLabels();
    npts[0] = countPoints('A');
    npts[1] = countPoints('B');
    npts[2] = countPoints('C');
    npts[3] = countPoints('D');
    npts[4] = countPoints('E');

    // get the data
    for (let jj = 0; jj < nSheets; jj++) {
	if (npts[jj] >= 1) {	    // we get data for curves that have at least 1 data point
	    var data = getData(curves[jj]);                   // call to get the data from the spreadsheet
	    xdata[jj] = data.x;                               // separate it into arrays for x data and y data
	    ydata[jj] = data.y;
	    xerrs[jj] = data.xe;                              // and x and y error bars
	    yerrs[jj] = data.ye;
	    if (!showErrorBars) {                             // iPad edition: error bars hidden unless turned on in Preferences
		xerrs[jj] = xerrs[jj].map(function() { return 0; });
		yerrs[jj] = yerrs[jj].map(function() { return 0; });
	    }
	    if (dataLinearized) {
		for (let k = 0; k < npts[jj]; k++) {
		    switch (xform) {
		    case 'sqr':
			xerrs[jj][k] = xerrs[jj][k] * 2 * xdata[jj][k];
			xdata[jj][k] = Math.pow(xdata[jj][k], 2);
			break;
		    case 'sqrRoot':
			xdata[jj][k] = Math.pow(xdata[jj][k], 0.5);
			xerrs[jj][k] = xerrs[jj][k] / 2 / xdata[jj][k];
			break;
		    case 'inv':
			xdata[jj][k] = Math.pow(xdata[jj][k], -1);
			xerrs[jj][k] = xerrs[jj][k] * xdata[jj][k] * xdata[jj][k];
			break;
		    case 'invSqr':
			xerrs[jj][k] = xerrs[jj][k] * 2 * Math.pow(xdata[jj][k], -3);
			xdata[jj][k] = Math.pow(xdata[jj][k], -2);
			break;
		    case 'invSqrRoot':
			xerrs[jj][k] = xerrs[jj][k] * Math.pow(xdata[jj][k], -1.5) / 2;
			xdata[jj][k] = Math.pow(xdata[jj][k], -0.5);
			break;
		    default:
			// do nothing
		    }
		}
	    }
	}
    }
    for (let jj = 0; jj < nSheets; jj++) {  // now we check for at least one curve with 2 points and axis labelling
	if (npts[jj] >= 2 && axesLabeled) { 
	    makeGraph = true;
	    madeGraph = false;
	}
    }
    if (makeGraph) {
	ctx.clearRect(0, 0, canvas1.width, canvas1.height);
	if (downloading) {
	    ctx.fillStyle = "white";
	} else {
	    ctx.fillStyle = backgroundColor;
	}
	ctx.strokeStyle = "black";
	ctx.fillRect(0, 0, 800, 610);
	var xmax = findMax(xdata, xerrs, npts, scaleWithBars);           // find the max and min of x and y data across all 5 curves
	var xmin = findMin(xdata, xerrs, npts, scaleWithBars);
	var ymax = findMax(ydata, yerrs, npts, scaleWithBars);
	var ymin = findMin(ydata, yerrs, npts, scaleWithBars);
	var xAxisLabels = getLabels(xmax, xmin);          // get the x labels (text), and the min and max labels as numbers
	var xlabels = xAxisLabels.axisLabels;
	xScale = xAxisLabels.axisScale;                   // xScale is global
	xmin = parseFloat(xlabels[0]);                    // data min and max are read back from labels and so are scaled.
	xmax = parseFloat(xlabels[xlabels.length-1]);
	var yAxisLabels = getLabels(ymax, ymin);          // repeat for y
	var ylabels = yAxisLabels.axisLabels;
	yScale = yAxisLabels.axisScale;                   // yScale is global
	ymin = parseFloat(ylabels[0]);
	ymax = parseFloat(ylabels[ylabels.length-1]);
	theBox = {xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax};
	placeTitle('t');                                  // draw the box for the plot, and place the titles and labels
	placeTitle('x');
	placeLabels(xlabels, 'x');
	if (xmin < 0) {
	    addAxis(xmin, xmax, 'y');
	}
	placeTitle('y');
	placeLabels(ylabels, 'y');
	if (ymin < 0) {
	    addAxis(ymin, ymax, 'x');
	}
	drawTheBox("black");
	madeGraph = true;
	thereIsNoGraph = false;
    }
    var noWaitingMessage = true;
    for (let jj = 0; jj < nSheets; jj++) {
	if (npts[jj] >= 2 && axesLabeled) {
	    var chosenFit = sheetFitTypes[jj];
	    if (chosenFit == 'quadratic' && npts[jj] < 3) {
		chosenFit = 'none';
		sheetFitTypes[jj] = 'none';
	    }
	    selectedFitInfo = setFitParameters(sheetFitTypes[jj], getSheetLetter(jj));
	    var ia = selectedFitInfo.ia;
	    var degFree = selectedFitInfo.DOF;
	    if (chosenFit != 'none') {                         // we will perform a fit
		var results = doTheFit(chosenFit, xdata[jj], ydata[jj], npts[jj], ia);
		lastFits[jj] = null;
		if (results.good) {
		    // iPad edition: remember this fit so Copy Slopes can evaluate the slope at every data point
		    lastFits[jj] = {fit: chosenFit, a: results.a.slice(), afin: results.afin ? results.afin.slice() : [],
				    x: xdata[jj].slice(0, npts[jj]), xScale: xScale, yScale: yScale,
				    xmin: xmin, xmax: xmax, guessing: justGuessing};
		    drawTheFit(chosenFit,xmin,xmax,ymin,ymax,results.a,results.afin,jj);
		    if (jj == getSheetNumber(activeSheet)) {
			if (tangentChecked) {
 			    drawTheTangent(chosenFit,xmin,xmax,ymin,ymax,results.a,results.afin, xdata[jj], npts[jj]);
			}
			var rmse = Math.sqrt(results.chisq/degFree);
			if (!justGuessing) {
			    reportTheFit(chosenFit,results.a,results.afin,rmse,results.covar,activeSheet);
			}
		    }
		}
	    } else {
		if (jj == getSheetNumber(activeSheet)) {
		    hideTheFit();
		}
	    }
	    for (i=0; i<npts[jj]; i++) {                      // loop to plot the data points and error bars
		if(yesPoints[jj]) {
		    xp = toPixels(xdata[jj][i]/Math.pow(10,xScale), xmin, xmax, 'x');
		    yp = toPixels(ydata[jj][i]/Math.pow(10,yScale), ymin, ymax, 'y');
		    plotPoint(xp, yp, jj);
		    xbar = toLength(xerrs[jj][i]/Math.pow(10,xScale), xmin, xmax, 'x');
		    ybar = toLength(yerrs[jj][i]/Math.pow(10,yScale), ymin, ymax, 'y');
		    plotBars(xp, yp, xbar, ybar, jj);
		}
	    }
	} else {
	    if (noWaitingMessage && !madeGraph) {
		let vStart = 50;
		let lineHeight = 25;
		let leftMargin = 225;
		let indent = 30;
		ctx.clearRect(0, 0, canvas1.width, canvas1.height);
		ctx.font = "20px sans-serif";
		ctx.fillStyle = fontColor;
		ctx.textAlign = "left";
		ctx.fillText("Nothing will be drawn until...",
			     canvas1.width/2-leftMargin, canvas1.height/2-lineHeight-vStart);
		ctx.fillText("1. There are at least 2 data points",
			     canvas1.width/2-leftMargin+indent, canvas1.height/2-vStart);
		ctx.fillText("2. Both the x and y axes have been labeled",
			     canvas1.width/2-leftMargin+indent, canvas1.height/2+lineHeight-vStart);
		ctx.fillText("(We don't insist on units, but enter them anyway!)",
			     canvas1.width/2-leftMargin, canvas1.height/2+3*lineHeight-vStart);
		drawTheBox(fontColor);
		noWaitingMessage = false;
		thereIsNoGraph = true;
	    }
	}
    }
    drawAnnotation();
    drawCrosshair();
    INPUTS.forEach(function(elm) {
	// This is the code that takes data out of session storage and populates the spreadsheet
	// Since it is inside computeAll, it get executed every time the user so much as twitches
	// But to see what is actually going on, look above for the string "getter" in a couple of places
	try {
	    elm.value = DATA[elm.id];
	}
	catch(e) {}
    });
})();  // End of window.computeAll

// Section:  Data handling and manipulation ************************************************************************************
//
function countPoints(sheet) {
    // function to count the number of data points
    var npts = 0;                            // we loop down the x value column.  If the cell is non-zero,
    for (var i=1; i<nRows+1; i++) {          // we check the y value column.  If it is non-zero too, then
    	var xid = "A" + sheet + i;                   // the sheet contains a valid data point and we increment npts
    	if (sessionStorage[xid] != "" && sessionStorage[xid] != null && typeof sessionStorage[xid] !== 'undefined') {
	    var testx = isValid(sessionStorage[xid]);
	    if (testx) {
    		var yid = "B" + sheet + i; 
    		if (sessionStorage[yid] != "" && sessionStorage[xid] != null && typeof sessionStorage[yid] !== 'undefined') {
		    var testy = isValid(sessionStorage[yid]);
		    if (testy) {
    			if (!document.getElementById("E" + sheet + i.toString()).checked) {  // point not "skipped"
    			    npts = npts +1;
    			}
    		    }
    		}
	    }
	}
    }
    return npts;
}

function getData(curve) {
    // this function reads all of the data in the HTML spreadsheet and returns it in some arrays
    var darray = [];  // All the data is eventually returned in this as an array of arrays
    var xarray = [];
    var yarray = [];
    var xerrs = [];
    var yerrs = [];
    var test;
    var xid, yid, exid, eyid;
    for (var i=1; i<nRows+1; i++) {
	if (!document.getElementById("E" + curve + i.toString()).checked) {  // only read data we are not skipping
	    xid = "A" + curve + i;
	    xid = xid.toLowerCase();
	    if (sessionStorage[xid] != "") {
		yid = "B" + curve + i; 
		if (sessionStorage[yid] != "") {
		    test = parseFloat(DATA[xid]);
		    xarray.push(isNaN(test) ? 0 : test);
		    test = parseFloat(DATA[yid]);
		    yarray.push(isNaN(test) ? 0 : test);
		    exid = "C" + curve + i;
		    test = parseFloat(DATA[exid]);
		    xerrs.push(isNaN(test) ? 0 : test);
		    eyid = "D" + curve + i;
		    test = parseFloat(DATA[eyid]);
		    yerrs.push(isNaN(test) ? 0 : test);
		}
	    }
	}
    }
    var dataObject = {x: xarray, y: yarray, xe: xerrs, ye: yerrs};
    return dataObject;
}

function showLinearize() {
    if (dataLinearized) {
	document.getElementById("undoLinearizeButton").style.display = "block";
    } else {
	document.getElementById("undoLinearizeButton").style.display = "none";
	transformationString = "";
	xform = 'none';
    }
    document.getElementById("transformation").value = transformationString;
    document.getElementById("linearizeModal").style.display = "block";
}

function closeLinearize() {
    if (!dataLinearized) {
	transformationString = document.getElementById("transformation").value;
	xform = 'none';
	var idx = transformationString.search(/1\/x\^2/);
	if (idx >= 0) {
	    xform = 'invSqr';
	} else {
	    idx = transformationString.search(/1\/x/);
	    if (idx >= 0) {
		xform = 'inv';
	    } else {
		idx = transformationString.search(/1\/sqrt\(x\)/);
		if (idx >= 0) {
		    xform = 'invSqrRoot';
		} else {
		    idx = transformationString.search(/sqrt\(x\)/);
		    if (idx >= 0) {
			xform = 'sqrRoot';
		    } else {
			idx = transformationString.search(/x\^2/);
			if (idx >= 0) {
			    xform = 'sqr';
			}
		    }
		}
	    }
	}
	if (xform != 'none') {
	    dataLinearized = true;
	}
    }
    document.getElementById("linearizeModal").style.display = "none";
    computeAll();
}

function undoLinearize() {
    dataLinearized = false;
    document.getElementById("undoLinearizeButton").style.display = "none";
    transformationString = "";
    xform = 'none';
    document.getElementById("xlabel").value = savedXTitle;
    document.getElementById("xunit").value = savedXUnit;
    labelsLinearized = false;
    document.getElementById("linearizeModal").style.display = "none";
    computeAll();
}

function tradeData(swapLabelsToo) {
    // swap the x and y data columns, and optionally the x-axis and y-axis graph labels
    // works only on the active data set, which is set by the global variable activeSheet
    var xid, yid, exid, eyid, temp;
    for (var i=1; i<nRows+1; i++) {
	xid = "A" + activeSheet + i;
	if (sessionStorage[xid] != "") {
	    yid = "B" + activeSheet + i; 
	    if (sessionStorage[yid] != "") {
		temp = sessionStorage[xid];
		sessionStorage[xid] = sessionStorage[yid];
		sessionStorage[yid] = temp;
		exid = "C" + activeSheet + i;
		eyid = "D" + activeSheet + i;
		temp = sessionStorage[exid];
		sessionStorage[exid] = sessionStorage[eyid];
		sessionStorage[eyid] = temp;
	    }
	}
    }
    if (swapLabelsToo) {
	var temp1 = document.getElementById("xlabel").value;
	var temp2 = document.getElementById("xunit").value;
	document.getElementById("xlabel").value = document.getElementById("ylabel").value;
	document.getElementById("xunit").value = document.getElementById("yunit").value;
	document.getElementById("ylabel").value = temp1;
	document.getElementById("yunit").value = temp2;
    }
    computeAll();
}

function isValid(test) {
    // test if user input in spreadsheet cell can be interpreted as a number
    var str = test.toString();
    var idx = str.search(/[^0-9eE\+\.\r\n\*\^/=-]/); // only allow what is defined in this regexp
    if (idx >= 0) {
	return false;
    } else {
	idx = str.search(/=/); // search for equals sign and only permit it as first character
	if (idx >= 0) {
	    if (idx != 0) {
		return false;
	    } else {
		idx = str.substring(1,str.length).search(/=/);
		if (idx >= 0) {
		    return false;
		}
	    }
	}
	idx = str.search(/[\+\*\^/-]/) // protect against more than one decimal point, but allow if there is math
	if (idx < 0) {
	    idx = str.search(/\./);
	    var len = str.length;
	    if (idx >= 0) {
		str = str.substring(idx+1, len);
		idx = str.search(/\./);
		if (idx >= 0) {
		    return false;
		}
	    }
	}
    }
    return true;
}

function nParse(inString) {
    // strips leading = sign (if present) and replaces ^ with **.
    // Result is a number or valid math expression that can be evaluated to a number, or returns an empty string if the process fails
    var frontHalf = "";
    var backHalf = inString;
    var done = false;
    var didOne = false;
    if (backHalf.substring(0,1) == "=") {
	backHalf = backHalf.substring(1,backHalf.length)
    }
    while (!done) {
    	var len = backHalf.length;
    	var idx = backHalf.search(/\^/);                          // search for "^" in string
    	if (idx >= 0) {
    	    frontHalf = frontHalf + backHalf.substring(0, idx);  // frontHalf is everything before ^
	    frontHalf = frontHalf + "**";
    	    backHalf = backHalf.substring(idx+1, len);           // backHalf is everything after the ^
	    didOne = true;
	} else {
	    frontHalf = frontHalf + backHalf;
	    done = true;
	}
    }
    var tmp = eval(frontHalf);
    if (typeof tmp == 'undefined') {
	return "";
    } else {
	return tmp;
    }
}

function clearData(sheetLetter, recalling) {
    // Erases the data from the spreadsheet.  Also erases the graph if the cleared sheet was the only one with data.
    INPUTS.forEach(function(elm) {
	if (elm.id.charAt(1) == sheetLetter) {
	    sessionStorage[elm.id] = "";
	    elm.value = "";
	}
    });
    for (let jj = 1; jj < nRows + 1; jj++) {
	document.getElementById("E" + sheetLetter + jj.toString()).checked = false;
    }
    if (!recalling) {
	var testpoints =  countPoints('A') + countPoints('B') + countPoints('C') + countPoints('D') + countPoints('E');
	if (testpoints == 0) {
	    clearAllData();
	}
	madeGraph=false;
	changeModel('none');
	computeAll();
    }
}

function clearAllData() {
    // Erases the data from all 5 sheets and clears all the fitting and labeling info
    INPUTS.forEach(function(elm) {
	sessionStorage[elm.id] = "";
	elm.value = "";
    });
    sheetFitTypes = ['none', 'none', 'none', 'none', 'none'];
    changeModel('none');
    var curves = ['A', 'B', 'C', 'D', 'E'];
    for (var kk = 0; kk < nSheets; kk++) {
    	for (let jj = 1; jj < nRows + 1; jj++) {
	    document.getElementById("E" + curves[kk] + jj.toString()).checked = false;
	}
    }
    ctx.clearRect(0, 0, canvas1.width, canvas1.height);
    const labels = document.querySelectorAll(".labelClass");
    labels.forEach(element => {
	element.value = "";
    });
    hideTheFit();
    clearTangentData();
    removeAnnotation();
    madeGraph = false;
    thereIsNoGraph = true;
    computeAll();
}

function clearSaveName() {
    document.getElementById("saveName").value = "";
}
    
//Section:  Scaling ************************************************************************************************************
// Determine the plot limits and axis numbering and also convert between screen units and data units
//
function findMax(array2D, errBars, npts, includeBars) {
    // find the maximum value that needs to appear within the plot.  "includeBars" option prevents clipping of error bars.
    var maxes = [];
    if (includeBars) {
	var temp = [];
	for (let jj = 0; jj < nSheets; jj++) {
	    for (let i = 0; i < npts[jj]; i++) {
		temp[i] = array2D[jj][i] + errBars[jj][i];
	    }
	    maxes[jj] = Math.max.apply(null, temp);
	}
    } else {
	for (let jj = 0; jj < nSheets; jj++) {
	maxes[jj] = Math.max.apply(null, array2D[jj]);
	}
    }
    var max = Math.max.apply(null, maxes);
    return max;
}

function findMin(array2D, errBars, npts, includeBars) {
    // find the minimum value that needs to appear within the plot.  "includeBars" option prevents clipping of error bars.
    var mins = [];
    var temp = [];
    if (includeBars) {
	for (let jj = 0; jj < nSheets; jj++) {
	    for (let i = 0; i < npts[jj]; i++) {
		temp[i] = array2D[jj][i] - errBars[jj][i];
	    }
	    mins[jj] = Math.min.apply(null, temp);
	}
    } else {
	for (let jj = 0; jj < nSheets; jj++) {
	    for (let i = 0; i < npts[jj]; i++) {
		temp[i] = array2D[jj][i];
	    }
	    mins[jj] = Math.min.apply(null, temp);
	}
    }
    var min = Math.min.apply(null, mins);
    return min;
}

function getLabels(dmax,dmin) {
    // this is the auto-scaling function!  It determines what the axis minimum and maximum should be
    // then it does two more things:  (1) determines what the specfic axis labels should be and (2) creates the actual labeling text
    // Unless there is negative data or a settings override, the lower left corner of the plot will be zero, zero.
    var mflag;
    var dminActual = dmin;
    if (dmin >= 0) {
	if (requireOrigin) {
	    dmin = 0;
	}
	mflag = 1;                   // mflag is 1 if data lie completely in the positive half of the plane
	if (dmax == 0) {             // protect against dmin and dmax both equal to zero
	    dmax = 1
	}
    } else {
	mflag = 0;
	if (dmax < 0) {
	    dmax = 0;
	}
    }
    var span = dmax - dmin;                         // calculate raw data span
    var lscale = Math.floor(log10(span) + 1);       // find the power of 10 corresponding to span
    var rspan = Math.pow(10, log10(span) - lscale); // rspan is > 0 and <= 1 (we call this the reduced span)
    var spars = findScale(rspan,lscale);            // find label delta--spars[0]--and # of divisions--spars[1]--(1st guess)
    var p = Math.floor(dmin/spars[0]);              // divide the minimum value by the delta
    var axmin = p * spars[0];                       // multiply back to get a "nice" minimum value
     
    var check = spars[0] - Math.pow(10, Math.round(log10(spars[0])));  // handle the special case of a 3/6 degeneracy
    if (check == 0 && spars[1] == 3) {                                 // if we have 3 divisions and a delta of 1 or .1 or .01...
	spars[0] = spars[0]/2;                                         // it will be prettier with 6 divisions and
	spars[1] = 6;                                                  // a delta of .5 or .05 or .005...
    }
    var ldig = -1 * Math.floor(log10(spars[0]));          // find the number of digits for the axis labels
    if (ldig < 0) {                                       // for deltas of 1 and larger, labels will be integers
    	ldig = 0
    }
    var ndiv = spars[1];
    if (mflag == 0) {                           
	if (axmin >= dmin) {                                 // check if the data fall on or outside the lower axis limit
    	    ndiv = ndiv + 1;                                 // if so, add a division...
    	    axmin = axmin - spars[0];                        // ...and adjust the axis minimum
	}
    } else {                                     // added to prevent data point on x=0 or y=0 axis 12/4/25
	if (axmin == dminActual) {
    	    ndiv = ndiv + 1;                                 // if so, add a division...
    	    axmin = axmin - spars[0];                        // ...and adjust the axis minimum
	}
    }
    var done = false;
    var axmax = axmin + spars[0] * (ndiv);
    var jj = 0;
    while (!done) {
	jj = jj + 1;
	if ((axmax <= dmax) || (Math.abs(axmax-dmax) <= 1e-12)) { // check if the data fall on or outside the upper axis limit
	    if (axmax != 0 || dmax-axmax < spars[0]) {
    		ndiv = ndiv + 1;                                  // if so, add a division.  Don't need to adjust axmax.
	    }
	}
    	var axmax = axmin + spars[0] * (ndiv);
	if (axmax >= dmax) {
	    done = true;
	}
	if (jj >= 10) {
	    done = true;
	}
    }
    // handle scaling for large and small numbers
    // for example, if an axis label is 0.00001, it will be changed to 0.01 and the axis scale will be set to -3.
    //     The axis scale is used to modify the axis title so it reads e.g., "Velocity (x10^-3 m/s)", only prettier
    //
    if (axmax != 0) {                                        // Don't take the log of zero!
	var axscale = Math.floor(log10(Math.abs(axmax)));    // find the order of magnitude of the axis for possible scaling
    } else {
	var axscale = Math.floor(log10(Math.abs(axmin)));
    }
    if (Math.abs(axscale) <= scaleThreshold) {           // We don't scale unless we need at least a factor of scaleThreshold
	axscale = 0;
    } else {                                             // use only multiples of 1000 for scalings
	if (axscale > 0) {
	    axscale = 3*Math.floor(axscale/3);           // Handle large numbers...
	} else {
	    axscale = 3*Math.ceil(axscale/3);            // ...differently from small numbers
	}
    }
    if (ldig > 0) {
	ldig = ldig - Math.abs(axscale);                 // if scaling, we need fewer digits on the axis numbers.
	if (ldig < 0) {
	    ldig = 0;
	}
    }
    var axlabs = [];                       // array for the labels
    var axnum;
    for (i=0; i<ndiv+1; i++) {                // loop over the number of labels
	axnum = axmin + i*spars[0];           // calculate the label (not yet scaled)
	axnum = axnum/Math.pow(10, axscale);  // divide axis labels by scale factor
	axlabs.push(axnum.toFixed(ldig));     // push it onto the array as a string
    }
    return {axisLabels: axlabs, axisScale: axscale};  // return the labels
    
    function findScale(rs,ls) {
	// function to find the delta and the number of divisions from the reduced span
	// rs is the reduced span, ls is the power of 10 to convert reduced span back to a span
	var mgspan = 2;
	var gspan, mdx, ndiv, sdx;
	for (i=3; i<8; i++) {             // loop over the number of divisions (only 3, 4, 5, 6, or 7 allowed)
	    sdx = findSdx(rs/i);          // find the smallest allowed delta for this number of divisions
	    gspan = sdx * i;              // find the span for this sdx (division size) and # of divisions
	    if (gspan < mgspan) {         // see if this span is the smallest we've seen
		mgspan = gspan;           // if so, we want that one
		mdx = sdx;
		ndiv = i;
	    }
	}
	var pars = [];                    // array to hold the results (pars = "parameters")
	pars.push(mdx*Math.pow(10,ls));   // this is the delta, scaled up to the original data
	pars.push(ndiv);                  // this is the number of divisions
	return pars;
    }

    function findSdx(rdx) {
	// function to find the smallest legal delta
	// We take the nominal division size (rscale/i) and round up to the closest "nice" value and return that
	var dx;
	if (rdx > .2) {
	    dx = .5
	} else if (rdx > .1) {
	    dx = .2
	} else if (rdx > .05) {
	    dx = .1
	} else if (rdx > .02) {
	    dx = .05
	} else if (rdx > .01) {
	    dx = .02
	} else {
	    dx = .01
	}
	return dx;
    }
}

function checkForLabels() {
    // Check that axis titles have been provided by the user so that we can allow plotting
    var xText = document.getElementById("xlabel").value;
    var yText = document.getElementById("ylabel").value;
    var xlen = xText.trim().length;
    var ylen = yText.trim().length;
    if (xlen>0 && ylen>0) {
	return true;
    } else {
	return false;
    }
}

function toPixels(value, min, max, axis) {
    // converts data units to pixels
    if (axis == 'x') {
	var pixels = (value-max)*plotParams.xSize/(max-min) + plotParams.xWidth;
    } else {
	var pixels = (value-min)*plotParams.ySize/(min-max) + plotParams.yWidth;
    }
    return pixels;
}

function toLength(len, min, max, axis) {
    // converts pixels to data units
    if (axis == 'x') {
	var length = len * plotParams.xSize / (max-min);
    } else {	
	var length = len * plotParams.ySize / (max-min);
    }
	return length;
}

function toValue(pixel, min, max, axis) {
    // converts a pixel position to a graph position in data units
    if (axis == 'x') {
	var value = (pixel - plotParams.xWidth)*(max - min)/plotParams.xSize + max;
    } else {
	var value = (plotParams.yBord - pixel)*(max - min)/plotParams.ySize + max;
    }
    return value;
}
	
// Section: Drawing  ***********************************************************************************************************
// Drawing of the plot axes, data points, and text elements.
//
function drawTheBox(boxColor) {
    // Draws the axis box
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = boxColor;
    ctx.rect(plotParams.xBord, plotParams.yBord, plotParams.xSize, plotParams.ySize);
    ctx.stroke();
}

function addAxis(min, max, axis) {
    // If axis = x, draws a y=0 line on the graph, and vice versa
    if (axis == 'x') {
	var position = toPixels(0, min, max, 'y');
	drawLineSegment(plotParams.xWidth, position, plotParams.xBord, position, axisColor);
    } else {
	var position = toPixels(0, min, max, 'x');
	drawLineSegment(position, plotParams.yWidth, position, plotParams.yBord, axisColor);
    }	
}

function placeTitle(axis) {
    // pre-processing for the axis title.  Inserts Greek, symbols, and axis scale.  Calls drawTitle to do the actual drawing,
    if (axis == "x") {
 	var ltext = document.getElementById("xlabel").value;
 	var utext = document.getElementById("xunit").value;
	if (!dataLinearized) {
	    savedXTitle = ltext;
	    savedXUnit = utext;
	} else {
	    if (!labelsLinearized) {
		switch (xform) {
		case 'sqr':
		    ltext = '(' + ltext + ')^2';
		    utext = '(' + utext + ')^2';
		    break;
		case 'sqrRoot':
		    ltext = '\u221a(' + ltext + ')';
		    utext = '\u221a(' + utext + ')';
		    break;
		case 'inv':
		    ltext = '1/(' + ltext + ')';
		    utext = '1/(' + utext + ')';
		    break;
		case 'invSqr':
		    ltext = '1/(' + ltext + ')^2';
		    utext = '1/(' + utext + ')^2';
		    break;
		case 'invSqrRoot':
		    ltext = '1/\u221a(' + ltext + ')';
		    utext = '1/\u221a(' + utext + ')';
		    break;
		default:
		    // do nothing
		}
 		document.getElementById("xlabel").value = ltext;
 		document.getElementById("xunit").value = utext;
		labelsLinearized = true;
	    }
	}
 	var aScale = xScale;       // xScale is global
    } else if (axis == "y") {
 	var ltext = document.getElementById("ylabel").value;
 	var utext = document.getElementById("yunit").value;
 	var aScale = yScale;       // yScale is global
    } else if (axis == 't') {
 	var ltext = document.getElementById("plotTitle").value;
	var aScale = 0;
	var utext = "";
 	if (ltext == "") {
 	    return;
 	}
    } else {
 	aScale = 0;
    }
    
    var parsedLabel = parseText(ltext);
    if (aScale != 0) {
 	var ptext = "10^" + aScale.toString();
 	if (utext != "") {
	    utext = "   (" + ptext + " " + utext + ")";
 	} else {
	    utext = "   (\u00D7" + ptext + ")"
 	}
    } else {
 	if (utext != "") {
	    utext = "   (" + utext + ")";
 	}
    }
    var parsedUnit = parseText(utext);
    var parsedText = parsedLabel.concat(parsedUnit);
    drawTitle(axis, parsedText);
}

function drawTitle(axis, parsedText) {
    // called by placeTitle.  Actually puts the processed title text on the graph.
    if (axis == "x") {
	var xPosition = plotParams.xFull/2;
	var yPosition = plotParams.yFull-plotParams.xLO;
    } else if (axis == "y") {
	var xPosition = plotParams.yFull/2;
	var yPosition = plotParams.yLO;
	ctx.save();
	ctx.translate(0, plotParams.yFull);
	ctx.rotate(-Math.PI/2);
    } else { // axis = 't'
	var xPosition = plotParams.xFull/2+plotParams.tCO;
	var yPosition = plotParams.yWidth-plotParams.ySize-plotParams.pTO;
    }
    placeParsedText(parsedText, xPosition, yPosition, 'center', 'black', 'plot');
    if (axis == "y") {
	ctx.restore();
    }
}

function placeLabels(labels, axis) {
    ctx.font = plotParams.subFont;
    ctx.fillStyle = inkColor;
    var nLabs = labels.length;
    if (axis == 'x') {
	var lDelta = plotParams.xSize/(nLabs-1);
    } else if (axis == 'y') {
	var lDelta = plotParams.ySize/(nLabs-1);
	ctx.save();
	ctx.translate(0, plotParams.yFull);
	ctx.rotate(-Math.PI/2);
    } else {
	return;
    }
    for (i=0; i<nLabs; i++) {
	if (axis == 'x') {
	    var xPos = plotParams.xBord+i*lDelta;
	    var yPos = plotParams.yWidth+plotParams.yLO;
	} else {
	    var xPos = plotParams.xBord-10+i*lDelta;
	    var yPos = plotParams.xBord-10;
	}
	if (i == 0) {
	    ctx.textAlign = "left";
	} else {
	    ctx.textAlign = "center";
	}
	ctx.fillText(labels[i], xPos, yPos);
    }
    if (axis == 'y') {
	ctx.restore();
    }
    var delta = Math.abs(Number(labels[1]) - Number(labels[0]));
    drawTicks(nLabs, delta, axis);
}

function drawTicks(nTicks, delta, axis) {
    // draws tick marks along all four sides of graph box
    // optional adds a grid aligned with the major tick marks
    var tdelta = (axis == 'x') ? plotParams.xSize/(nTicks-1) : plotParams.ySize/(nTicks-1);
    var t2delta = tdelta/5;
    var nSubTicks = 5;
    if (Math.abs(Math.round(log10(delta/2)) - log10(delta/2)) < .0000001) { // if delta is divisible by 2, use 4 subticks per division
	t2delta = tdelta/4;
	nSubTicks = 4;
    }

    for (i=0; i<nTicks-1; i++) {
	var tpos = (axis == 'x') ? plotParams.xBord+i*tdelta : plotParams.yBord+i*tdelta;
	if (axis == 'x') {
	    if (yesGrid) {
		ctx.setLineDash([15, 15]);
		drawLineSegment(tpos, plotParams.yWidth, tpos, plotParams.yBord, gridColor, 1);
	    }
	    ctx.setLineDash([]);
	    drawLineSegment(tpos, plotParams.yWidth, tpos, plotParams.yWidth-10, inkColor, 2);
	    drawLineSegment(tpos, plotParams.yBord, tpos, plotParams.yBord+10, inkColor, 2);
	
	    for (j=1; j<nSubTicks; j++) {
		var t2pos = tpos + j*t2delta;
		drawLineSegment(t2pos, plotParams.yWidth, t2pos, plotParams.yWidth-5, inkColor, 2);
		drawLineSegment(t2pos, plotParams.yBord, t2pos, plotParams.yBord+5, inkColor, 2);
	    }
	} else {
	    if (yesGrid) {
		ctx.setLineDash([15, 15]);
		drawLineSegment(plotParams.xBord,tpos, plotParams.xWidth, tpos, gridColor, 1);
	    }
	    ctx.lineWidth = 2;
	    ctx.setLineDash([]);
	    drawLineSegment(plotParams.xBord, tpos, plotParams.xBord+10, tpos, inkColor, 2);
	    drawLineSegment(plotParams.xWidth, tpos, plotParams.xWidth-10, tpos, inkColor, 2);
	
	    for (j=1; j<nSubTicks; j++) {
		var t2pos = tpos + j*t2delta;
		drawLineSegment(plotParams.xBord, t2pos, plotParams.xBord+5, t2pos, inkColor, 2);
		drawLineSegment(plotParams.xWidth, t2pos, plotParams.xWidth-5, t2pos, inkColor, 2);
	    }
	}    
    }
}

function parseText(inString) {
    // parses an input text string into an array of objects 
    // each object contains a substring and two booleans (true if substring is super- or sub-script)
    // also replaces TeX codes with Greek and other special characters
    var unicodeSupers = /[-\+0-9]/;
    var parsedArray = [];
    var frontHalf = "";
    var backHalf = inString;
    var done = false;
    var foundOne = false;
    while (!done) {
	var len = backHalf.length;
	var idx = backHalf.search(/_{|\^/);
	if (idx >= 0) {
	    // found either _{ or ^ indicating a subscript or superscript
	    foundOne = true;
	    if (backHalf[idx] == '_') {
		// it is a subscript (or trying to be)
		var idx2 = backHalf.search(/}/);
		if (idx2 > idx) {
		    // closing bracket is present, so we process as a subscript
		    if (idx > 0) {
			// there is text in the string before the subscript, push it onto the output array
			frontHalf = backHalf.substring(0, idx);
			frontHalf = doGreek(frontHalf);
			parsedArray.push({str: frontHalf, sub: false, sup: false});
		    }
		    frontHalf = backHalf.substring(idx+2, idx2);
		    frontHalf = doGreek(frontHalf);
		    parsedArray.push({str: frontHalf, sub: true, sup: false});
		    backHalf = backHalf.substring(idx2+1, backHalf.length);
		} else {
		    // failed to find a } to close subscript, push the _{ to output array as plain text
		    frontHalf = backHalf.substring(0, idx+2);
		    backHalf = backHalf.substring(idx+2, backHalf.length);
		    frontHalf = doGreek(frontHalf);
		    parsedArray.push({str: frontHalf, sub: false, sup: false});
		}
	    } else {
		// first char wasn't underscore, so we are processing a supperscript
		if (backHalf[idx+1] == '{') {
		    // it's a bracketed superscript, processing is identical to subscript
		    var idx2 = backHalf.search(/}/);
		    if (idx2 > idx) {
		    // closing bracket is present, so we process as a superscript
			foundOne = true;
			if (idx > 0) {
			    frontHalf = backHalf.substring(0, idx);
			    frontHalf = doGreek(frontHalf);
			    parsedArray.push({str: frontHalf, sub: false, sup: false});
			}
			frontHalf = backHalf.substring(idx+2, idx2);
			frontHalf = doGreek(frontHalf);
			parsedArray.push({str: frontHalf, sub: false, sup: true});
			backHalf = backHalf.substring(idx2+1, backHalf.length);
		    } else {
			// failed to find a } to close superscript, push the _{ to output array as plain text
			frontHalf = backHalf.substring(0, idx+2);
			backHalf = backHalf.substring(idx+2, backHalf.length);
			frontHalf = doGreek(frontHalf);
			parsedArray.push({str: frontHalf, sub: false, sup: false});
		    }
		} else {
		    // char after ^ wasn't {, so this is a unicode style superscript
		    if (idx > 0) {
			// there is text in the string before the superscript, push it onto the output array
			frontHalf = backHalf.substring(0, idx);
			frontHalf = doGreek(frontHalf);
			parsedArray.push({str: frontHalf, sub: false, sup: false});
		    }
		    backHalf = backHalf.substring(idx+1, backHalf.length); // discard the ^
		    var finished = false;
		    var didOne = false;
		    frontHalf = "";
		    while (!finished) {
			if (unicodeSupers.test(backHalf[0])) {
			    // first char in string is allowed unicode superscript, add it to superscript string
			    frontHalf = frontHalf + ucod(backHalf[0]);
			    backHalf = backHalf.substring(1, backHalf.length); // remove this digit from string
			    didOne = true;
			} else {
			    if (!didOne) {
				// found not allowed chars after the ^, so stick the ^ back into the output
				frontHalf = '^';
			    }
			    parsedArray.push({str: frontHalf, sub: false, sup: false});
			    finished = true;
			}
		    }
		}
	    }
	} else {
	    // found neither subscript nor superscript
	    if (backHalf.length > 0) {
		backHalf = doGreek(backHalf);
		parsedArray.push({str: backHalf, sub: false, sup: false});
	    }
	    done = true;
	}
    } 
    return parsedArray;
    
    function doGreek(inString) {
	// This function scans the input string for  TeX Greek code (e.g. \Delta or \beta)
	// It returns a string with TeX code replaced by the appropriate unicode character
	// If there is nothing to do, it just returns the original string
	var frontHalf = "";
	var backHalf = inString;
	var done = false;
	while (!done) {
    	    var len = backHalf.length;
    	    var idx = backHalf.search(/\\/);                          // search for "\" 
    	    if (idx >= 0) {
    		var frontHalf = frontHalf + backHalf.substring(0, idx);  // frontHalf is everything before \
    		var backHalf = backHalf.substring(idx+1, len);           // backHalf is everything after the \
		var didit = false;
    		for (var i = 0; i < greekArray.length; i++) {
    		    var idx2 = backHalf.search(greekArray[i].greek);
    		    if (idx2 >= 0) {
    			len = backHalf.length;
    			backHalf = backHalf.substring(idx2+greekArray[i].len, len);
			if (backHalf.substring(0, 1) == " ") {                       // trim out one space after Greek 
			    backHalf = backHalf.substring(1);
			}
    			frontHalf = frontHalf + greekArray[i].code;
			didit = true;
    			break;
		    }
    		}
		if (!didit) {
		    done = true;
		}
    	    } else {
		done = true;
	    }
	}
	if (didit) {
	    frontHalf = frontHalf + backHalf;
	    return frontHalf;
	} else {
	    return inString;
	}
    }
}

function parsedTextLength(parsedArray, use) {
    if (use = 'plot') {
	var titleFont = plotParams.subFont;
	var subFont = plotParams.subFont;
    } else {
	var titleFont = plotParams.subFont;
	var subFont = plotParams.annSubFont;
    }
    var totalLength = 0;
    for (let i = 0; i < parsedArray.length; i++) {
	if (parsedArray[i].sub || parsedArray.sup) {
	    ctx.font = subFont;
	} else {
	    ctx.font = titleFont;
	}
	totalLength = totalLength + Number(ctx.measureText(parsedArray[i].str).width);
    }
    return totalLength;
}

function placeParsedText(parsedArray, xPos, yPos, justify, color, use) {
    // Places a parsed text string at the assigned location: centered, left justified, or right justified
    if (use = 'plot') {
	var titleFont = plotParams.subFont;
	var subFont = plotParams.subFont;
	var subOffset = plotParams.sO;
    } else {
	var titleFont = plotParams.subFont;
	var subFont = plotParams.annSubFont;
	var subOffset = plotParams.aSO;
    }
    var totalLength = parsedTextLength(parsedArray, use);;
    if (justify == 'center') {
	var xStart = xPos - totalLength/2;
    } else if (justify == 'right') {
	var xStart = xPos - totalLength;
    } else {
	var xStart = xPos;
    }
    for (let i = 0; i < parsedArray.length; i++) {
	if (parsedArray[i].sub) {
	    var useFont = subFont
	    var useYPos = yPos + subOffset;
	} else if (parsedArray[i].sup) {
	    var useFont = subFont;
	    var useYPos = yPos - subOffset;
	} else {
	    var useFont = titleFont;
	    var useYPos = yPos;
	}
	ctx.font = useFont;
	var elementLength = Number(ctx.measureText(parsedArray[i].str).width);
	putText(parsedArray[i].str, xStart, useYPos, useFont, 'left', color);
	xStart = xStart + elementLength;
    }
}

function putText(textString, xPos, yPos, font, justify, color) {
    // writes a text string to the canvas
    ctx.fillStyle = color;
    ctx.textAlign = justify;
    ctx.font = font;
    ctx.fillText(textString, xPos, yPos);
}

function getCurveColor(color) {
    var colorNames = ['npColor1', 'npColor2', 'npColor3', 'npColor4', 'npColor5',
		      'black', 'red', 'green', 'blue', 'magenta', 'cyan'];
    let index = colorNames.indexOf(color);
    let colorCode = curveColors[index];
    return colorCode;
}

function plotPoint(x, y, sheetNumber) {
    // draws a data point at the specified pixel position
    if (sheetNumber == hiLitePoints) {
	ctx.fillStyle = hiLiteColor;
	ctx.strokeStyle = hiLiteColor;
    } else {
    	ctx.fillStyle = inkColor;
    	ctx.strokeStyle = inkColor;
    }
    var shape = sheetSymbols[sheetNumber];
    var st = 6
    var ss = 5;
    var os = 4.5;
    var rs = 4;
    var rx = 3.5
    var sw = 3;
    var sx = 2
    var cw = 1;
    ctx.lineWidth = 1;
    ctx.lineJoin = "miter";
    ctx.beginPath();
    switch(shape) {
    case 'circle':
    default:
	ctx.arc(x, y, rs, 0, 2*Math.PI);
	ctx.fill()
	break;
     case 'square':
	ctx.rect(x-rs,y-rs,2*rs,2*rs);
	ctx.fill();
	break;
   case 'diamond':
	ctx.moveTo(x, y-ss);
	ctx.lineTo(x+ss, y);
	ctx.lineTo(x, y+ss);
	ctx.lineTo(x-ss, y);
	ctx.lineTo(x, y-ss);
	ctx.fill();
	break;
    case 'triUp':
	ctx.moveTo(x, y-ss);
	ctx.lineTo(x+ss, y+3);
	ctx.lineTo(x-ss, y+3);
	ctx.lineTo(x, y-ss);
	ctx.fill();
	break;
    case 'triDown':
	ctx.moveTo(x, y+ss);
	ctx.lineTo(x+ss, y-3);
	ctx.lineTo(x-ss, y-3);
	ctx.lineTo(x, y+ss);
	ctx.fill();
	break;
    case 'opeCircle':
	ctx.lineWidth = 2;
	ctx.arc(x, y, rs, 0, 2*Math.PI);
	ctx.stroke()
	break;
     case 'opeSquare':
	ctx.lineWidth = 2;
	ctx.rect(x-rx,y-rx,2*rx,2*rx);
	ctx.stroke()
	break;
    case 'opeDiamond':
	ctx.lineWidth = 2;
	ctx.moveTo(x, y-os);
	ctx.lineTo(x+os, y);
	ctx.lineTo(x, y+os);
	ctx.lineTo(x-os, y);
	ctx.lineTo(x, y-os);
	ctx.stroke();
	break;
    case 'opeTriUp':
	ctx.lineWidth = 2;
	ctx.moveTo(x-os, y+os-1);
	ctx.lineTo(x, y-os);
	ctx.lineTo(x+os, y+os-1);
	ctx.stroke();
	ctx.lineWidth = 1.75;
	ctx.moveTo(x-os, y+os-1);
	ctx.lineTo(x+os, y+os-1);
	ctx.stroke();
	break;
    case 'opeTriDown':
	ctx.lineWidth = 2;
	ctx.moveTo(x-ss, y-os+1);
	ctx.lineTo(x, y+ss);
	ctx.lineTo(x+ss, y-os+1);
	ctx.stroke();
	ctx.lineWidth = 1.75;
	ctx.moveTo(x-ss, y-os+1);
	ctx.lineTo(x+ss, y-os+1);
	ctx.stroke();
	break;
    case 'cross':
	ctx.rect(x-cw, y-os, 2*cw, 2*os);
	ctx.fill();
	ctx.rect(x-os, y-cw, 2*os, 2*cw);
	ctx.fill();
	break;
    case 'ex':
	ctx.moveTo(x-sw, y-ss);
	ctx.lineTo(x+ss, y+sw);
	ctx.lineTo(x+sw, y+ss);
	ctx.lineTo(x-ss, y-sw);
	ctx.lineTo(x-sw, y-ss);
	ctx.fill()
	ctx.moveTo(x+sw, y-ss);
	ctx.lineTo(x+ss, y-sw);
	ctx.lineTo(x-sw, y+ss);
	ctx.lineTo(x-ss, y+sw);
	ctx.lineTo(x+sw, y-ss);
	ctx.fill()
	break;
    case 'star':
	ctx.moveTo(x, y-st);
	ctx.lineTo(x+rs, y+st);
	ctx.lineTo(x-ss-1, y-sx);
	ctx.lineTo(x+ss+1, y-sx);
	ctx.lineTo(x-rs, y+st);
	ctx.lineTo(x, y-st);
	ctx.fill()
    }
}

function plotBars(x, y, xbar, ybar, curve) {
    // plots the x and y error bars at the specified data point
    // error bars are clipped if they are close to the axis box
    // inputs are the x,y position, and the lengths of the x error bar and the y error bar
    ctx.beginPath();
    if (curve == hiLitePoints) {
	ctx.strokeStyle = hiLiteColor;
    } else {
    	ctx.strokeStyle = inkColor;
    }
    if (x-xbar < plotParams.xBord) {
	ctx.moveTo(plotParams.xBord, y);
    } else {
	ctx.moveTo(x-xbar, y);
    }
    if (x+xbar > plotParams.xWidth) {
	ctx.lineTo(plotParams.xWidth, y);
    } else {
	ctx.lineTo(x+xbar, y);
    }
    ctx.stroke();
    ctx.beginPath();
    if (y-ybar < plotParams.yBord) {
	ctx.moveTo(x, plotParams.yBord);
    } else {
	ctx.moveTo(x, y-ybar);
    }
    if (y+ybar > plotParams.yWidth) {
	ctx.lineTo(x, plotParams.yWidth);
    } else {
	ctx.lineTo(x, y+ybar);
    }
    ctx.stroke();
}

function drawLineSegment(xStart, yStart, xEnd, yEnd, color, width) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.moveTo(xStart, yStart);
    ctx.lineTo(xEnd,yEnd);
    ctx.stroke();
}

// Section: Results ************************************************************************************************************
// Routines to post fit results to the front panel, draw the fit curve on the graph, prepare thing for downloading
// Actual posting to the front panel occurs in function makeText
//
function reportTheFit(chosenFit,a,afin,rmse,covar,curve) {

    var yesFormula = includeFormulas;
    
    var fileText = "";
    hideTheFit();
    switch(chosenFit) {
    default:
	hideTheFit();
	break;
    case 'linear':
	fileText = "Linear";
	if (yesFormula) {
	    fileText = fileText + ': y = Ax + B';
	}
	var unc = Math.sqrt(covar[1][1])*rmse;
	fileText = makeText("A", a[1], 0, unc, fileText, chosenFit, noUncertainty);
	unc = Math.sqrt(covar[2][2])*rmse;
	fileText = makeText("B", a[2], 0, unc, fileText, chosenFit, noUncertainty);
	fileText = makeText("RMSE", 1, 0, rmse, fileText, chosenFit, noUncertainty);
	break;
    case 'squareLaw':
	fileText = "Square Law";
	if (yesFormula) {
	    fileText = fileText + ': y = Ax^2';
	}
	var unc = Math.sqrt(covar[0][0])*rmse;
	fileText = makeText("A", a[0], 0, unc, fileText, chosenFit, noUncertainty);
	fileText = makeText("RMSE", 1, 0, rmse, fileText, chosenFit, noUncertainty);
	break;
    case 'quadratic':
	fileText = "Quadratic";
	if (yesFormula) {
	    fileText = fileText + ': y = Ax^2 + Bx + C';
	}
	var unc = Math.sqrt(covar[0][0])*rmse;
	fileText = makeText("A", a[0], 0, unc, fileText, chosenFit, noUncertainty);
	unc = Math.sqrt(covar[1][1])*rmse;
	fileText = makeText("B", a[1], 0, unc, fileText, chosenFit, noUncertainty);
	unc = Math.sqrt(covar[2][2])*rmse;
	fileText = makeText("C", a[2], 0, unc, fileText, chosenFit, noUncertainty);
	fileText = makeText("RMSE", 1, 0, rmse, fileText, chosenFit, noUncertainty);
	break;
    case 'inverse':
	fileText = "Inverse";
 	if (yesFormula) {
	    fileText = fileText + ': y = A/x';
	}
 	var unc = Math.sqrt(covar[3][3])*rmse;
	fileText = makeText("A", a[3], 0, unc, fileText, chosenFit, noUncertainty);
	fileText = makeText("RMSE", 1, 0, rmse, fileText, chosenFit, noUncertainty);
	break;
    case 'inverseSquare':
	fileText = "Inverse Square";
  	var unc = Math.sqrt(covar[4][4])*rmse;
	if (yesFormula) {
	    fileText = fileText + ': y = A/x^2';
	}
	fileText = makeText("A", a[4], 0, unc, fileText, chosenFit, noUncertainty);
	fileText = makeText("RMSE", 1, 0, rmse, fileText, chosenFit, noUncertainty);
	break;
    case 'proportional':
	if (yesFormula) {
	    fileText = fileText + ': y = Ax';
	}
	fileText = "Proportional";
	var unc = Math.sqrt(covar[1][1])*rmse;
	fileText = makeText("A", a[1], 0, unc, fileText, chosenFit, noUncertainty);
	fileText = makeText("RMSE", 1, 0, rmse, fileText, chosenFit, noUncertainty);
	break;
    case 'powerLaw':
	fileText = "Power Law";
	if (yesFormula) {
	    fileText = fileText + ': y = Ax^{B}';
	}
	var unc = Math.sqrt(covar[0][0])*rmse;
	fileText = makeText("A", afin[0], afin[1], unc, fileText, chosenFit, noUncertainty);
	var unc = Math.sqrt(covar[1][1])*rmse;
	fileText = makeText("B", afin[1], 0, unc, fileText, chosenFit, noUncertainty);
	fileText = makeText("RMSE", 1, 0, rmse, fileText, chosenFit, noUncertainty);
	break;
    case 'expDecay':
	fileText = "Exponential";
	if (yesFormula) {
	    fileText = fileText + ': y = Ae^{x/B} + C';
	}
	var unc = Math.sqrt(covar[2][2])*rmse;
	fileText = makeText("A", afin[2], 0, unc, fileText, chosenFit, noUncertainty);
	var unc = Math.sqrt(covar[3][3])*rmse;
	unc = unc/afin[3]/afin[3];
	fileText = makeText("B", 1/afin[3], 0, unc, fileText, chosenFit, noUncertainty);
	var unc = Math.sqrt(covar[4][4])*rmse;
	fileText = makeText("C", afin[4], 0, unc, fileText, chosenFit, noUncertainty);
	fileText = makeText("RMSE", 1, 0, rmse, fileText, chosenFit, noUncertainty);
	break;
    case 'exactProportion':
	if (yesFormula) {
	    fileText = fileText + 'y = x';
	}
	fileText = makeText("RMSE", 1, 0, rmse, fileText, chosenFit, noUncertainty);
	break;
    case 'root':
	fileText = "Square Root";
	if (yesFormula) {
	    fileText = fileText + ': y = A\u221ax';
	}
	var unc = Math.sqrt(covar[5][5])*rmse;
	fileText = makeText("A", a[5], 0, unc, fileText, chosenFit, noUncertainty);
	fileText = makeText("RMSE", 1, 0, rmse, fileText, chosenFit, noUncertainty);
	break;
    case 'noRelation':
	fileText = "No Relation";
	if (yesFormula) {
	    fileText = fileText + ': y = A';
	}
	var unc = Math.sqrt(covar[2][2])*rmse;
	fileText = makeText("A", a[2], 0, unc, fileText, chosenFit, noUncertainty);
	fileText = makeText("RMSE", 1, 0, rmse, fileText, chosenFit, noUncertainty);
	break;
    case 'inverseRoot':
	fileText = "Inverse Square Root";
	if (yesFormula) { 
	    fileText = fileText + ': y = A/\u221ax';
	}
	var unc = Math.sqrt(covar[6][6])*rmse;
	fileText = makeText("A", a[6], 0, unc, fileText, chosenFit, noUncertainty);
	fileText = makeText("RMSE", 1, 0, rmse, fileText, chosenFit, noUncertainty);
	break;
    case 'cosine':
	fileText = 'Cosine';
	if (yesFormula) {
	    fileText = fileText + ': y = A\u2009cos(Bx + C)';
	}
	var unc = Math.sqrt(covar[5][5])*rmse;
	fileText = makeText("A", afin[5], 0, unc, fileText, chosenFit, noUncertainty);
	var unc = Math.sqrt(covar[6][6])*rmse;
	fileText = makeText("B", afin[6], 0, unc, fileText, chosenFit, noUncertainty);
	var unc = Math.sqrt(covar[7][7])*rmse;
	fileText = makeText("C", afin[7], 0, unc, fileText, chosenFit, noUncertainty);
	fileText = makeText("RMSE", 1, 0, rmse, fileText, chosenFit, noUncertainty);
	break;
    case 'dampedCosine':
	fileText = 'Damped Cosine';
	if (yesFormula) {
	    fileText = fileText + ': y = Ae^{-x/D}cos(Bx + C)';
	}
	var unc = Math.sqrt(covar[8][8])*rmse;
	fileText = makeText("A", afin[8], 0, unc, fileText, chosenFit, noUncertainty);
	var unc = Math.sqrt(covar[9][9])*rmse;
	fileText = makeText("B", afin[9], 0, unc, fileText, chosenFit, noUncertainty);
	var unc = Math.sqrt(covar[10][10])*rmse;
	fileText = makeText("C", afin[10], 0, unc, fileText, chosenFit, noUncertainty);
	var unc = Math.sqrt(covar[11][11])*rmse;
	unc = unc/afin[11]/afin[11];
	fileText = makeText("D", 1/afin[11], 0, unc, fileText, chosenFit, noUncertainty);
	fileText = makeText("RMSE", 1, 0, rmse, fileText, chosenFit, noUncertainty);
	break;
    case 'relaxation':
	fileText = 'Exponential Relaxation';
	if (yesFormula) {
	    fileText = fileText + ': y = A(1 - e^{-x/B})';
	}
	var unc = Math.sqrt(covar[12][12])*rmse;
	fileText = makeText("A", afin[12], 0, unc, fileText, chosenFit, noUncertainty);
	var unc = Math.sqrt(covar[13][13])*rmse;
	unc = unc/afin[13]/afin[13];
	fileText = makeText("B", 1/afin[13], 0, unc, fileText, chosenFit, noUncertainty);
	fileText = makeText("RMSE", 1, 0, rmse, fileText, chosenFit, noUncertainty);
	break;
    case 'gaussian':
	fileText = 'Gaussian';
	if (yesFormula) {
	    fileText = fileText + ': y = Ae^{\u00bd[(x-B)/c)\u00b2]} + D';
	}
	var unc = Math.sqrt(covar[14][14])*rmse;
	fileText = makeText("A", afin[14], 0, unc, fileText, chosenFit, noUncertainty);
	var unc = Math.sqrt(covar[15][15])*rmse;
	fileText = makeText("B", afin[15], 0, unc, fileText, chosenFit, noUncertainty);
	var unc = Math.sqrt(covar[16][16])*rmse;
	unc = unc/afin[16]/afin[16];
	fileText = makeText("C", 1/afin[16], 0, unc, fileText, chosenFit, noUncertainty);
	var unc = Math.sqrt(covar[4][4])*rmse;
	fileText = makeText("D", 1/afin[4], 0, unc, fileText, chosenFit, noUncertainty);
	fileText = makeText("RMSE", 1, 0, rmse, fileText, chosenFit, noUncertainty);
	break;
    case 'log':
	fileText = 'Logarithmic';
	if (yesFormula) {
	    fileText = fileText + ': y = A + B\u2009ln(x)';
	}
	var unc = Math.sqrt(covar[2][2])*rmse;
	fileText = makeText("A", a[2], 0, unc, fileText, chosenFit, noUncertainty);
	var unc = Math.sqrt(covar[1][1])*rmse;
	fileText = makeText("B", a[1], 0, unc, fileText, chosenFit, noUncertainty);
	fileText = makeText("RMSE", 1, 0, rmse, fileText, chosenFit, noUncertainty);
	break;
    }
    fitDownload[getSheetNumber(activeSheet)] = fileText;
    return;

    function makeText(constant, num, num2, unc, fileText, chosenFit) {
	// This function first un-scales the results (if the fit was scaled by xScale or yScale not equal zero)
	//   then it formats the text that will appear on the HTML front panel
	var Cscale = deScale(constant, num, num2);

	num = num * Math.pow(10, Cscale);
	unc = unc * Math.pow(10, Cscale);

	var labelScale = Math.floor(log10(Math.abs(num)));
	if (Math.abs(labelScale) <= scaleThreshold) {
	    labelScale = 0;
	} else {
	    num = num / Math.pow(10, labelScale);
	    unc = unc / Math.pow(10, labelScale);
	}
	if (!profMode) {
	    var numString = num.toPrecision(8);
	    var uncString = unc.toPrecision(8);
	    var uncDecimals = unc - Math.floor(unc);
	    var dLength = uncDecimals.toString().length - 1;
	    if (dLength > 8) {
		uncString = Number(unc).toFixed(8);
	    }
	} else {
	    var profObj = professionalize(num, unc);
	    var numString = profObj.val;
	    var uncString = profObj.unc;
	}
	if (constant == "RMSE") {
	    if (labelScale == 0){
		var txtlab = "<i>rms Error</i> = " + uncString;
		var newFileText = fileText + "\n" + constant + " = " + uncString;
	    } else {
		var txtlab = "<i>rms Error</i> = " + uncString + " &times 10<sup>" + labelScale + "</sup>";
		var newFileText = fileText + "\n" + constant + " = " + uncString + " X 10^" + labelScale;
	    }
	    document.getElementById("rmseValue").innerHTML = txtlab;
	} else {
	    if (labelScale == 0) {
		var txtlab = "<i>" + constant + "</i> = " + numString;
		var newFileText = constant + " = " + numString;
		if (!noUncertainty) {
		    txtlab = txtlab + " &plusmn; " + uncString;
		    newFileText = newFileText + " \u00b1 " + uncString;
		}
	    } else {
		if (!noUncertainty) {
		    var txtlab = "<i>" + constant + "</i> = (" + numString + " &plusmn; " + uncString +
			") &times 10<sup>" + labelScale + "</sup>";
		    var newFileText = constant + " = (" + numString + " \u00b1 " + uncString + ") X 10^" + labelScale;
		} else {
		    var txtlab = "<i>" + constant + "</i> = (" + numString + ") &times 10<sup>" + labelScale + "</sup>";
		    var newFileText = constant + " = (" + numString + ") X 10^" + labelScale;
		}
	    }
	    if (constant == "A") {
		newFileText = fileText + "\n" + newFileText;
		document.getElementById("Avalue").innerHTML = txtlab;
	    } else if (constant == "B") {
		newFileText = fileText + "\n" + newFileText;
		document.getElementById("Bvalue").innerHTML = txtlab;
	    } else if (constant == "C") {
		newFileText = fileText + "\n" + newFileText;
		document.getElementById("Cvalue").innerHTML = txtlab;
	    } else if (constant == "D") {
		newFileText = fileText + "\n" + newFileText;
		document.getElementById("Dvalue").innerHTML = txtlab;
	    }
	}
	return newFileText;
    }

    function deScale(constant, num, num2) {
	var Cscale = 0;
	if (yScale != 0 && chosenFit != 'exactProportion') {
		Cscale = yScale;
	}
	if (constant != "RMSE") {
	    switch (chosenFit) {
	    case 'linear':
	    case 'proportional':
		if (constant == "A") {
		    Cscale = Cscale - xScale;
		}
		break;
	    case 'squareLaw':
	    case 'quadratic':
		if (constant == "A") {
		    Cscale = Cscale - 2*xScale;
		} else if (constant == "B") {
		    Cscale = Cscale - xScale;
		}
		break;
	    case 'inverse':
		Cscale = Cscale + xScale;
		break;
	    case 'inverseSquare':
		Cscale = Cscale + 2*xScale;
		break;
	    case 'powerLaw':
		if (constant == "A") {
		    Cscale = Cscale - num2*xScale;
		} else {
		    Cscale = 0;
		}
		break;
	    case 'expDecay':
		if (constant == "B") {
		    Cscale = xScale;
		}
		break;
	    case 'root':
		Cscale = Cscale - xScale/2;
		break;
	    case 'inverseRoot':
		Cscale = Cscale + xScale/2;
		break;
	    case 'cosine':		
		if (constant == "B") {
		    Cscale = -xScale;
		} else if (constant == 'C') {
		    Cscale = 0;
		}
		break;
	    case 'dampedCosine':
		if (constant == "B") {
		    Cscale = -xScale;
		} else if (constant == 'C') {
		    Cscale = 0;
		} else if (constant == 'D') {
		    Cscale = xScale;
		}
		break;
	    case 'relaxation':
		if (constant == "B") {
		    Cscale = xScale;
		}
		break;
	    case 'gaussian':
		if (constant == 'B' || constant == 'C') {
		    Cscale = xScale;
		}
		break;
	    }
	}
	return Cscale;
    }
    function professionalize(value, uncert) {
	if (uncert == 0) {
	    var nd = 0;
	} else {
	    var nd = Math.floor(log10(uncert) - 1);
	}
	var uncert = Math.round(uncert/Math.pow(10, nd));
	uncert = uncert * Math.pow(10, nd);
	var dp = Math.abs(nd);
	var uncertString = uncert.toFixed(dp);
	var value = Math.round(value/Math.pow(10, nd));
	value = value * Math.pow(10, nd);
	var valueString = value.toFixed(dp);
	return {val: valueString, unc: uncertString};
    }
}

function hideTheFit() {
	document.getElementById("Avalue").innerHTML = " ";
	document.getElementById("Bvalue").innerHTML = " ";
	document.getElementById("Cvalue").innerHTML = " ";
	document.getElementById("Dvalue").innerHTML = " ";
	document.getElementById("rmseValue").innerHTML = " ";
}

function drawTheFit(chosenFit,xmin,xmax,ymin,ymax,a,afin,sheetNumber) {
    var xstep, xcurve, ycurve, xp, yp, oxp, oyp, length;
    var swapLength = sheetDashes[sheetNumber];
    var line = true;
    var nFitPoints = 1000;
    xstep = (xmax - xmin)/nFitPoints;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.strokeStyle = getCurveColor(sheetColors[sheetNumber]);
    var firstPoint = true;
    for (var i=0; i<nFitPoints+1; i++) {
	xcurve = xmin + i*xstep;
	ycurve = fitFunction(chosenFit,xcurve,a,afin);
	xp = toPixels(xcurve, xmin, xmax, 'x');
	yp = toPixels(ycurve, ymin, ymax, 'y');
	if (inBox(xp, yp)) {
	    if (firstPoint) {
		oxp = xp;
		oyp = yp;
		length = 0;
		ctx.moveTo(xp, yp);
		firstPoint = false;
	    } else {
		length = length + Math.sqrt(Math.pow(xp-oxp,2) + Math.pow(yp-oyp,2));
		if (length > swapLength) {
		    if (line) {
			line = false;
		    } else {
			line = true;
		    }
		    length = 0;
		}
		if (line) {
		    ctx.lineTo(xp, yp);
		} else {
		    ctx.moveTo(xp, yp);
		}
		oxp = xp;
		oyp = yp;
	    }
	} else {
	    if (!firstPoint) {
		oxp = xp;
		oyp = yp;
		length = 0;
		line = true;
		ctx.moveTo(xp, yp);
	    }
	}
    }
    ctx.stroke();
    
    function inBox(xp, yp) {
	if (xp >= plotParams.xBord && xp <= plotParams.xWidth) {
	    if (yp >= plotParams.yBord && yp <= plotParams.yWidth) {
		return true;
	    }
	}
	return false;
    }
}

function fitFunction(chosenFit,x,a,afin) {
    // calculates the fit y value that goes with the given x value
    var y;
    switch(chosenFit) {
    case 'linear':
	y = a[1]*x + a[2];
	break;
    case 'squareLaw':
	y = a[0]*x*x;
	break;
    case 'quadratic':
	y = a[0]*x*x + a[1]*x + a[2];
	break;
    case 'inverse':
	y = a[3]/x;
	break;
    case 'inverseSquare':
	y = a[4]/x/x;
	break;
    case 'proportional':
	y = a[1]*x;
	break;
    case 'powerLaw':
	y = afin[0]*Math.pow(x, afin[1]);
	break;
    case 'expDecay':
	y = afin[2]*Math.exp(x*afin[3])+afin[4];
	break;
    case 'exactProportion':
	y = x;
	break;
    case 'root':
	y = a[5]*Math.sqrt(x);
	break;
    case 'noRelation':
	y = a[2];
	break;
    case 'inverseRoot':
	y = a[6]/Math.sqrt(x);
	break;
    case 'cosine':
	y = afin[4] + afin[5]*Math.cos(afin[6]*x + afin[7]);
	break;
    case 'dampedCosine':
	y = afin[4] + afin[8]*Math.cos(afin[9]*x + afin[10])*Math.exp(-x*afin[11]);
	break;
    case 'relaxation':
	y = afin[12]*(1 - Math.exp(-afin[13]*x));
	break;
    case 'gaussian':
	y = afin[14]*Math.exp(-1/2*Math.pow((x-afin[15])*afin[16], 2)) + afin[4];
	break;
    case 'log':
	y = a[2] + a[1]*Math.log(x);
	break;
    }
    return y;
}

function drawTheTangent(chosenFit, xmin, xmax, ymin, ymax, a, afin, xdata, npts) {
    // draw a tangent curve on top of the graph
    var xstep, xcurve, ycurve, xp, yp;
    var nFitPoints = 1000;
    var mouseXValue = toValue(mouseX, xmin, xmax, 'x');
    switch(chosenFit) {
    default:
	return;
	break;
    case 'squareLaw':
    case 'quadratic':
    case 'inverse':
    case 'inverseSquare':
    case 'powerLaw':
    case 'expDecay':
    case 'root':
    case 'inverseRoot':
	if (lockToDataChecked) {
	    var xDistance = Infinity;
	    for (var i=0; i<npts; i++) {
		var dTest = Math.abs(mouseXValue - xdata[i]/Math.pow(10,xScale));
		if (dTest < xDistance) {
		    xDistance = dTest;
		    xValue = xdata[i]/Math.pow(10,xScale);
		}
	    }
	} else {
	    var xValue = mouseXValue;
	}
	if (xValue >= xmin && xValue <= xmax) {
	    var yValue = fitFunction(chosenFit, xValue, a, afin);
	    var slope = calcSlope(chosenFit, xValue, a, afin);
	    var intercept = yValue - slope*xValue;

	    xstep = (xmax - xmin)/nFitPoints;
	    ctx.beginPath();
	    ctx.strokeStyle = tangentColor;
	    var firstPoint = true;
	    for (var i=0; i<nFitPoints+1; i++) {
		xcurve = xmin + i*xstep;
		ycurve = slope*xcurve + intercept;
		xp = toPixels(xcurve, xmin, xmax, 'x');
		yp = toPixels(ycurve, ymin, ymax, 'y');
		if (xp >= plotParams.xBord && xp <= plotParams.xWidth) {
		    if (yp >= plotParams.yBord && yp <= plotParams.yWidth) {
			if (firstPoint) {
			    ctx.moveTo(xp, yp);
			    firstPoint = false;
			} else {
			    ctx.lineTo(xp, yp);
			}
		    }
		}
	    }
	    ctx.stroke();
	    var num1 = xValue.toFixed(6);
	    var num2 = slope.toFixed(6);
	    var txtlab = "<i>x</i> value = " + num1.toString();
	    document.getElementById("xValue").innerHTML = txtlab;
	    txtlab = "slope at <i>x</i> = " + num2.toString();
	    document.getElementById("slopeValue").innerHTML = txtlab;
	} else {
	    clearTangentData();
	}
    }
}

function calcSlope(chosenFit,xValue,a,afin) {
    var slopeValue;
    switch(chosenFit) {
    case 'squareLaw':
	slopeValue = 2*a[0]*xValue;
	break;
    case 'quadratic':
	slopeValue = 2*a[0]*xValue + a[1];
	break;
    case 'inverse':
	slopeValue = -1*a[3]/xValue/xValue;
	break;
    case 'inverseSquare':
	slopeValue = -2*a[4]/xValue/xValue/xValue;
	break;
    case 'powerLaw':
	slopeValue = afin[0]*afin[1]*Math.pow(xValue, afin[1]-1);
	break;
    case 'expDecay':
	slopeValue = afin[2]*afin[3]*Math.exp(xValue*afin[3]);
	break;
    case 'root':
	slopeValue = a[5]/2/Math.sqrt(xValue);
	break;
    case 'inverseRoot':
	slopeValue = -a[6]/2/Math.pow(xValue, 1.5);
	break;
    default:
	slopeValue = 0;
    }
     return slopeValue;
}

function clearTangentData() {
    document.getElementById("xValue").innerHTML = " ";
    document.getElementById("slopeValue").innerHTML = " ";
}


// Section:  Settings **********************************************************************************************************
// Manage the Settings menu and controls
//
function showSettings() {
    document.getElementById("settingsModal").style.display = "block";
    updateSelectors();
}

function closeSettings() {
    document.getElementById("settingsModal").style.display = "none";
}

function setScreenZoom(started) {
    // iPad edition: on iPads (and iPhones) the CSS transform is never used.  Instead the viewport meta tag tells
    //   Safari how wide the page is, and Safari scales it natively.  This keeps pop-ups, taps, and the side panel
    //   lined up, which the transform does not do on Safari.  Auto Zoom off = 1:1 size, pinch to zoom.
    if (isIOS) {
	var vp = document.getElementById('viewportMeta');
	if (!vp) {                                   // in case the page was served without the meta tag
	    vp = document.createElement('meta');
	    vp.id = 'viewportMeta';
	    vp.name = 'viewport';
	    document.head.appendChild(vp);
	}
	vp.setAttribute('content', autoZoom ? 'width=1370' : 'width=device-width, initial-scale=1');
	document.body.style.transform = '';
	if (started) {
	    computeAll();
	}
	return;
    }
    if(autoZoom) {
	var appWidth = 1370;
	var screenWidth = window.innerWidth;
	var zoomLevel = screenWidth/appWidth;
	zoomLevel = Math.floor(zoomLevel * 10)/10;
	var scaleLevel = 'scale(' + zoomLevel.toString() + ')';
	document.body.style.transformOrigin = 'top left';
	document.body.style.transform = scaleLevel;
	if (started) {
	    computeAll();
	}
    }
}

function togglePoints(sheet) {
    var pointButtonName = 'ptsSheet' + String.fromCharCode(65 + sheet);
    if (yesPoints[sheet]) {
	document.getElementById(pointButtonName).checked = false;
	yesPoints[sheet] = false;
    } else {
	document.getElementById(pointButtonName).checked = true;
	yesPoints[sheet] = true;
    }
    computeAll();
}
	
function toggleGrid() {
    if (yesGrid) {
	document.getElementById("showGrid").checked = false;
	yesGrid = false;
	localStorage.setItem('nPlotGrid', 'false');
    } else {
	document.getElementById("showGrid").checked = true;
	yesGrid = true;
	localStorage.setItem('nPlotGrid', 'true');
    }
    computeAll();
}

function toggleInclude() {
    if (scaleWithBars) {
	document.getElementById("includeBars").checked = false;
	scaleWithBars = false;
	localStorage.setItem('nPlotScale', 'false');
    } else {
	document.getElementById("includeBars").checked = true;
	scaleWithBars = true;
	localStorage.setItem('nPlotScale', 'true');
    }
    computeAll();
}

function toggleIncludeFormulas() {
    if (includeFormulas) {
	document.getElementById("inclFormulas").checked = false;
	includeFormulas = false;
	localStorage.setItem('nFormulas', 'false');
    } else {
	document.getElementById("inclFormulas").checked = true;
	includeFormulas = true;
	localStorage.setItem('nFormulas', 'true');
    }
    computeAll();
}

function toggleYesDownload() {
    if (yesDownload) {
	document.getElementById("yesDownload").checked = false;
	document.getElementById('downloadImageButton').innerHTML = 'Graph to Clipboard';
	localStorage.setItem('nPlotYesDnld', 'false');
	yesDownload = false;
	document.getElementById("includeFit").checked = false;
	localStorage.setItem('nPlotInclFit', 'false');
	includeFit = false;
    } else {
	document.getElementById("yesDownload").checked = true;
	document.getElementById('downloadImageButton').innerHTML = 'Download Graph';
	localStorage.setItem('nPlotYesDnld', 'true');
	yesDownload = true;
    }
}

function toggleIncludeFit() {
    if (yesDownload) {
	if (includeFit) {
	    document.getElementById("includeFit").checked = false;
	    localStorage.setItem('nPlotInclFit', 'false');
	    includeFit = false;
	} else {
	    document.getElementById("includeFit").checked = true;
	    localStorage.setItem('nPlotInclFit', 'true');
	    includeFit = true;
	}
    } else {
	document.getElementById("includeFit").checked = false;
	localStorage.setItem('nPlotInclFit', 'false');
	includeFit = false;
    }
}
	
function toggleRequireOrigin() {
    if (requireOrigin) {
	requireOrigin = false;
	document.getElementById("requireOrigin").checked = false;
    } else {
	requireOrigin = true;
	document.getElementById("requireOrigin").checked = true;
    }
    computeAll();
}

function toggleProfessionalMode() {
    if (profMode) {
	profMode = false;
	document.getElementById("professionalMode").checked = false;
	localStorage.setItem('nPlotProfMode', 'false');
    } else {
	profMode = true;
	document.getElementById("professionalMode").checked = true;
	localStorage.setItem('nPlotProfMode', 'true');
    }
    computeAll();
}

function toggleShowUncertainty() {
    if (noUncertainty) {
	noUncertainty = false;
	document.getElementById("noUncertainty").checked = false;
	localStorage.setItem('nPlotNoUncertainty', 'false');     // iPad edition: this setting is now remembered
    } else {
	noUncertainty = true;
	document.getElementById("noUncertainty").checked = true;
	localStorage.setItem('nPlotNoUncertainty', 'true');
    }
    computeAll();
}

function toggleShowErrorBars() {
    // iPad edition: show or hide the error bars entered in the ±x and ±y columns (remembered; default is hidden)
    if (showErrorBars) {
	showErrorBars = false;
	document.getElementById("showErrorBars").checked = false;
	localStorage.setItem('nPlotShowBars', 'false');
    } else {
	showErrorBars = true;
	document.getElementById("showErrorBars").checked = true;
	localStorage.setItem('nPlotShowBars', 'true');
    }
    computeAll();
}

function toggleAutoZoom() {
    if (autoZoom) {
	autoZoom = false;
	document.getElementById("autoZoom").checked = false;
	localStorage.setItem('nPlotAutoZoom', 'false');
	document.body.style.transformOrigin = 'top left';
	document.body.style.transform = 'scale(1)';
    } else {
	autoZoom = true;
	document.getElementById("autoZoom").checked = true;
	localStorage.setItem('nPlotAutoZoom', 'true');
    }
    setScreenZoom(true);
}

function getMouse(event) {
    // triggered by mouse (or finger, or pencil) movement over the canvas
    // iPad edition: compute the position from the canvas's on-screen rectangle instead of offsetX/offsetY, so the
    //   result is in canvas pixels no matter how the page is zoomed or scaled (offsetX is unreliable under
    //   CSS transforms on Safari, and is undefined for some touch events).
    var rect = canvas1.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && event.clientX !== undefined) {
	mouseX = (event.clientX - rect.left) * canvas1.width / rect.width;
	mouseY = (event.clientY - rect.top) * canvas1.height / rect.height;
    } else {
	mouseX = event.offsetX;
	mouseY = event.offsetY;
    }
    if (tangentChecked || haveText || addingArrow || addingLine || debug) {
	computeAll();
    }
}

function selectorDisplay(selector, action) {
    var selectorButton = selector + 'SelectorButton';
    var selectorContent = selector + 'SelectorContent';
    if (action == 'show') {
	if (selector != 'dash') {
	    document.getElementById("settingsModalContent").style.height = "690px";
	    document.getElementById("settingsDone").style.marginTop = "70px";
	}
	document.getElementById(selectorButton).style.display = "none";
	document.getElementById(selectorContent).style.display = "flex";
    } else {
	document.getElementById(selectorButton).style.display = "inline";
	document.getElementById(selectorContent).style.display = "none";
	document.getElementById("settingsModalContent").style.height = "640px";
	document.getElementById("settingsDone").style.marginTop = "20px";
    }
}

function getSelection (selector, selected, parent) {
    if (selected == '') {
	selected = parent;
    }
    var selectorButtonImage = selector + 'ButtonImage';
    var newButtonImage = 'images/' + String(selected).toLowerCase() + '.png';
    document.getElementById(selectorButtonImage).src = newButtonImage;
    selectorDisplay(selector, 'hide');
    if (selector != 'dash') {
	return selected;
    } else {
	var selectNumber = selected.replace('dash', '');
	var dashNumber = Math.floor(parseFloat(selectNumber));
	return dashNumber;
    }
}

function updateSelectors() {
    var selected = sheetSymbols[getSheetNumber(activePrefSheet)];
    var pointButtonImage = 'images/' + String(selected).toLowerCase() + '.png';
    document.getElementById("pointButtonImage").src = pointButtonImage;

    selected = sheetColors[getSheetNumber(activePrefSheet)];
    var colorButtonImage = 'images/' + String(selected).toLowerCase() + '.png';
    document.getElementById("colorButtonImage").src = colorButtonImage;

    var selected = Number(sheetDashes[getSheetNumber(activePrefSheet)]);
    if (selected > 100) {
	var selectedText = selected.toExponential(0);
	selectedText = selectedText.replace('+', '');
    } else {
	var selectedText = selected.toString();
    }
    var dashButtonImage = 'images/dash' + selectedText + '.png';
    document.getElementById("dashButtonImage").src = dashButtonImage;
}

function storeSelectorPrefs(whichToStore) {
    if(whichToStore == 'points') {
	localStorage.setItem('nPlotSymbols', sheetSymbols);
    } else if(whichToStore == 'colors') {
	localStorage.setItem('nPlotColors', sheetColors);
    } else if(whichToStore == 'dashes') {
	localStorage.setItem('nPlotDashes', sheetDashes);
    }
}
	
// Section: Scrolling ********************************************************************************************************
// Manage scrolling the data spreadsheet 
//
function vScroll(event) {
    var mousePageY = event.pageY;
    if (mouseDownInCell) {
	var scrollingSheet = event.currentTarget.id;
	if (mousePageY > scrollPoint) {
	    if (!vScrolling) {
		vScrolling = true;
		scrollSheet(scrollingSheet);
	    }
	} else {
	    vScrolling = false;
	}
    }
}

async function scrollSheet(scrollingSheet) {
    if (mouseDownInCell && vScrolling) {
	var currentScroll = document.getElementById(scrollingSheet).scrollTop;
	document.getElementById(activeSheet).scrollTop = currentScroll + vScrollAmount;
	await delay(200);
	scrollSheet(scrollingSheet);
    } else {
	vScrolling = false;
    }
}

function delay(ms) {
    return new Promise(dummy => setTimeout(dummy, ms));
}


// Section:  Front panel *******************************************************************************************************
// Handle these front panel button presses: spreadsheet tabs, model tabs, user manual, and about buttons
// Also handle some pop-up (modal) windows that are pushed from the code
//

function setModelsPanel(panel) {
    const mSheets = document.querySelectorAll(".modelsDiv");
    mSheets.forEach(element => {
	element.style.display = "none";
    });
    const sheetTabs = document.querySelectorAll(".modelButton");
    sheetTabs.forEach(element => {
	element.style.backgroundColor = backgroundColor;
    });

    if (panel == 'advanced') {
	document.getElementById("advancedModelsDiv").style.display = "block";
	document.getElementById("advancedModelsTab").style.backgroundColor = selectedColor;
	document.getElementById("tangentFinding").style.display = "flex";
	activePanel = 'advanced';
	justGuessing = false;
    } else if(panel == 'expert') {
	document.getElementById("expertModelsDiv").style.display = "block";
	document.getElementById("expertModelsTab").style.backgroundColor = selectedColor;
	document.getElementById("tangentFinding").style.display = "none";
	activePanel = 'expert';
	justGuessing = true;
    } else {
	document.getElementById("basicModelsDiv").style.display = "block";
	document.getElementById("basicModelsTab").style.backgroundColor = selectedColor;
	document.getElementById("tangentFinding").style.display = "flex";
	activePanel = 'basic';
	justGuessing = false;
    }
    changeModel('none');
    hideTheFit();
    return activePanel;
}

function changeModel(fitType) {
    // called by a change in the selected model on the front panel or by a change in minishet
    // does two things:  (1) sets the appropriate element of sheetFitTypes to fitType
    //                   (2) updates the front panel radio buttons to match fitType
    var sheets = ['A', 'B', 'C', 'D', 'E'];
    var chkPts = countPoints(activeSheet);
    if (chkPts == 0) {
	fitType = 'none';
    }
    sheetFitTypes[getSheetNumber(activeSheet)] = fitType;
    switch(activePanel) {
    case 'expert':
	switch(fitType) {
	default:
	    document.getElementById("expFitNone").checked = true;
	    showGuessInputs('none');
	    hideTheFit();
	    break;
	case 'cosine':
	    document.getElementById("fitCosine").checked = true;
	    justGuessing = true;
	    showGuessInputs('cosine');
	    break;
	case 'dampedCosine':
	    document.getElementById("fitDampedCosine").checked = true;
	    justGuessing = true;
	    showGuessInputs('dampedCosine');
	    break;
	case 'relaxation':
	    document.getElementById("fitRelaxation").checked = true;
	    justGuessing = true;
	    showGuessInputs('relaxation');
	    break;
	case 'gaussian':
	    document.getElementById("fitGaussian").checked = true;
	    justGuessing = true;
	    showGuessInputs('gaussian');
	    break;
	}
	break;
    case 'advanced':
	justGuessing = false;
	switch(fitType) {
	default:
	    document.getElementById("advFitNone").checked = true;
	    hideTheFit();
	    break;
	case 'powerLaw':
	    document.getElementById("fitPowerLaw").checked = true;
	    break;
	case 'expDecay':
	    document.getElementById("fitExponential").checked = true;
	    break;
	case 'log':
	    document.getElementById("fitLogarithm").checked = true;
	    break;
	}
	break;
    default:
	justGuessing = false;
	switch(fitType) {
	default:	     
	    document.getElementById("fitNone").checked = true;
	    hideTheFit();
	    break;
	case 'noRelation':
	    document.getElementById("noRelation").checked = true;
	    break;
	case 'exactProportion':
	    document.getElementById("yEqualsX").checked = true;
	    break;
	case 'proportional':
	    document.getElementById("yEqualsAX").checked = true;
	    break;
	case 'linear':
	    document.getElementById("fitLinear").checked = true;
	    break;
	case 'squareLaw':
	    document.getElementById("fitSquare").checked = true;
	    break;
	case 'quadratic':
	    document.getElementById("fitQuadratic").checked = true;
	    break;
	case 'inverse':
	    document.getElementById("fitInverse").checked = true;
	    break;
	case 'inverseSquare':
	    document.getElementById("fitInverseSquare").checked = true;
	    break;
	case 'root':
	    document.getElementById("fitSquareRoot").checked = true;
	    break;
	case 'inverseRoot':
	    document.getElementById("fitInvSqrRoot").checked = true;
	    break;
	case 'powerLaw':
	    document.getElementById("fitPowerLaw").checked = true;
	    break;
	case 'expDecay':
	    document.getElementById("fitExponential").checked = true;
	}
    }
    computeAll();
}

function showGuessInputs(fitType) {
    var elements = document.getElementsByClassName('guessSpan');
    for (let i = 0; i < elements.length; i++) {
	elements[i].style.display = "flex";
    }
    switch(fitType) {
    default:
	document.getElementById("guessContainer").style.display = "none";
	return;
	break;
    case 'cosine':
	document.getElementById("dGuess").style.display = "none";
	break;
    case 'dampedCosine':
	break;
    case 'relaxation':
	document.getElementById("cGuess").style.display = "none";
	document.getElementById("dGuess").style.display = "none";
	document.getElementById("baselineSpan").style.display = "none";
	break;
    case 'gaussian':
	document.getElementById("baselineSpan").style.display = "none";
	break;
    }
    document.getElementById("guessContainer").style.display = "flex";
}

function setSheet(selectedSheet) {
    activeSheet = selectedSheet;                  // activeSheet is global
    const mSheets = document.querySelectorAll(".miniSheet");
    mSheets.forEach(element => {
	element.style.display = "none";
    });
    const sheetTabs = document.querySelectorAll(".sheetButton");
    sheetTabs.forEach(element => {
	element.style.backgroundColor = sheetTabColor;
    });
    if (activeSheet == "B") {
	document.getElementById("miniSheet2").style.display = "block";
	document.getElementById("sheetButton2").style.backgroundColor = sheetSelectColor;
    } else if (activeSheet == "C") {
	document.getElementById("miniSheet3").style.display = "block";
	document.getElementById("sheetButton3").style.backgroundColor = sheetSelectColor;
    } else if (activeSheet == "D") {
	document.getElementById("miniSheet4").style.display = "block";
	document.getElementById("sheetButton4").style.backgroundColor = sheetSelectColor;
    } else if (activeSheet == "E") {
	document.getElementById("miniSheet5").style.display = "block";
	document.getElementById("sheetButton5").style.backgroundColor = sheetSelectColor;
    } else {
	document.getElementById("miniSheet1").style.display = "block";
	document.getElementById("sheetButton1").style.backgroundColor = sheetSelectColor;
    }
    var model = (sheetFitTypes[getSheetNumber(activeSheet)]);
    switch(model) {
    case 'none':
    case 'noRelation':
    case 'exactProportion':
    case 'proportional':
    case 'linear':
    case 'squareLaw':
    case 'quadratic':
    case 'inverse':
    case 'inverseSquare':
    case 'root':
    case 'inverseRoot':
	if (activePanel != 'basic') {
	    activePanel = setModelsPanel('basic');
	    changeModel(model);
	    computeAll();
	}
	break;
    case 'powerLaw':
    case 'expDecay':
	if (activePanel != 'advanced') {
	    activePanel = setModelsPanel('advanced');
	    changeModel(model);
	    computeAll();
	}
    }
    
    changeModel(sheetFitTypes[getSheetNumber(activeSheet)]);
    clearSaveName();
    computeAll();
}

function getSheetNumber(sheetName) {
    var sheetNumber = sheetName.charCodeAt(0) - 65;
    return sheetNumber;
}

function getSheetLetter(sheetNumber) {
    var sheetCode = sheetNumber + 65;
    return String.fromCharCode(sheetCode);
}

function showAbout() {
    document.getElementById("aboutModal").style.display = "block";
    return 0;
}

function showHelp() {
    document.getElementById("helpModal").style.display = "block";
    return 0;
}

function showBadPaste() {
    document.getElementById("badPasteModal").style.display = "block";
    return 0;
}

// Section:  Annotating ********************************************************************************************************
// Manage creation and editing of annotation that can be added to the graph
// This is a massive section!!
//
function showAnnotate() {
    // shows the annotation modal dialog
    if (!madeGraph) {
	return;
    }
    document.getElementById("noteTextInput").value = "";
    document.getElementById("messageLine").innerHTML = "&nbsp;";
    allButtonsNormal();
    for (let i=0; i<5; i++) {
	if (sheetFitTypes[i] == 'linear') {
	    document.getElementById('IBOption').style.display = 'block';
	}
    }
    annotateModal.style.display = "block";
}
    
function addFitText(idx) {
    // add the results of a fit to the annotation list
    document.getElementById('cancelAddNoteButton').value = 'Cancel';
    sheetAnnoteStatus[idx] = -1;
    haveText = true;
    var noteText = document.getElementById("noteTextInput").value;
    if (noteText != "") {
	var fitText = noteText + '\n' + fitDownload[idx];
	document.getElementById("noteTextInput").value = "";
    } else {
	var fitText = fitDownload[idx];
    }
    var startXY = checkAnnLimits(mouseX, mouseY);
    manageAnnotation('push', 0, startXY.x, startXY.y, 'fit', fitText, idx, sheetFitTypes[idx]);
    allButtonsGrey();
    document.getElementById("messageLine").innerHTML = "<b>Position text with mouse.  Click to finish.</b>";
    computeAll();
    return 0;
}

function noteReady() {
    allButtonsGrey()
    buttonColor('note', 'normal');
    buttonColor('fit', 'normal');
    document.getElementById('cancelAddNoteButton').value = 'Cancel';
    annotateWhat = 2;
}

function addNoteText() {
    // add a user entered note to the annotation list
    if (haveText) {
	return;
    }
    buttonColor('note', 'grey');
    if (editNoteFlag) {
	annotation.text[editWhich] = document.getElementById("noteTextInput").value;
	haveText = true;
	document.getElementById("noteTextInput").value = "";
	document.getElementById("cancelAddNoteButton").value = 'Cancel';
	computeAll();
	return;
    }
    if (document.getElementById("noteTextInput").value == "") {
	return;
    } 
    haveText = true;
    document.getElementById("messageLine").innerHTML = "<b>Position text with mouse.  Click to finish.</b>";
    var startXY = checkAnnLimits(mouseX,mouseY);
    manageAnnotation('push', 0, startXY.x, startXY.y, 'note', document.getElementById("noteTextInput").value, 0, 0);
    computeAll();
}

function addArrow() {
    // initiate the interactive addition of an annotation arrow
    if (annotateWhat != 0) {
	return;
    } else {
	annotateWhat = 4;
    }
    document.getElementById("canvas1").style.cursor = 'none';
    addingArrow = true;
    arrowStarted = false;
    allButtonsGrey()
    document.getElementById('cancelAddNoteButton').value = 'Cancel';
}

function addLine() {
    // initiate the interactive addition of manually added dashed line (a feature for IB students)
    if (annotateWhat != 0) {
	return;
    } else {
	annotateWhat = 32;
    }
    document.getElementById("canvas1").style.cursor = 'none';
    addingLine = true;
    lineStarted = false;
    allButtonsGrey()
    document.getElementById('cancelAddNoteButton').value = 'Cancel';
    document.getElementById('manualSlope').innerHTML = '';
    document.getElementById('manualIntercept').innerHTML = '';
}

function dropText(event) {
    // function to leave annotation text where user clicks, or...
    //    handle the addition of an annotation arrow
    if (haveText) {
	haveText = false;
	document.getElementById("messageLine").innerHTML = "&nbsp;";
	if (editWhich >= 0) {
	    editWhich = -1;
	    document.getElementById('editDoneButton').value = 'Done';
	    document.getElementById('cancelAddNoteButton').value = 'Done';
	    if (editNoteFlag) {
		showEditList();
		editNoteFlag = false;
	    }
	} else {
	    document.getElementById("noteTextInput").value = "";
	    document.getElementById('cancelAddNoteButton').value = 'Done';
	    annotateWhat = 0;
	    allButtonsNormal();
	}
	document.getElementById("canvas1").style.cursor = 'none';
	computeAll();
	return;
    }
    if (addingArrow) {
	if (!arrowStarted) {
	    if (mouseX > plotParams.xBord && mouseX < plotParams.xBord+plotParams.xSize) {
		if (mouseY > plotParams.yBord && mouseY < plotParams.yBord+plotParams.ySize) {
		    arrowStarted = true;
		    manageAnnotation('push', 0, mouseX, mouseY, 'arrow');
		}
	    }
	} else {
	    if (mouseX > plotParams.xBord && mouseX < plotParams.xBord+plotParams.xSize) {
		if (mouseY > plotParams.yBord && mouseY < plotParams.yBord+plotParams.ySize) {
		    if (editWhich >= 0) {
			if (editArrowFlag) {
			    annotation.x[editWhich] = mouseX;
			    annotation.y[editWhich] = mouseY;
			    editArrowFlag = false;
			} else {
			    annotation.tWidth[editWhich] = mouseX;
			    annotation.tHeight[editWhich] = mouseY;
			    document.getElementById('editDoneButton').value = 'Done';
			    arrowStarted = false;
			    addingArrow = false;
			    editWhich = -1;
			    document.getElementById("canvas1").style.cursor = 'none';
			    computeAll();
			}
		    } else {
			arrowStarted = false;
			addingArrow = false;
			annotation.tWidth[annotation.index-1] = mouseX;
			annotation.tHeight[annotation.index-1] = mouseY;
			document.getElementById('cancelAddNoteButton').value = 'Done';
			allButtonsNormal();
			annotateWhat = 0;
			computeAll();
		    }
		}
	    }
	}
    }
    if (addingLine) {
	if (!lineStarted) {
	    if (mouseX > plotParams.xBord && mouseX < plotParams.xBord+plotParams.xSize) {
		if (mouseY > plotParams.yBord && mouseY < plotParams.yBord+plotParams.ySize) {
		    lineStarted = true;
		    manageAnnotation('push', 0, mouseX, mouseY, 'line');  // starting coord of line are in x and y 
		}
	    }
	} else {
	    if (mouseX > plotParams.xBord && mouseX < plotParams.xBord+plotParams.xSize) {
		if (mouseY > plotParams.yBord && mouseY < plotParams.yBord+plotParams.ySize) {
		    lineStarted = false;
		    addingLine = false;
		    annotation.tWidth[annotation.index-1] = mouseX;
		    annotation.tHeight[annotation.index-1] = mouseY;     // ending coord are in tWidth and tHeight
		    if (annotation.x[annotation.index-1] <= annotation.tWidth[annotation.index-1]) {
			var x1 = annotation.x[annotation.index-1];
			var y1 = annotation.y[annotation.index-1];
			var x2 = annotation.tWidth[annotation.index-1];
			var y2 = annotation.tHeight[annotation.index-1];
		    } else {
			var x1 = annotation.tWidth[annotation.index-1];
			var y1 = annotation.tHeight[annotation.index-1];
			var x2 = annotation.x[annotation.index-1];
			var y2 = annotation.y[annotation.index-1];
		    }
		    var em = (y2 - y1)/(x2 - x1);                        // slope of manual line
		    var be = y1 - em*x1;                                 // y intercept
		    var ytest1 = em*plotParams.xBord + be;
		    if (ytest1 > plotParams.yWidth) {
			var ys = plotParams.yWidth;
			var xs = (ys - be)/em;
		    } else if (ytest1 < plotParams.yBord) {
			var ys = plotParams.yBord;
			var xs = (ys - be)/em;
		    } else {
			var xs = plotParams.xBord;
			var ys = ytest1;
		    }
		    var ytest2 = em*plotParams.xWidth + be;
		    if (ytest2 > plotParams.yWidth) {
			var ye = plotParams.yWidth;
			var xe = (ye - be)/em;
		    } else if (ytest2 < plotParams.yBord) {
			var ye = plotParams.yBord;
			var xe = (ye - be)/em;
		    } else {
			var xe = plotParams.xWidth;
			var ye = ytest2;
		    }
		    
		    annotation.x[annotation.index-1] = xs;
		    annotation.y[annotation.index-1] = ys;
		    annotation.tWidth[annotation.index-1] = xe;
		    annotation.tHeight[annotation.index-1] = ye;
//		    var lineIntercept = toValue(ytest1, theBox.ymin, theBox.ymax, 'y');
		    var y2 = toValue(ye, theBox.ymin, theBox.ymax, 'y');
		    var y1 = toValue(ys, theBox.ymin, theBox.ymax, 'y');
		    var dy = y2 - y1;
		    var x2 = toValue(xe, theBox.xmin, theBox.xmax, 'x');
		    var x1 = toValue(xs, theBox.xmin, theBox.xmax, 'x');
		    var dx = x2 - x1; 
		    var lineSlope = dy/dx;
		    var lineIntercept = y2 - lineSlope*x2;
		    var slopeText = 'Slope = ' + lineSlope.toPrecision(6);
		    var interceptText = 'Intercept = ' + lineIntercept.toPrecision(6);
		    document.getElementById('manualSlope').innerHTML = slopeText;
		    document.getElementById('manualIntercept').innerHTML = interceptText;
		    document.getElementById('noteTextInput').value = slopeText + '  ' + interceptText;
		    document.getElementById('cancelAddNoteButton').value = 'Done';
		    allButtonsNormal();
		    buttonColor('note', 'normal');
		    annotateWhat = 0;
		    computeAll();
		}
	    }
	}
    }
}

function handleDonePress() {
    // clean up when the user presses the Done button
    addingArrow = false;
    addingLine = false;
    document.getElementById('manualSlope').innerHTML = '';
    document.getElementById('manualIntercept').innerHTML = '';
    document.getElementById('IBOption').style.display = 'none';
    if (editNoteFlag) {
	annotation.x[editWhich] = savedPoint.x;
	annotation.y[editWhich] = savedPoint.y;
	annotation.text[editWhich] = savedPoint.text;
	document.getElementById('editDoneButton').value = 'Done';
	showEditList();
	editNoteFlag = false;
	haveText = false;
	computeAll();
	return;
    }
    if (haveText || arrowStarted || lineStarted) {
	haveText = false;
	arrowStarted = false;
	lineStarted = false;
	manageAnnotation('pop');
	computeAll();
    }
    for (var i = 0; i < 5; i++) {
	sheetAnnoteStatus[i] = 0;
    }
    if (annotateWhat == 0) {
	hideAnnotate();
    } else {
	document.getElementById('cancelAddNoteButton').value = 'Done';
	document.getElementById('messageLine').innerHTML = "&nbsp;";
	allButtonsNormal();
	annotateWhat = 0;
    }
}
	
function removeAnnotation() {
    // clears all graph annotaion
    haveText = false;
    noteClicks = 0;
    manageAnnotation('clear');
    annotateModal.style.display = "none";
    computeAll();
}

function buildFitList() {
    // build a list of fits that have been performed so that user can choose on to put on the graph
    if (annotateWhat == 0 || annotateWhat == 2) {
    	annotateWhat = 1;
    } else {
    	return;
    }
    var nFits = 0;
    var doneFits = 0;
    var alreadyAnnotated = false;
    for (var i = 0; i < 5; i++) {                            // loop over the 5 sheets to see if there is a fit assigned
	if (sheetFitTypes[i] != 'none') {
	    if (sheetAnnoteStatus[i] >= 0) {                       // if there is a fit assigned, loop over the annotation
		for (let j = 0; j < annotation.index; j++) { //   to see if this fit has already been annotated
		    if (annotation.isFit[j] == 'fit') {
			if (annotation.activeSheetNum[j] == i) {
			    alreadyAnnotated = true;
			}
		    }
		}
		if (!alreadyAnnotated) {                     // if not annotated, flag it as available to be annotated
		    sheetAnnoteStatus[i] = 1;
		    nFits = nFits + 1;
		} else {
		    alreadyAnnotated = false;               // otherwise just reset the flag
		}
	    } else if (sheetAnnoteStatus[i] < 0) {                // some possibly duplicative bookkeeping, but things are
		doneFits = doneFits + 1;                    //   working, so let's not break it
	    }
	}
    }
    if (nFits == 0) {
	if (doneFits > 0) {
	    document.getElementById("messageLine").innerHTML = "<b>All fits have already been added to the graph.</b>";
	} else {
	    document.getElementById('cancelAddNoteButton').value = 'Cancel';
	    document.getElementById("messageLine").innerHTML = "<b>There are no fits to display.</b>";
	    annotateWhat = 0;
	}
	return;
    } else if (nFits == 1) {
	var whichOne = 0;
	for (var i = 0; i < 5; i++) {
	    if (sheetAnnoteStatus[i] == 1) {
		whichOne = i;
	    }
	}
	addFitText(whichOne);
	return;
    } else {
	var list = document.getElementById('fitList');
	while (list.firstChild) {
	    list.removeChild(list.firstChild);
	}
	for (var i = 0; i < 5; i++) {
	    if (sheetAnnoteStatus[i] == 1) {
		var node = document.createElement('li');
		var sheetId = 'sht' + String(i);
		node.setAttribute('id', sheetId);
		var textnode = document.createTextNode("Sheet " + String(i+1));
		node.appendChild(textnode);
		list.appendChild(node);
		document.getElementById(sheetId).innerHTML = 'Sheet <span>'+ String(i+1)+ '</span>';
	    }
	}
	showFitList();
    }
}

function buildAnnotationList() {
    // build a list of all annotations added so user can delete or edit one
    if (annotateWhat != 0) {         // lock out edit button if we are doing something else already
	return;
    }
     if (annotation.index == 0) {    // there is nothing to edit:  return
	annotateWhat = 0;
	return;
     }
    annotateWhat = 16;
    var list = document.getElementById("annotationList");
    while (list.firstChild) {
	if (list.firstChild.id != null) {
	    var bigX = document.getElementById(list.firstChild.id);
	    while(bigX.firstChild) {
		bigX.removeChild(bigX.firstChild);
	    }
	}
	list.removeChild(list.firstChild);
    }
    for (var i = 0; i < annotation.index; i++) {
	var node = document.createElement("LI");
	var anId = "an" + String(i)
	node.setAttribute("id", anId);
	if (annotation.isFit[i] == "fit") {
	    var textnode = document.createTextNode("Fit");
	} else if(annotation.isFit[i] == "note") {
	    var textnode = document.createTextNode("Note");
	} else if (annotation.isFit[i] == "arrow") {
	    var textnode = document.createTextNode("Arrow");
	} else if (annotation.isFit[i] = "line") {
	    var textnode = document.createTextNode("Line");
	}
	node.appendChild(textnode);
	document.getElementById("annotationList").appendChild(node);
	var span = document.createElement("span");
	var spId = 'sp'+ String(i);
	span.setAttribute('id', spId);
	span.setAttribute('class', 'delAnnote');
	span.setAttribute('onclick', 'delOneNote("' + spId +'")');
	textnode = document.createTextNode('delete');
	span.appendChild(textnode);
	document.getElementById(anId).appendChild(span);
	document.getElementById(spId).innerHTML = '&times';
    }
    showEditList();
}

function modifyOneNote(idx) {
    // handle the editing a previously placed note
    if (deleteFlag) {
	deleteFlag = false;
	return;
    }
    document.getElementById('editDoneButton').value = 'Cancel';
    if (annotation.isFit[idx] == 'fit') {
	haveText = true;
	editWhich = idx;
	savedPoint.x = annotation.x[editWhich];
	savedPoint.y = annotation.y[editWhich];
	computeAll()
    } else if (annotation.isFit[idx] == 'note') {
	editWhich = idx;
	savedPoint.x = annotation.x[editWhich];
	savedPoint.y = annotation.y[editWhich];
	savedPoint.text = annotation.text[editWhich];
	document.getElementById("noteTextInput").value = annotation.text[idx];
	document.getElementById('messageLine').innerHTML = '<b>You can now edit and reposition this note.</b>'
	hideEditList();
	editNoteFlag = true;
	allButtonsGrey();
	buttonColor('note', 'normal');
    } else if (annotation.isFit[idx] == 'arrow') {
	editWhich = idx;
	savedPoint.x = annotation.x[editWhich];
	savedPoint.y = annotation.y[editWhich];
	savedPoint.tW = annotation.tWidth[editWhich];
	savedPoint.tH = annotation.tHeight[editWhich];
	addingArrow = true;
	arrowStarted = true;
	editArrowFlag = true;
	computeAll();
    }
}

function delOneNote(spId) {
    // delete a note from the graph
    deleteFlag = true;
    var idx = Number(spId.replace(/\D/g, ''));
    sheetAnnoteStatus[annotation.activeSheetNum[idx]] = 0;
    manageAnnotation('punchout', idx);
    computeAll();
    hideEditList();
    annotateWhat = 0;
    buildAnnotationList();
}

function handleEditing() {
    document.getElementById('editDoneButton').value = 'Done';
    if (haveText) {
	haveText = false;
	annotation.x[editWhich] = savedPoint.x;
	annotation.y[editWhich] = savedPoint.y;
	editWhich = -1;
	computeAll()
	return;
    } else if (addingArrow) {
	annotation.x[editWhich] = savedPoint.x;
	annotation.y[editWhich] = savedPoint.y;
	annotation.tWidth[editWhich] = savedPoint.tW;
	annotation.tHeight[editWhich] = savedPoint.tH;
	addingArrow = false;
	arrowStarted = false;
	editArrowFlag = false;
	editWhich = -1;
	computeAll();
	return;
    } else if (editNoteFlag) {
	editNoteFlag = false;
	editWhich = -1;
	return;
    }
    annotateWhat = 0;
    allButtonsNormal();
    hideEditList();
}

function drawAnnotation() {
    // function to actually place the annotation on the graph
    if (annotation.index <= 0) {
	manageAnnotation('clear');
	return;
    }
    if (haveText || addingArrow || addingLine) {
	document.getElementById("canvas1").style.cursor = 'none';
    } else {
	document.getElementById("canvas1").style.cursor = 'default';
    }
	
    for (var i=0; i<annotation.index; i++) {
	if (haveText && ((editWhich < 0 && i == annotation.index -1) || i == editWhich)) {
	    if (mouseX > plotParams.xAnnMin) {
		if (mouseX < plotParams.xBord+plotParams.xSize-annotation.tWidth[i]-10) {
		    annotation.x[i] = mouseX-5;
		} else {
		    annotation.x[i] = plotParams.xBord+plotParams.xSize-annotation.tWidth[i]-10;
		}
	    } else {
		annotation.x[i] = plotParams.xAnnMin;
	    }
	    if (mouseY > plotParams.yAnnMin) {
		if (mouseY < plotParams.yBord+plotParams.ySize-annotation.tHeight[i]-10) {
		    annotation.y[i] = mouseY-5;
		} else {
		    annotation.y[i] =  plotParams.yBord+plotParams.ySize-annotation.tHeight[i]-10;
		}
	    } else {
		annotation.y[i] = plotParams.yAnnMin;
	    }
	}
	if (i == annotation.index-1) {
	    if (!haveText && addingArrow && arrowStarted && (editWhich < 0)) {
		if (mouseX > plotParams.xBord && mouseX < plotParams.xBord+plotParams.xSize) {
		    if (mouseY > plotParams.yBord && mouseY < plotParams.yBord+plotParams.ySize) {
			annotation.tWidth[i] = mouseX;
			annotation.tHeight[i] = mouseY;
		    }
		}
	    } else if (!haveText && addingLine && lineStarted && (editWhich < 0)) {
		if (mouseX > plotParams.xBord && mouseX < plotParams.xBord+plotParams.xSize) {
		    if (mouseY > plotParams.yBord && mouseY < plotParams.yBord+plotParams.ySize) {
			annotation.tWidth[i] = mouseX;
			annotation.tHeight[i] = mouseY;
		    }
		}
	    }
	}
	if (annotation.isFit[i] == "fit") {                                     // remove annotation if fit has dchanged
	    if (sheetFitTypes[annotation.activeSheetNum[i]] != annotation.fitType[i]) {
		manageAnnotation('punchout', i);
		i = i - 1;
		continue;
	    }
	}
	if (annotation.isFit[i] == "fit") {
	    var fitText = annotation.text[i];
	    var lines = [];
	    var lineLengths = [];
	    var frontHalf = "";
	    var backHalf = fitText;  // fitText is a multi-line block of text
	    var foundOne = false;    // make it into an array of individual lines
	    var done = false;
	    while (!done) {
		var len = backHalf.length;
		var idx = backHalf.search("\n")
		if (idx >= 0) {
		    foundOne = true;
		    frontHalf = backHalf.substring(0, idx);
		    lines.push(frontHalf);
		    var parsedLine = parseText(frontHalf);
		    lineLengths.push(parsedTextLength(parsedLine, 'annote'));
		    backHalf = backHalf.substring(idx+1, len);
		} else {
		    lines.push(backHalf);
		    var parsedLine = parseText(backHalf);
		    lineLengths.push(parsedTextLength(parsedLine, 'annote'));
		    done = true;
		}
	    }
	    var xPos = annotation.x[i] + plotParams.annBord;
	    var yPos = annotation.y[i];
	    var blockWidth = Math.max(...lineLengths);
	    annotation.tWidth[i] = blockWidth + 2*plotParams.annBord;
	    annotation.tHeight[i] = lines.length*plotParams.annLinSpac + 2*plotParams.annBord;
	    ctx.clearRect(xPos, yPos, annotation.tWidth[i], annotation.tHeight[i]);
	    if (downloading) {
		ctx.fillStyle = "white";
	    } else {
		ctx.fillStyle = backgroundColor;
	    }
	    ctx.fillRect(xPos, yPos, annotation.tWidth[i], annotation.tHeight[i]);
	    xPos = xPos + plotParams.annBord;
	    yPos = yPos + 15 + plotParams.annBord;
	    for (var j=0; j<lines.length; j++) {
		placeParsedText(parseText(lines[j]), xPos, yPos+plotParams.annLinSpac*j, 'left', annotation.color[i], 'annote');
	    }
	} else if (annotation.isFit[i] == "note") {
	    var parsedNote = parseText(annotation.text[i]);
	    var noteLength = parsedTextLength(parsedNote, 'annote');
	    var subOffset = plotParams.aSO; 
	    var xPos = annotation.x[i];
	    var yPos = annotation.y[i];
	    annotation.tWidth[i] = noteLength + 2*plotParams.annBord;
	    annotation.tHeight[i] = plotParams.annLinSpac + 2*plotParams.annBord;
	    ctx.clearRect(xPos, yPos, annotation.tWidth[i], annotation.tHeight[i]);
	    if (downloading) {
		ctx.fillStyle = "white";
	    } else {
		ctx.fillStyle = backgroundColor;
	    }
	    ctx.fillRect(xPos, yPos, annotation.tWidth[i], annotation.tHeight[i]);
	    xPos = xPos + plotParams.annBord;
	    yPos = yPos + 15 + plotParams.annBord;
	    placeParsedText(parsedNote, xPos, yPos, 'left', annotation.color[i], 'annote');
	} else if (annotation.isFit[i] == "arrow") {
	    if (i == editWhich) {
		if (editArrowFlag) {
		    if (mouseX > plotParams.xBord && mouseX < plotParams.xBord+plotParams.xSize) {
			if (mouseY > plotParams.yBord && mouseY < plotParams.yBord+plotParams.ySize) {
			    annotation.x[editWhich] = mouseX;
			    annotation.y[editWhich] = mouseY;
			}
		    }
		} else {
		    if (mouseX > plotParams.xBord && mouseX < plotParams.xBord+plotParams.xSize) {
			if (mouseY > plotParams.yBord && mouseY < plotParams.yBord+plotParams.ySize) {
			    annotation.tWidth[editWhich] = mouseX;
			    annotation.tHeight[editWhich] = mouseY;
			}
		    }
		}
	    }
	    drawArrow(annotation.x[i], annotation.y[i], annotation.tWidth[i], annotation.tHeight[i], annotation.color[i], true, false);
	} else if (annotation.isFit[i] == "line") {
	    if (i == annotation.index-1 && lineStarted) {
		drawArrow(annotation.x[i], annotation.y[i], annotation.tWidth[i], annotation.tHeight[i], annotation.color[i], false, false);
	    } else {
		drawArrow(annotation.x[i], annotation.y[i], annotation.tWidth[i], annotation.tHeight[i], annotation.color[i], false, true);
	    }
	}
    }
}

function drawCrosshair() {
    // create/manage a crosshair cursor for more precise positioning of annotations
    if (haveText || addingArrow || addingLine || debug) {
	if ((mouseX > plotParams.xBord) && (mouseX < plotParams.xWidth) && (mouseY > plotParams.yBord) && (mouseY < plotParams.yWidth)) {
	    ctx.lineWidth = 1;
	    ctx.strokeStyle = "black";
	    ctx.beginPath();
	    ctx.moveTo(mouseX,plotParams.yBord)
	    ctx.lineTo(mouseX,plotParams.yWidth);
	    ctx.stroke();
	    ctx.beginPath();
	    ctx.moveTo(plotParams.xBord, mouseY);
	    ctx.lineTo(plotParams.xWidth, mouseY);
	    ctx.stroke();
	}
    }
    return;
}

// Subsection:  Annotation utilities ********************************************************************************************
//
function showFitList() {
    addFitModal.style.display = 'block';
}

function hideFitList(action) {
    if (action == 0) {
	annotateWhat = 0;
	allButtonsNormal();
    }	
    addFitModal.style.display = 'none';
}

function hideEditList() {
    editModal.style.display = 'none';
}

function showEditList() {
    editModal.style.display = 'block';
}

function hideAnnotate() {
    annotateModal.style.display = 'none';
    // clean up activities:  zero out sheetAnnoteStatus,
}

function buttonColor(which, color) {
    switch(which) {
    case('note'):
	var buttonId = 'addNoteButton';
	break;
    case('fit'):
	var buttonId = 'addFitButton';
	break;
    case('edit'):
	var buttonId = 'editAnnotationButton';
	break;
    case('arrow'):
	var buttonId = 'addArrowButton';
	break;
    case ('line'):
	var buttonId = 'manualLineButton';
	break;
    }
    switch(color) {
    case('grey'):
	document.getElementById(buttonId).style.backgroundColor = '#D0D0D0';
	document.getElementById(buttonId).style.color = '#A0A0A0';
	document.getElementById(buttonId).style.borderColor = '#A0A0A0';
	break;
    case ('normal'):
	document.getElementById(buttonId).style.backgroundColor = '#F0F0F0';
	document.getElementById(buttonId).style.color = '#4C6A94';
	document.getElementById(buttonId).style.borderColor = '#4C6A94';
	break;
    case('green'):
	document.getElementById(buttonId).style.backgroundColor = '#AADDAA';
	document.getElementById(buttonId).style.color = '#4C6A94';
	document.getElementById(buttonId).style.borderColor = '#4C6A94';
	break;
    }
}

function allButtonsNormal() {
    buttonColor('fit', 'normal');
    buttonColor('note', 'grey');
    buttonColor('arrow', 'normal');
    buttonColor('edit', 'normal');
    buttonColor('line', 'normal');
}

function allButtonsGrey() {
    buttonColor('fit', 'grey');
    buttonColor('note', 'grey');
    buttonColor('arrow', 'grey');
    buttonColor('edit', 'grey');
    buttonColor('line', 'grey');
}
    
function manageAnnotation(action, index, X, Y, what, textIn, activeSheetNum, fitType) {
    switch(action) {
    case 'clear':
	annotation.text = [];
	annotation.x = [];
	annotation.y = [];
	annotation.isFit = [];
	annotation.tWidth = [];
	annotation.tHeight = [];
	annotation.activeSheetNum = [];
	annotation.fitType = [];
	annotation.color = [];
	annotation.index = 0;
	break;
    case 'pop':
	annotation.text.pop();
	annotation.x.pop();
	annotation.y.pop();
	annotation.isFit.pop();
	annotation.tWidth.pop();
	annotation.tHeight.pop();
	annotation.activeSheetNum.pop();
	annotation.fitType.pop();
	annotation.color.pop();
	annotation.index = annotation.index - 1;
	break;
    case 'punchout':
	annotation.text.splice(index, 1);
	annotation.x.splice(index, 1);
	annotation.y.splice(index, 1);
	annotation.isFit.splice(index, 1);
	annotation.tWidth.splice(index, 1);
	annotation.tHeight.splice(index, 1);
	annotation.activeSheetNum.splice(index, 1);
	annotation.fitType.splice(index, 1);
	annotation.color.splice(index,1);
	annotation.index = annotation.index-1;
	break;
    case 'push':
	switch(what) {
	case 'arrow':
	    annotation.x.push(X);
	    annotation.y.push(Y);
	    annotation.text.push("");
	    annotation.isFit.push("arrow");
	    annotation.tWidth.push(X+10);
	    annotation.tHeight.push(Y+10);
	    annotation.activeSheetNum.push(0);
	    annotation.fitType.push(' ');
	    annotation.color.push('black');
	    annotation.index = annotation.index + 1;
	    break;
	case 'line':
	    annotation.x.push(X);
	    annotation.y.push(Y);
	    annotation.text.push("");
	    annotation.isFit.push("line");
	    annotation.tWidth.push(X+10);
	    annotation.tHeight.push(Y+10);
	    annotation.activeSheetNum.push(0);
	    annotation.fitType.push(' ');
	    annotation.color.push('black');
	    annotation.index = annotation.index + 1;
	    break;
	case 'note':
	    annotation.x.push(X);
	    annotation.y.push(Y);
	    annotation.text.push(textIn);
	    annotation.isFit.push("note");
	    annotation.tWidth.push(0);
	    annotation.tHeight.push(0);
	    annotation.activeSheetNum.push(0);
	    annotation.fitType.push(' ');
	    annotation.color.push('black')
	    annotation.index = annotation.index + 1;
	    break;
	case 'fit':
	    annotation.x.push(X);
	    annotation.y.push(Y);
	    annotation.text.push(textIn);
	    annotation.isFit.push("fit");
	    annotation.tWidth.push(0);
	    annotation.tHeight.push(0);
	    annotation.activeSheetNum.push(activeSheetNum);
	    annotation.fitType.push(fitType);
	    annotation.color.push('black');
	    annotation.index = annotation.index + 1;
	    break;   
	}
	break;
    }
}

function checkAnnLimits(mouseX, mouseY) {
    if (mouseX > plotParams.xAnnMin) {
	var X = mouseX; 
    } else {
	var X = plotParams.xAnnMin;
    }
    if (mouseY > plotParams.yAnnMin) {
	var Y = mouseY;
    } else {
	var Y = plotParams.yAnnMin;
    }
    var annXY = {x: X, y: Y};
    return annXY;
}

function drawArrow(xs,ys,xe,ye,color,isArrow,dashFlag) {
    // draws an arrow
    // xs and ys:  starting point, in pixels
    // xe and ye:  ending point, in pixels
    // lw:  width of the line, in pixels, used to draw arrow and arrowhead
    // color:  color of line:  2 = red, 3 = green, 4 = blue, , -1 = depends on cScale, all others = black
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
   if (isArrow) {
	var p = arrowHead(xs, ys, xe, ye, 12, 15);
	ctx.beginPath();
	ctx.moveTo(xe,ye);
	ctx.lineTo(p.xp1,p.yp1);
	ctx.lineTo(p.xp2,p.yp2);
	ctx.lineTo(xe,ye);
	ctx.stroke();
	ctx.fill();
    }
    if (!dashFlag) {
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.moveTo(xs,ys);
	ctx.lineTo(xe,ye);
	ctx.stroke();
    } else {	    
	var swapLength = 5;
	var em = (ye - ys)/(xe - xs);
	var line = true;
	ctx.beginPath();
	var xp = xs;
	var yp = ys;
	var oxp = xp;
	var oyp = yp;
	ctx.moveTo(xp, yp);
	length = 0;
	var done = false;
	while (!done) {
	    var xp = xp + .1;
	    var yp = (xp - xs) * em + ys;
	    if (xp >= plotParams.xBord && xp <= plotParams.xWidth && yp >= plotParams.yBord && yp <= plotParams.yWidth) {
		var length = length + Math.sqrt(Math.pow(xp-oxp,2) + Math.pow(yp-oyp,2));
		if (length > swapLength) {
		    if (line) {
			ctx.lineTo(xp, yp);
			line = false;
		    } else {
			ctx.moveTo(xp, yp);
			line = true;
		    }
		    length = 0;
		}
		oxp = xp;
		oyp = yp;
	    } else {
		done = true;
	    }
	}
	ctx.stroke();
    }
}

function arrowHead(xs, ys, xe, ye, angle, length) {
    // xs, ys, xe, ye:  start end of segment arrow is drawn on
    // the arrow is drawn at the end of the line
    var cosAlpha = Math.cos(angle*Math.PI/180);
    var sinAlpha = Math.sin(angle*Math.PI/180);
    var r = Math.sqrt((xe-xs)*(xe-xs) + (ye-ys)*(ye-ys));
    var cosTheta = (xe - xs)/r;
    var sinTheta = (ye - ys)/r;
    var xp1 = xe - length*(cosTheta*cosAlpha + sinTheta*sinAlpha);
    var yp1 = ye - length*(sinTheta*cosAlpha - cosTheta*sinAlpha);
    var xp2 = xe - length*(cosTheta*cosAlpha - sinTheta*sinAlpha);
    var yp2 = ye - length*(sinTheta*cosAlpha + cosTheta*sinAlpha);
    return {xp1: xp1, yp1: yp1, xp2: xp2, yp2: yp2};
}


// Section: Math ***************************************************************************************************************
//
function log10(num) {
    // Function to take the base 10 logarithm of a number
    var lb10 = Math.log(num)/Math.log(10);
    return lb10;
}

// Section: Saving and Recalling ***********************************************************************************************
// Functions related to saving and recalling graphs
//

window.onclick = function(event) {
    if (event.target == document.getElementById("mainContainer")) {
	closeSideModal();
    }
}

function saveGraph() {
    // for backward compatibility, fit types are saved as number, rather than text names
    // the relationship between the number and the name is arbitrary/random
    var fitNames = ['none', 'noRelation', 'exactProportion', 'proportional', 'linear', 'squareLaw', 'quadratic', 'inverse',
		    'inverseSquare', 'root', 'inverseRoot', 'powerLaw', 'expDecay'];
    var fitNumbers = [0, 11, 9, 6, 1, 2, 3, 4, 5, 10, 12, 7, 8];
    
    var graphName = document.getElementById("saveName").value;  // get the graph name
    if (graphName == "") {                                      // if there isn't a name...
	document.getElementById("noNameWarn").style.display = "block";	                        // ...warn the user...
	return -1                                               // ...and return
    }
    var nGraphs = getGraphs();      // Call the function to get the stored graphs            
    if (nGraphs < 0) {              // If true, there are no stored graphs
	graphList = "";             // So initalize a bunch of strings
	pointsList = "";
	xLabelList = "";
	xUnitList = "";
	yLabelList = "";
	yUnitList = "";
	titleList = "";
	xGraphDataList = "";
	yGraphDataList = "";
	xGraphErrList = "";
	yGraphErrList = "";
	fitsList = "";
	styleList = "";
	aTextList = "";
	aXList = "";
	aYList = "";
	aIsFitList = '';
	aTWList = '';
	aTHList = '';
	aWhichCurveList = '';
	aWhatFitList = '';
	aColorList = '';
	aNNotesList = '';
	localStorage.setItem('renewed', 'noNeed');   // since there are none saved, all saved graphs will be 'new' style
	nGraphs = 1;                                 // we are storing the current graph, so the new nGraphs is 1
    } else {                                         // here is where we start if there ARE already stored graphs
	var done = false;
	var j = 0;
	while (!done) {
	    if (graphName == graphs[j]) {  // check to see if a graph with this name already exists
		deleteGraph(j);
		nGraphs = nGraphs - 1;
		done = true;
	    } else {
		j = j + 1;
		if (j > nGraphs) {
		    done = true;
		}
	    }
	}
	nGraphs = nGraphs + 1;             // otherwise, increment the number of stored graphs
    }
    // this function is called directly from the HTML, so it does not have access to the data
    // so here we get the data
    var curves = ["A","B","C","D","E"]
    var npts = [0,0,0,0,0]
    var xdata = [];
    var ydata = [];
    var xerrs = [];
    var yerrs = [];
    npts[0] = countPoints('A');
    npts[1] = countPoints('B');
    npts[2] = countPoints('C');
    npts[3] = countPoints('D');
    npts[4] = countPoints('E');
    for (var i = 0; i < nSheets; i++) {
	var data = getData(curves[i]);                   // call to get the data from the spreadsheet
	xdata[i] = data.x;                               // separate it into arrays for x data and y data
	ydata[i] = data.y;
	xerrs[i] = data.xe;                              // and x and y error bars
	yerrs[i] = data.ye;
    }
    // Items that are 'one per save'
    localStorage.setItem("numGraphs", nGraphs.toString());  // put the number of stored graphs into local storage
    graphList = saveIt(document.getElementById("saveName").value, graphList, "graphs"); 
    xLabelList = saveIt(document.getElementById("xlabel").value, xLabelList, "xLabels");
    yLabelList = saveIt(document.getElementById("ylabel").value, yLabelList, "yLabels");
    xUnitList = saveIt(document.getElementById("xunit").value, xUnitList, "xUnits");
    yUnitList = saveIt(document.getElementById("yunit").value, yUnitList, "yUnits");
    titleList = saveIt(document.getElementById("plotTitle").value, titleList, "titles");
    styleList = saveIt('new', styleList, 'style');
    // Items that are per sheet, so possibly more than one per graph
    var nptext = '';
    var fitType = '';
    for (let i = 0; i< nSheets; i ++) {
	if (npts[i] > 0) {
	    nptext = nptext + curves[i] + String(npts[i]) + '|';
	    var fitTypeNumber = fitNumbers[fitNames.indexOf(sheetFitTypes[i])];
	    fitType = fitType + curves[i] + String(fitTypeNumber) + '|';
	}
    }
    pointsList = saveIt(nptext, pointsList, "points");
    fitsList = saveIt(fitType, fitsList, "fits");
    var xString = "";
    var yString = "";
    var xeString = "";
    var yeString = "";
    for (let j = 0; j<nSheets; j++) {  // loop over sheets
	if (npts[j] > 0) {
	    xString = xString + curves[j];
	    yString = yString + curves[j];
	    xeString = xeString + curves[j];
	    yeString = yeString + curves[j];
	    for (let i=0; i<npts[j]; i++) {  // loop over data points in a sheet
		xString = stringIt(xdata[j][i], xString);
		yString = stringIt(ydata[j][i], yString);
		xeString = stringIt(xerrs[j][i], xeString);
		yeString = stringIt(yerrs[j][i], yeString);
	    }
	    xString = xString + '|';
	    yString = yString + '|';
	    xeString = xeString + '|';
	    yeString = yeString + '|';
	}
    }
    xGraphDataList = saveIt(xString, xGraphDataList, "xData");
    yGraphDataList = saveIt(yString, yGraphDataList, "yData");
    xGraphErrList = saveIt(xeString, xGraphErrList, "xErrs");
    yGraphErrList = saveIt(yeString, yGraphErrList, "yErrs");

    // Annotation
    if (annotation.index > 0) {
	aNNotesList = saveIt(String(annotation.index), aNNotesList, 'nNotes');
	var aTextString = '';
	var aXString = '';
	var aYString = '';
	var aIsFitString = '';
	var aTWString = '';
	var aTHString = '';
	var aWhichCurveString = '';
	var aWhatFitString = '';
	var aColorString = '';
	for (var i = 0; i < annotation.index; i++) {
	    aTextString = aTextString + annotation.text[i] + '}}';
	    aXString = stringIt(annotation.x[i], aXString);
	    aYString = stringIt(annotation.y[i], aYString);
	    aIsFitString = aIsFitString + annotation.isFit[i] + ',';
	    aTWString = stringIt(annotation.tWidth[i], aTWString);
	    aTHString = stringIt(annotation.tHeight[i], aTHString);
	    aWhichCurveString = stringIt(annotation.activeSheetNum[i], aWhichCurveString);
	    aWhatFitString = stringIt(annotation.fitType[i], aWhatFitString);
	    aColorString = aColorString + annotation.color[i] + ',';
	}
	aTextList = saveIt(aTextString, aTextList, 'aText');
	aXList = saveIt(aXString, aXList, 'aX');
	aYList = saveIt(aYString, aYList, 'aY');
	aIsFitList = saveIt(aIsFitString, aIsFitList, 'aIsFit');
	aTWList = saveIt(aTWString, aTWList, 'aTW');
	aTHList = saveIt(aTHString, aTHList, 'aTH');
	aWhichCurveList = saveIt(aWhichCurveString, aWhichCurveList, 'aWhichCurve');
	aWhatFitList = saveIt(aWhatFitString, aWhatFitList, 'aWhatFit');
	aColorList = saveIt(aColorString, aColorList, 'aColor');
    } else {
	// graph has no annotation, so we fill the lists with placeholders
	aNNotesList = saveIt('0,', aNNotesList, 'nNotes');
//	aTextList = saveIt('none}}', aTextList, 'aText');
	aTextList = saveIt('none', aTextList, 'aText');
	aXList = saveIt('0,', aXList, 'aX');
	aYList = saveIt('0,', aYList, 'aY');
	aIsFitList = saveIt('none,', aIsFitList, 'aIsFit');
	aTWList = saveIt('0,', aTWList, 'aTW');
	aTHList = saveIt('0,', aTHList, 'aTH');
	aWhichCurveList = saveIt('0,', aWhichCurveList, 'aWhichCurve');
	aWhatFitList = saveIt('0,', aWhatFitList, 'aWhatFit');
	aColorList = saveIt('none,', aColorList, 'aColor');
    }
    var confirmMessage = "Graph and annotation saved as </br>" + graphName;
    document.getElementById("saveMessage").innerHTML = confirmMessage;
    document.getElementById("saveConfirm").style.display = "block";
    setTimeout(closeSaveConfirm, 2000);
    function closeSaveConfirm() {
	document.getElementById("saveConfirm").style.display = "none";
    }
    return 0;

    function saveIt(item, list, key) {
	list = item + "//" + list;
	localStorage.setItem(key, list);
	return list;
    }
    
    function stringIt(item, string) {
	if (!item) {
	    item = 0;
	}
	string = string + item.toString() + ",";
	return string;
    }
}

function showSavedGraphs() {
    // iPad edition: the side panel now always opens (it also holds the Save to File / Open File buttons), and each
    //   saved graph has its own delete control so a shift key is not needed.
    nGraphs = getGraphs();
    var list = document.getElementById("savedGraphList");
    while (list.firstChild) {
	list.removeChild(list.firstChild);
    }
    if (nGraphs <= 0) {
	nGraphs = 0;
	var empty = document.createElement("P");
	empty.className = 'noSavedGraphs';
	empty.textContent = 'No graphs saved in this browser yet.';
	list.appendChild(empty);
    }
    for (var i=0; i<nGraphs; i++) {
	var node = document.createElement("LI");
	node.dataset.name = graphs[i];
	var nameSpan = document.createElement("SPAN");
	nameSpan.className = 'savedGraphName';
	nameSpan.textContent = graphs[i];
	node.appendChild(nameSpan);
	var delSpan = document.createElement("SPAN");
	delSpan.className = 'delGraph';
	delSpan.title = 'Delete this saved graph';
	delSpan.innerHTML = '&times;';
	node.appendChild(delSpan);
	list.appendChild(node);
    }
    document.getElementById("recallSavedGraphModal").style.width = "250px";
    document.getElementById("mainContainer").style.marginLeft = "250px";
}

function showDialog(gName) {
    savedName = gName;
    var npts = countPoints("A") +  countPoints("B") +  countPoints("C") +  countPoints("D") +  countPoints("E");
    if (npts == 0 || thereIsNoGraph) {
	showGraph(gName);
    } else {
	document.getElementById("recallDialog").style.display = "block";
    }
}

function proceedWithRecall() {
    var gName = savedName;
    document.getElementById("recallDialog").style.display = "none";
    if (pendingImport) {                  // iPad edition: the dialog is also used when opening a graph file
	var graphData = pendingImport;
	pendingImport = null;
	applyImportedGraph(graphData);
	return;
    }
    showGraph(gName);
}

function cancelRecall() {
    savedName = '';
    pendingImport = null;
    // iPad edition bug fix: this used to refer to a non-existent element "recallConfirm", which threw an error
    //   and left the dialog stuck on screen.
    document.getElementById("recallDialog").style.display = "none";
}

function showGraph(gName) {
    var sheets = ['A', 'B', 'C', 'D', 'E'];
    var fitNames = ['none', 'noRelation', 'exactProportion', 'proportional', 'linear', 'squareLaw', 'quadratic', 'inverse',
		    'inverseSquare', 'root', 'inverseRoot', 'powerLaw', 'expDecay'];
    var fitNumbers = [0, 11, 9, 6, 1, 2, 3, 4, 5, 10, 12, 7, 8];
    closeSideModal();            // close the list of saved graphs
    var done = false;
    var i = -1;
    while (!done) {
	i = i + 1;
	if (graphs[i] == gName) {
	    var showNum = i;
	    done = true;
	}
    }
    clearAllData();
    document.getElementById("xlabel").value = xLabs[showNum];
    document.getElementById("ylabel").value = yLabs[showNum];
    document.getElementById("xunit").value = xUnits[showNum];
    document.getElementById("yunit").value = yUnits[showNum];
    document.getElementById("plotTitle").value = titles[showNum];

    var firstSheet = -1;
    for (let j = 0; j < nSheets; j++) {
	if (points[showNum][j] > 0) {
	    if (firstSheet < 0) {
		firstSheet = j;
	    }
	    for (let k = 0; k < points[showNum][j]; k++) {
		var xid = 'A' + sheets[j] + String(k + 1);
		sessionStorage[xid] = xData[showNum][j][k];
		var yid = 'B' + sheets[j] + String(k + 1);
		sessionStorage[yid] = yData[showNum][j][k];
		var exid = 'C' + sheets[j] + String(k + 1);
		if (xErrs[showNum][j][k] == 0) {
		    sessionStorage[exid] = "";
		} else {
		    sessionStorage[exid] = xErrs[showNum][j][k];
		}
		var eyid = 'D' + sheets[j] + String(k + 1);
		if (yErrs[showNum][j][k] == 0) {
		    sessionStorage[eyid] = "";
		} else {
		    sessionStorage[eyid] = yErrs[showNum][j][k];
		}
	    }
	    var oldFitNumber = fits[showNum][j];
	    sheetFitTypes[j] = fitNames[fitNumbers.indexOf(oldFitNumber)];
	}
    }
    activeSheet = sheets[firstSheet];
    setSheet(activeSheet);
    var firstSheetFitNumber = fits[showNum][firstSheet];
    sheetFitTypes[firstSheet] = fitNames[fitNumbers.indexOf(firstSheetFitNumber)];
    annotation.text = recalledAnnotation.text[showNum];
    annotation.x = recalledAnnotation.x[showNum];
    annotation.y = recalledAnnotation.y[showNum];
    annotation.isFit = recalledAnnotation.isFit[showNum];
    annotation.tWidth = recalledAnnotation.tWidth[showNum];
    annotation.tHeight = recalledAnnotation.tHeight[showNum];
    annotation.activeSheetNum = recalledAnnotation.activeSheetNum[showNum];
    annotation.fitType = recalledAnnotation.fitType[showNum];
    annotation.color = recalledAnnotation.color[showNum];
    annotation.index = recalledAnnotation.index[showNum];
    computeAll();
}

function getGraphs() {
    // function to read in all the locally saved graphs
    var nGraphString = localStorage.getItem("numGraphs");
    if (nGraphString == null) {
	// no saved graphs
	var nGraphs = 0;
	return -1
    }
    nGraphs = Number(nGraphString);
    checkGraphStyle(nGraphs);

    graphList = localStorage.getItem('graphs');
    graphs = getAlpha(graphList);

    getTextItems(nGraphs);
    getNumericItems();
    getDataItems();

    recalledAnnotation = getAnnotation();
    return nGraphs;
    // **********  end of main function getGraphs()  ************************************************************
    
    function getTextItems(nGraphs) {
	styleList = localStorage.getItem('style');
	styles = getAlpha(styleList, nGraphs);
	xLabelList = localStorage.getItem('xLabels');
	xLabs = getAlpha(xLabelList, nGraphs);
	xUnitList = localStorage.getItem('xUnits');
	xUnits = getAlpha(xUnitList, nGraphs);
	yLabelList = localStorage.getItem('yLabels');
	yLabs = getAlpha(yLabelList, nGraphs);
	yUnitList = localStorage.getItem('yUnits');
	yUnits = getAlpha(yUnitList, nGraphs);
	titleList = localStorage.getItem('titles');
	titles = getAlpha(titleList, nGraphs);
    }

    function getNumericItems() {
	pointsList = localStorage.getItem('points');
	points = getNum(styles, pointsList);
	fitsList = localStorage.getItem('fits');
	fits = getNum(styles, fitsList);
    }

    function getDataItems() {
	xGraphDataList = localStorage.getItem('xData');
	xData = getData(styles, xGraphDataList);
	yGraphDataList = localStorage.getItem('yData');
	yData = getData(styles, yGraphDataList);
	xGraphErrList = localStorage.getItem('xErrs');
	xErrs = getData(styles, xGraphErrList);
	yGraphErrList = localStorage.getItem('yErrs');
	yErrs = getData(styles, yGraphErrList);
    }
	
    function getAlpha(inString, nGraphs) {
	if (inString == null) {
	    inString = '';
	    for (let i = 0; i < nGraphs; i++) {
		inString = inString + ' //';
	    }
	}
	var alphaArray = parseStringIntoArray(inString, '//', false);
	return alphaArray;
    }
    
    function getNum(styles, inString) {
	// get numeric items that could be more than one per graph
	var numArray = [];
	var tempArray = [];
	tempArray = parseStringIntoArray(inString, '//', false);  // array of strings, one per graph
	for (let i = 0; i < tempArray.length; i++) {
	    var sheetArray = [0,0,0,0,0];
	    if (styles[i] == 'old') {
		sheetArray[0] = Number(tempArray[i]);
	    } else {
		var tempArray2 = [];
		tempArray2 = parseStringIntoArray(tempArray[i], '|', false); // array of strings, one per (populated) sheet
		for (let j = 0; j < tempArray2.length; j++) {
		    var idx = tempArray2[j].split('', 1)[0].charCodeAt(0) - 65; // get sheet index
		    sheetArray[idx] = Number(tempArray2[j].substring(1));       // rest of array entry is the number
		}
	    }
	    numArray.push(sheetArray);  
	}
	return numArray;
    }
			    
    function getData(styles, inString) {
	// clean up parsing in this routine
	var dataArray = [];
	var tempArray = parseStringIntoArray(inString, '//', false);  // array of strings, one per graph
	for (let i = 0; i < tempArray.length; i++) {
	    var sheetArray = [NaN,NaN,NaN,NaN,NaN];
	    if (styles[i] == 'old') {
		sheetArray[0] = parseStringIntoArray(tempArray[i], ',', false);  // array of "numbers" = sole data set in old style
	    } else {
		var tempArray2 = parseStringIntoArray(tempArray[i], '|', false);  // array of strings, one per sheet
		for (let j = 0; j < tempArray2.length; j++) {
		    var idx = tempArray2[j].split('', 1)[0].charCodeAt(0) - 65;  // get sheet index
		    sheetArray[idx] = parseStringIntoArray(tempArray2[j].substring(1), ',', false);  // array of "numbers" = one data set
		}
	    }
	    dataArray.push(sheetArray);
	}
	return dataArray;
    }
	
    function getAnnotation() {
	aNNotesList = localStorage.getItem('nNotes');
	var nNotes = parseStringIntoArray(aNNotesList, '//', true);       //array: one # per graph
	aTextList = localStorage.getItem('aText');
	var tempArray = parseStringIntoArray(aTextList, '//', false);    //array: one string element per graph
	var aTexts = parseArrayIntoArray(tempArray, '}}', false);
	aXList = localStorage.getItem('aX');
	tempArray = parseStringIntoArray(aXList, '//', false);
	var aXs = parseArrayIntoArray(tempArray, ',', true);
	var nullTest = aXs.indexOf(null);
	aYList = localStorage.getItem('aY');
	tempArray = parseStringIntoArray(aYList, '//', false);
	var aYs = parseArrayIntoArray(tempArray, ',', true);
	aIsFitList = localStorage.getItem('aIsFit');
	tempArray = parseStringIntoArray(aIsFitList, '//', false);
	var aIsFits = parseArrayIntoArray(tempArray, ',', false);
	aTWList = localStorage.getItem('aTW');
	tempArray = parseStringIntoArray(aTWList, '//', false);
	var aTWs = parseArrayIntoArray(tempArray, ',', true);
	aTHList = localStorage.getItem('aTH');
	tempArray = parseStringIntoArray(aTHList, '//', false);
	var aTHs = parseArrayIntoArray(tempArray, ',', true);
	aWhichCurveList = localStorage.getItem('aWhichCurve');
	tempArray = parseStringIntoArray(aWhichCurveList, '//', false);
	var aWhichCurves = parseArrayIntoArray(tempArray, ',', true);
	debug = true;
	aWhatFitList = localStorage.getItem('aWhatFit');
	tempArray = parseStringIntoArray(aWhatFitList, '//', false);
	var aWhatFits = parseArrayIntoArray(tempArray, ',', true);
	debug = false;
	aColorList = localStorage.getItem('aColor');
	tempArray = parseStringIntoArray(aColorList, '//', false);
	var aColors = parseArrayIntoArray(tempArray, ',', false);
	return {text: aTexts, x: aXs, y: aYs, isFit: aIsFits, tWidth: aTWs, tHeight: aTHs,
		activeSheetNum: aWhichCurves, fitType: aWhatFits, color: aColors, index: nNotes}; 
    }

    function parseStringIntoArray(inputString, separator, numeric) {
	var advance = separator.length;
	var parsed = false;
	var kstart = 0;
	var returnArray = [];
	while (!parsed) {
	    var kend = inputString.indexOf(separator, kstart);
	    if (kend < 0) {
		parsed = true;
	    } else {
		if (numeric) {
		    var tempString1 = inputString.slice(kstart, kend);
		    var tempString2 = tempString1.replace(/,/g,"");
		    if (isNaN(Number(tempString2))) {
			returnArray.push(tempString2);
		    } else {
			returnArray.push(Number(tempString2));
		    }
		} else {
		    returnArray.push(inputString.slice(kstart, kend));
		}
		kstart = kend + advance;
	    }
	}
	return returnArray;
    }

    function parseArrayIntoArray(inputArray, separator, numeric) {
	var arrayArray = []
	for (let i = 0; i < inputArray.length; i++ ) {
	    arrayArray.push(parseStringIntoArray(inputArray[i], separator, numeric));
	}
	return arrayArray;
    }
		
    function checkGraphStyle(nGraphs) {
	var renewed = localStorage.getItem('renewed');
	if (renewed == 'yes' || renewed == 'noNeed') {
	    return;
	} else {
	    // need to create a style list and dummy anotation for previously saved graphs
	    localStorage.setItem('renewed', 'yes');
	    styleList = '';
	    aNNotesList = '';
	    aTextList = '';
	    aXList = '';
	    aYList = '';
	    aIsFitList = '';
	    aTWList = '';
	    aTHList = '';
	    aWhichCurveList = '';
	    aWhatFitList = '';
	    aColorList = '';
	    for (i = 0; i < nGraphs; i++) {
		styleList = styleList + 'old//';
		aNNotesList = aNNotesList + '0//';
		aTextList = aTextList + '</none/>//';
		aXList = aXList + '0//';
		aYList = aYList + '0//';
		aIsFitList = aIsFitList + 'none//';
		aTWList = aTWList + '0//';
		aTHList = aTHList + '0//';
		aWhichCurveList = aWhichCurveList + '0//';
		aWhatFitList = aWhatFitList + '0//';
		aColorList = aColorList + 'none//';
	    }
	    localStorage.setItem('style', styleList);
	    localStorage.setItem('nNotes', aNNotesList);
	    localStorage.setItem('aText', aTextList);
	    localStorage.setItem('aX', aXList);
	    localStorage.setItem('aY', aYList);
	    localStorage.setItem('aIsFit', aIsFitList);
	    localStorage.setItem('aTW', aTWList);
	    localStorage.setItem('aTH', aTHList);
	    localStorage.setItem('aWhichCurve', aWhichCurveList);
	    localStorage.setItem('aWhatFit', aWhatFitList);
	    localStorage.setItem('aColor', aColorList);
	}
    }
}
    
function removeGraph(gName) {
    // function called when user is purposely deleting an item from storage
    closeSideModal();
   
    var done = false;
    var i = -1;
    while (!done) {  //find the number of the graph to be deleted
	i = i + 1;
	if (graphs[i] == gName) {
	    var showNum = i;
	    done = true;
	}
    }
    deleteGraph(showNum);  // delete the graph from the in-memory (local) lists
    nGraphs = nGraphs - 1; // decrement the number of graphs we think we have

    // copy the local lists into storage
    localStorage.setItem("numGraphs", nGraphs.toString());    // put the number of stored graphs into local storage
    graphList = saveList(graphList, "graphs");        // strings of graph data we retrieved from storage, going back in
    pointsList = saveList(pointsList, "points");
    xLabelList = saveList(xLabelList, "xLabels");
    yLabelList = saveList(yLabelList, "yLabels");
    xUnitList = saveList(xUnitList, "xUnits");
    yUnitList = saveList(yUnitList, "yUnits");
    titleList = saveList(titleList, "titles");
    fitsList = saveList(fitsList, "fits");
    xGraphDataList = saveList(xGraphDataList, "xData")
    yGraphDataList = saveList(yGraphDataList, "yData")
    xGraphErrList = saveList(xGraphErrList, "xErrs")
    yGraphErrList = saveList(yGraphErrList, "yErrs")
    styleList = saveList(styleList, 'style');
    aTextList = saveList(aTextList, 'aText');
    aXList = saveList(aXList, 'aX');
    aYList = saveList(aYList, 'aY');
    aIsFitList = saveList(aIsFitList, 'aIsFit');
    aTWList = saveList(aTWList, 'aTW');
    aTHList = saveList(aTHList, 'aTH');
    aWhichCurveList = saveList(aWhichCurveList, 'aWhichCurve');
    aWhatFitList = saveList(aWhatFitList, 'aWhatFit');
    aColorList = saveList(aColorList, 'aColor');
    aNNotesList = saveList(aNNotesList, 'nNotes');
    return 0;

    function saveList(list, key) {
	localStorage.setItem(key, list);
	return 0;
    }

}

function deleteGraph(numToDelete) {
    // called when we need to remove a graph from the in-memory version of the saved graphs
    // does not actually affect the localStorage version.
    graphList = punchOut(numToDelete, graphList);
    pointsList = punchOut(numToDelete, pointsList);
    xLabelList = punchOut(numToDelete, xLabelList);
    xUnitList = punchOut(numToDelete, xUnitList);
    yLabelList = punchOut(numToDelete, yLabelList);
    yUnitList = punchOut(numToDelete, yUnitList);
    titleList = punchOut(numToDelete, titleList);
    fitsList = punchOut(numToDelete, fitsList);
    xGraphDataList = punchOut(numToDelete, xGraphDataList);
    yGraphDataList = punchOut(numToDelete, yGraphDataList);
    xGraphErrList = punchOut(numToDelete, xGraphErrList);
    yGraphErrList = punchOut(numToDelete, yGraphErrList);
    styleList = punchOut(numToDelete, styleList);
    aTextList = punchOut(numToDelete, aTextList);
    aXList = punchOut(numToDelete, aXList);
    aYList = punchOut(numToDelete, aYList);
    aIsFitList = punchOut(numToDelete, aIsFitList);
    aTWList = punchOut(numToDelete, aTWList);
    aTHList = punchOut(numToDelete, aTHList);
    aWhichCurveList = punchOut(numToDelete, aWhichCurveList);
    aWhatFitList = punchOut(numToDelete, aWhatFitList);
    aColorList = punchOut(numToDelete, aColorList);
    aNNotesList = punchOut(numToDelete, aNNotesList);
    
    function punchOut(numToDelete, graphString) {
	var done = false;
	var nread = 0;
	var istart = 0;
	var newString = "";
	while (!done) {
	    var iend = graphString.indexOf('//', istart)
	    if (iend < 0) {
		done = true;
	    } else {
		if (nread != numToDelete) {
		    newString = newString + graphString.slice(istart, iend) + "//";
		}
		nread = nread + 1;
		istart = iend + 2;
	    }
	}
	return newString;
    }
}

/* Set the width of the side navigation to 0 and the left margin of the page content to 0 */
function closeSideModal() {
    document.getElementById("recallSavedGraphModal").style.width = "0";
    document.getElementById("mainContainer").style.marginLeft = "0";
}

// Section:  Downloading  ******************************************************************************************************
// Functions for downloading the graph as a png image and providing fit results in a text file
//
function downloadGraph(openInTab) {
    // copy graph to clipboard, open it in a new tab, or download a png file
    if (thereIsNoGraph) {
	return;
    }
    downloading = true;
    computeAll();
    if (openInTab) {                                     // graph opens in a new tab
	const newImg = canvas1.toDataURL('image/png');   // make a png image from the canvas
	const newWin = window.open();                    // open a new tab an write some HTML code into it
	newWin.document.write('<html><title>myGraph</title><center><img src="'+newImg+'" width="450" height="422"></center></html>');
	newWin.document.close();
    } else {
	if (yesDownload) {                               // graph is downloaded as a png file
	    let anchor = document.createElement("a");
	    var downloadName = buildName(xLabelText, yLabelText);
	    anchor.download = downloadName;
	    anchor.href = canvas1.toDataURL("image/png");
	    anchor.click();
	    anchor.remove();
	    if (includeFit) {
		downloadFit();
	    }
	} else {
	    // iPad edition: Safari only allows a clipboard write that starts *during* the tap/click.  The old code
	    //   waited for toBlob() to finish first, so Safari refused it.  Now the ClipboardItem is created right away
	    //   and handed a promise for the image.  If the clipboard still refuses, the graph is shown in a pop-up
	    //   where it can be pressed-and-held to copy or save it.
	    const graphURL = canvas1.toDataURL('image/png');
	    const blobPromise = new Promise((resolve) => canvas1.toBlob(resolve, 'image/png'));
	    const showClipConfirm = () => {
		document.getElementById("clipConfirm").style.display = "block";
		setTimeout(function() {
		    document.getElementById("clipConfirm").style.display = "none";
		}, 2000);
	    };
	    const clipFallback = (err) => {
		console.log('error writing to clipboard', err);
		showGraphImage(graphURL);
	    };
	    try {
		if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
		    throw new Error('clipboard not available');
		}
		navigator.clipboard.write([new ClipboardItem({'image/png': blobPromise})]).then(showClipConfirm, () => {
		    // some browsers do not accept a promise inside ClipboardItem: retry with the finished blob
		    blobPromise.then((blob) => navigator.clipboard.write([new ClipboardItem({[blob.type]: blob})]))
			.then(showClipConfirm, clipFallback);
		});
	    } catch (err) {
		clipFallback(err);
	    }
	}
    }
    downloading = false;
    computeAll();
}

function downloadFit() {
    // create and download small file containg the fit results as plain text
    var blankLine = '\n\n';
    var downloadText ='';
    if (sheetFitTypes[0] != 'none' && sheetFitTypes[0] != 'exactProportion') {
	downloadText = downloadText + 'Curve 1:\n' + fitDownload[0] + blankLine;
    }
    if (sheetFitTypes[1] != 'none' && sheetFitTypes[1] != 'exactProportion') {
	downloadText = downloadText + 'Curve 2:\n' + fitDownload[1] + blankLine;
    }
    if (sheetFitTypes[2] != 'none' && sheetFitTypes[2] != 'exactProportion') {
	downloadText = downloadText + 'Curve 3:\n' + fitDownload[2] + blankLine;
    }
    if (sheetFitTypes[3] != 'none' && sheetFitTypes[3] != 'exactProportion') {
	downloadText = downloadText + 'Curve 4:\n' + fitDownload[3] + blankLine;
    }
    if (sheetFitTypes[4] != 'none' && sheetFitTypes[4] != 'exactProportion') {
	downloadText = downloadText + 'Curve 5:\n' + fitDownload[4] + blankLine;
    }
    var blob = new Blob([downloadText], {type: 'text/csv'});
    if(window.navigator.msSaveOrOpenBlob) {                   // special for Windows Navigator
        window.navigator.msSaveBlob(blob, "fit.txt");
    } else {                                                  // otherwise, and actual browser
        var elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = "fit.txt";        
        document.body.appendChild(elem);
        elem.click();        
        document.body.removeChild(elem);
    }
}

function buildName(xText, yText) {
    // create a file name from the x and y axis titles
    xText = xText.split(' ').join('_');
    yText = yText.split(' ').join('_');
    xText = xText.split('\\').join('');
    yText = yText.split('\\').join('');
    xText = xText.split('{').join('');
    yText = yText.split('{').join('');
    xText = xText.split('}').join('');
    yText = yText.split('}').join('');
    var dlName = yText + '_vs_' + xText;
    return dlName;
}

//Section:  Greek **************************************************************************************************************
// Functions for inserting Greek characters and other symbols, and for handling super- and sub-scripts.
//
function subParse(inString) {
    // This function scans the input string for subscripts, which are delimted by _{ and } (a la TeX)
    // It returns an array of objects.  Each object consists of a string and a flag which indicates if the string
    //     is a subscript or not
    var parsedArray = [];
    var frontHalf = "";
    var backHalf = inString;
    var done = false;
    var foundOne = false;
    while (!done) {
	var len = backHalf.length;
	var idx = backHalf.search("_{");
	if (idx >= 0) {
	    foundOne = true;
	    frontHalf = backHalf.substring(0, idx);    // frontHalf is everything before _{
	    frontHalf = doGreek(frontHalf);                // check front half for Greek and superscripts
	    var outString = {str: frontHalf, sub: false};  // This part of the string is not a subscript, 
	    parsedArray.push(outString);                   //  so add it to output array
	    backHalf = backHalf.substring(idx+2, len)      // backHalf is now rest of input after _{
	    len = backHalf.len;
	    idx = backHalf.search("}");
	    if (idx >= 0) {
		frontHalf = backHalf.substring(0, idx);    // frontHalf is the text to be subsripted
		frontHalf = doGreek(frontHalf);            // check subscript for Greek
		var outString = {str: frontHalf, sub: true};
		parsedArray.push(outString);
		backHalf = backHalf.substring(idx+1, len);
		len = backHalf.length;
		if (len <= 0) {
		    return parsedArray;
		}
	    } else {
		// subscript is not closed.  Scrap the whole effort
		parsedArray = [];
		var outString = {str: inString, sub: false};
		parsedArray.push(outString);
		return parsedArray;
	    }
	} else {
	    if (!foundOne) {
		inString = doGreek(inString);
		var outString = {str: inString, sub: false};
		parsedArray.push(outString);
	    } else {
		backHalf = doGreek(backHalf);
		var outString = {str: backHalf, sub: false};
		parsedArray.push(outString);
	    }
	    return parsedArray;
	}
    }
}

function fillGreek() {
    // called when program loads.  It is just an array with unicode symbols for Greek characters.
    greekArray.push({"greek": 'Delta', "code": '\u0394', "len": 5});
    greekArray.push({"greek": 'Theta', "code": '\u0398', "len": 5});
    greekArray.push({"greek": 'Lambda', "code": '\u039b', "len": 6});
    greekArray.push({"greek": 'Xi', "code": '\u039e', "len": 2});
    greekArray.push({"greek": 'Pi', "code": '\u03a0', "len": 2});
    greekArray.push({"greek": 'Sigma', "code": '\u03a3', "len": 5});
    greekArray.push({"greek": 'Phi', "code": '\u03a6', "len": 3});
    greekArray.push({"greek": 'Psi', "code": '\u03a8', "len": 3});
    greekArray.push({"greek": 'Omega', "code": '\u03a9', "len": 5});
    greekArray.push({"greek": 'alpha', "code": '\ud835\udefc', "len": 5});
    greekArray.push({"greek": 'beta', "code": '\ud835\udefd', "len": 4});
    greekArray.push({"greek": 'gamma', "code": '\ud835\udefe', "len": 5});
    greekArray.push({"greek": 'delta', "code": '\ud835\udeff', "len": 5});
    greekArray.push({"greek": 'epsilon', "code": '\ud835\udf00', "len": 7});
    greekArray.push({"greek": 'zeta', "code": '\ud835\udf01', "len": 4});
    greekArray.push({"greek": 'theta', "code": '\ud835\udf03', "len": 5});
    greekArray.push({"greek": 'eta', "code": '\ud835\udf02', "len": 3});
    greekArray.push({"greek": 'iota', "code": '\ud835\udf04', "len": 4});
    greekArray.push({"greek": 'kappa', "code": '\ud835\udf05', "len": 5});
    greekArray.push({"greek": 'lambda', "code": '\ud835\udf06', "len": 6});
    greekArray.push({"greek": 'mu', "code": '\ud835\udf07', "len": 2});
    greekArray.push({"greek": 'nu', "code": '\ud835\udf08', "len": 2});
    greekArray.push({"greek": 'xi', "code": '\ud835\udf09', "len": 2});
    greekArray.push({"greek": 'omicron', "code": '\ud835\udf0a', "len": 7});
    greekArray.push({"greek": 'pi', "code": '\ud835\udf0b', "len": 2});
    greekArray.push({"greek": 'rho', "code": '\ud835\udf0c', "len": 3});
    greekArray.push({"greek": 'sigma', "code": '\ud835\udf0e', "len": 5});
    greekArray.push({"greek": 'tau', "code": '\ud835\udf0f', "len": 3});
    greekArray.push({"greek": 'upsilon', "code": '\ud835\udf10', "len": 7});
    greekArray.push({"greek": 'phi', "code": '\ud835\udf11', "len": 3});
    greekArray.push({"greek": 'chi', "code": '\ud835\udf12', "len": 3});
    greekArray.push({"greek": 'psi', "code": '\ud835\udf13', "len": 3});
    greekArray.push({"greek": 'omega', "code": '\ud835\udf14', "len": 5});
    greekArray.push({"greek": 'deg', "code": '\u00b0', "len": 3});
    greekArray.push({"greek": 'times', "code": '\u00d7', "len": 5});
    greekArray.push({"greek": 'sqrt', "code": '\u221a', "len": 4});
    greekArray.push({"greek": 'pm', "code": '\u00b1', "len": 2});
    greekArray.push({"greek": 'ell', "code": '\u2113', "len": 3});
}	

function ucod(nchar) {
    // unicode for numerical superscripts
    if (nchar == "0") {
	var ret = "\u2070";
    }else if (nchar == "1") {
	var ret = "\u00B9";
    }else if (nchar == "2") {
	var ret = "\u00B2";
    }else if (nchar == "3") {
	var ret = "\u00B3";
    }else if (nchar == "4") {
	var ret = "\u2074";
    }else if (nchar == "5") {
	var ret = "\u2075";
    }else if (nchar == "6") {
	var ret = "\u2076";
    }else if (nchar == "7") {
	var ret = "\u2077";
    }else if (nchar == "8") {
	var ret = "\u2078";
    }else if (nchar == "9") {
	var ret = "\u2079";
    }else if (nchar == "+") {
	var ret = "\u207A";
    }else if (nchar == "-") {
	var ret = "\u207B";
    } else {
	var ret = "bad";
    }
    return ret;
}
//Section:  Fitting ************************************************************************************************************
//
//  Functions for fitting data
//
//  These functions are adapted from Press, Teukolsky, et al., Numerical Recipes (referred to as NR below).
//    If you really want to know what's up with these, you should refer to that book.  Only stuff specific
//    to this implementation is included here.  Be careful.  Because of JavaScript limitations, and the
//    truly funky approach to arrays, this edifice might be a bit unstable...
//
//  nPot offers eleven canned fits.  All but two of them are linear (including a simple average). Two are nonlinear.
//
//  We have a SINGLE linear fitting function:  a0*x^2 + a1*x + a2 + a3/x + a4/x^2 + a5*x^0.5 + a6/x^0.5.  The NR routines have a
//    clever trick.  Which function we actually fit to is controlled by an array called ia.  If we want to
//    perform a linear fit, we call the fitting routine with ia = [0,1,1,0,0,0].  This results in a fit to
//    the parameters a1 and a2 only.  The others are ignored.  By setting ia appropriately, we can perform
//    the five linear fits.
//
//  The nonlinear fits use the same trick.  The full fitting function is very long, since we have six different nonlinear
//    fits we need to handle. There are 17 element in the coefficient matrix. The full fitting function is
//    a0*x^a1 + a2*exp(a3*x) + a4 + a5*cos(a6*x + a7) + a8*exp(-a11*x)*cos(a9*x + a10) + a12*(1 - exp(-a13*x) + a14*exp(-((x - a15)*a16)^2)/2
//    Which parameters are active in the fit is controlled by the 16 elements of iaa.  For example, to fit a damped cosine,
//    iaa = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0]
//    IMPORTANT NOTE:  To the student, the fits that contain an exponential function all have constants that are in the DENOMINATOR
//    of the exponentials argument.  In all such cases, we fit to a constan in the NUMERATOR.  When we report the fit results, we take
//    the inverse of these constants. 

//  Part 1:  setup and initial guesses
//
function setFitParameters(fitType, sheet) {
    // sets fit control parameters to what is needed for the fit type assigned to (sheet)
    // ai controls which terms are active in a0*x^2 + a1*x + a2 + a3/x + a4/x^2 + a5*x^0.5 + a6*x^(-0.5)
    // see Numerical Recipes, section 15.4
    // also calculates degrees of freedom for the fit
    var ia = [0,0,0,0,0,0,0];
    var npts = countPoints(sheet);
    var degFree = npts;
    switch(fitType) {
    default:	     
	ia = [0,0,0,0,0,0,0];
	degFree = 0;
	break;
    case 'noRelation':
	ia = [0,0,1,0,0,0,0];
	degFree = npts-1;
	break;
    case 'exactProportion':
	ia = [0,0,0,0,0,0,0];
	degFree = npts;
	break;
    case 'proportional':
	ia = [0,1,0,0,0,0,0];
	degFree = npts-1;
	break;
    case 'linear':
	ia = [0,1,1,0,0,0,0];
	degFree = npts - 2;
	break;
    case 'squareLaw':
	ia = [1,0,0,0,0,0,0];
	degFree = npts - 1;
	break;
    case 'quadratic':
	ia = [1,1,1,0,0,0,0];
	degFree = npts - 3;
	break;
    case 'inverse':
	ia = [0,0,0,1,0,0,0];
	degFree = npts - 1;
	break;
    case 'inverseSquare':
	ia = [0,0,0,0,1,0,0];
	degFree = npts - 1;
	break;
    case 'root':
	ia = [0,0,0,0,0,1,0];
	degFree = npts - 1;
	break;
    case 'inverseRoot':
	ia = [0,0,0,0,0,0,1];
	degFree = npts - 1;
	break;
    case 'powerLaw':            // parameters for linear fit to obtain initial guesses
	ia = [0,1,1,0,0,0,0];
	var iaa = new Array(nlpar).fill(0);
	iaa.splice(0, 2, 1,1);
	degFree = npts - 2;
	break;
    case 'expDecay':           //  parameters for linear fit to obtain initial guesses
	ia = [0,1,1,0,0,0,0];
	var iaa = new Array(nlpar).fill(0);
	iaa.splice(2, 3, 1,1,1);
	degFree = npts - 2;
	break;
    case 'cosine':
	var iaa = new Array(nlpar).fill(0);
	iaa.splice(4, 4, 1,1,1,1);
	degFree = npts - 4;
	break;
    case 'dampedCosine':
	var iaa = new Array(nlpar).fill(0);
	iaa[4] = 1;
	iaa.splice(8, 4, 1,1,1,1);
	degFree = npts - 5;
	break;
    case 'relaxation':
	ia = [0,1,1,0,0,0,0];
	var iaa = new Array(nlpar).fill(0);
	iaa.splice(12, 2, 1,1);
	degFree = npts - 2;
	break;
    case 'gaussian':
	ia = [0,1,1,0,0,0,0];
	var iaa = new Array(nlpar).fill(0);
	iaa[4] = 1;
	iaa.splice(14, 3, 1,1,1);
	degFree = npts - 4;
	break;
    case 'log':
	ia = [0,1,1,0,0,0,0];
	degFree = npts - 2;
	break;
    }
    return {fitType: fitType, ia: ia, iaa: iaa, DOF: degFree};
}

function doTheFit(chosenFit, xdata, ydata, npts, ia) {
    // driver function to prepare initial guesses (if needed) and call the appropriate fitting routines
    //
    var fitResults;
    var fitXdata = [];
    var fitYdata = [];
    for (var i=0; i < npts; i++) {
	fitXdata[i] = xdata[i]/Math.pow(10,xScale);
	fitYdata[i] = ydata[i]/Math.pow(10,yScale);
    }
    var npar = ia.length;             // equal to the size of ia
    var a = [0,0,0,0,0,0,0];          // create local array for the coefficients of the linear fit
    var sig = [];                     // array to hold curve weights, 
    for (var i=0; i<npts; i++) {      // all curve weights equal one for now
	sig.push(1);
    }
    var covar = [];                            //  covar is local to this routine
    for (i=0; i<npar; i++) {                   // make covar into square array full of zeros
	covar.push(new Array(npar).fill(0));
    }
    
    switch(chosenFit) {
    default:                  // this case is used for all the linear fits
     	var chisq = lfit(fitXdata, fitYdata, sig, npts, a, ia, npar, covar);        // perform a linear fit (see NR Section 15.4)
//	var fitResults = {good: true, chisq: chisq, a: a, afin: [], covar: covar};  // for linear fits, we are done!
	return fitResults = {good: true, chisq: chisq, a: a, afin: [], covar: covar};  // for linear fits, we are done!;
	break;
    case 'exactProportion':  // no actual fit is performed
	var sumSqrRes = 0
	for (var i = 0; i < npts; i++) {
	    sumSqrRes = sumSqrRes + (ydata[i] - xdata[i])*(ydata[i] - xdata[i]);
	}
	return fitResults = {good: true, chisq: sumSqrRes, a: [], afin: [], covar: []};
	break;
    case 'powerLaw':
	var guesses = makeGuesses(chosenFit, fitXdata, fitYdata, npts, sig, ia, npar, covar);
	if (!guesses.good) {
	    return fitResults = {good: false, chisq: 0, a: [], afin: [], covar: []}; // 
 	}
	break;
    case 'expDecay':
	var guesses = makeGuesses(chosenFit, fitXdata, fitYdata, npts, sig, ia, npar, covar);
	if (!guesses.good) {
	    return fitResults = {good: false, chisq: 0, a: [], afin: [], covar: []}; // 
	}
	break;
    case 'log':
	var prepped = prepData(chosenFit, fitXdata, fitYdata, npts);
	var chisq = lfit(prepped.xdata, prepped.ydata, sig, prepped.npts, a, ia, npar, covar);  // linear fit, a and covar modified
	return fitResults = {good: true, chisq: chisq, a: a, afin: [], covar: covar}; // 
	break;
    case 'cosine':
    case 'dampedCosine':
    case 'relaxation':
    case 'gaussian':
	if (justGuessing) {
	    var guesses = makeGuesses(chosenFit, fitXdata, fitYdata, npts, sig, ia, npar, covar);
 	    if (!guesses.good) {
		return fitResults = {good: false, chisq: 0, a: [], afin: [], covar: []}; // 
	    } else {
		return fitResults = {good: true, chisq: 0, a: [], afin: guesses.afin, covar: []}; // 
	    }
	} else {
	    var guesses = getGuesses(chosenFit);
	}
	break;
    }
    // proceed through this part only when performing a nonlinear fit
    showGuessInputs('none');
    var afin = guesses.afin;
    var iaa = selectedFitInfo.iaa;
    var done = false;
    var itsmax = 100;
    var its = 0;
    var lchisq = 1000000;
    var mrq = {chisq: lchisq, lambda: -1, ochisq: 0, atry: [], lmBeta: []};
    var alpha = [];
    covar = [];
    for (i=0; i<nlpar; i++) {                   // make alpha into square array full of zeros
	alpha.push(new Array(nlpar).fill(0));
	covar.push(new Array(nlpar).fill(0));
    }
    while (! done) {
	mrq = mrqmin(fitXdata,fitYdata,npts,afin,iaa,nlpar,covar,alpha,mrq);   // call nonlinear fitting routine
	its = its + 1;                                                        // afin, covar, and alpha get modified
	if (mrq.chisq < lchisq) {
	    var test = (lchisq - mrq.chisq)/mrq.chisq;
	    if (Math.abs(test) < .01) {
		done = true;
	    }
	}
	lchisq = mrq.chisq;
	
	if (its > itsmax) {
	    done = true;
	    console.log('LM fail');
	    document.getElementById("LMFail").style.display = "block";
	    var failure = mrqmin(xdata,ydata,npts,afin,iaa,nlpar,covar,alpha,mrq);
	    return fitResults = {good: false, chisq: mrq.chisq, a: [], afin: afin, covar: covar}; // bad fit better than none
	}
    }
    mrq.lambda = 0;
    var success = mrqmin(xdata,ydata,npts,afin,iaa,nlpar,covar,alpha,mrq);  // one last call to sort covar properly
    return fitResults = {good: true, chisq: mrq.chisq, a: [], afin: afin, covar: covar}; // 
}

function makeGuesses(chosenFit, fitXdata, fitYdata, npts, sig, ia, npar, covar) {
    var guesses = {good: false, afin: []};
    if (stillGuessing) {
	guesses = getGuesses(chosenFit);
	return guesses;
    }
    switch (chosenFit) {
    case 'powerLaw':
    case 'expDecay':
    case 'relaxation':
    case 'gaussian':
	var a = [0,0,0,0,0,0,0];
	var prepped = prepData(chosenFit, fitXdata, fitYdata, npts);
	if (prepped.npts < 2) {
	    console.log("not enough points left after preventing log of negative numbers");		
	    return guesses = {good: false, a: []};     // not enough data to guess
	}
	// perform a linear fit to get initial guesses returned in array a
	var chisq = lfit(prepped.xdata, prepped.ydata, sig, prepped.npts, a, ia, npar, covar);  // linear fit, a and covar modified
	var afin = new Array(nlpar).fill(0);
	switch(chosenFit) {
	case 'powerLaw':
	    afin.splice(0, 2, Math.exp(a[2]), a[1]);
	    break;
	case 'expDecay':
	    afin.splice(2, 3, Math.exp(a[2]), a[1], 0);
	    break;
	case 'relaxation':
	    afin[12] = fitYdata[npts-1];
	    afin[13] = -a[1];
	    showGuesses(afin[12], 1/afin[13], 0, 0, 0);
	    break;
	case 'gaussian':
	    afin[4] = 0;
	    afin[14] = Math.max(...fitYdata);
	    afin[15] = fitXdata[fitYdata.indexOf(afin[14])];
	    afin[16] = Math.sqrt(Math.abs(a[1]));
	    showGuesses(afin[14], afin[15], 1/afin[16], 0, 0);
	    break;
	}
	return guesses = {good: true, afin: afin};
	break;
    case 'cosine':
	var removed = removeBaseline(fitXdata, fitYdata, npts);
	var baseline = removed.baseline;
	var cxdata = removed.cxdata;
	var cydata = removed.cydata;
	var amplitude = (Math.max(...cydata) - Math.min(...cydata))/2;
	var freq = getFrequency(cxdata, cydata, npts);
	var phi = getPhase(cydata, amplitude);
	showGuesses(amplitude, freq, phi, 0, baseline);
	var afin = new Array(nlpar).fill(0);
	afin.splice(4,4,baseline,amplitude, freq, phi);
	return guesses = {good: true, afin: afin};
	break;
    case 'dampedCosine':
	var removed = removeBaseline(fitXdata, fitYdata, npts);
	var baseline = removed.baseline;
	var cxdata = removed.cxdata;
	var cydata = removed.cydata;
	var amplitude = Math.max(Math.max(...cydata), Math.abs(Math.min(...cydata)));
 	var freq = getFrequency(cxdata, cydata, npts);
	var phi = getPhase(cydata, amplitude);
	var oneOverD = getOneOverD(cxdata, cydata, npts);
	showGuesses(amplitude, freq, phi, 1/oneOverD, baseline);
	var afin = new Array(nlpar).fill(0);
	afin[4] = baseline;
	afin.splice(8,4,amplitude, freq, phi, oneOverD);
	return guesses = {good: true, afin: afin};
	break;
   }

    function showGuesses(A, B, C, D, base) {
	document.getElementById('guessA').value = A;
	document.getElementById('guessB').value = B;
	document.getElementById('guessC').value = C;
	document.getElementById('guessD').value = D;
	document.getElementById('baselineMessage').innerHTML = base.toString();
    }
    

    function removeBaseline(fitXdata, fitYdata, npts) {
	var baseline = 0
	for (let i = 0; i < npts; i++) {
	    baseline = baseline + fitYdata[i];
	}
	baseline = baseline/npts;
	var cxdata = [];
	var cydata = [];
	for (let i = 0; i < npts; i++) {
	    cxdata[i] = fitXdata[i];
	    cydata[i] = fitYdata[i] - baseline;
	}
	return {cxdata: cxdata, cydata: cydata, baseline: baseline};
    }

    function getFrequency(fitXdata, fitYdata, npts) {
	var ySign = Math.sign(cydata[0]);
	var yZeros = [];
	for (let i = 1; i < npts; i++) {
	    if (Math.sign(cydata[i] == 0)) {
		// do nothing
	    } else if (Math.sign(cydata[i]) != ySign) {
		yZeros.push(cxdata[i]);
		ySign = Math.sign(cydata[i]);
	    }
	}
	if (yZeros.length < 2) {
	    return 1;
	} else {
	    var nHalfPeriods = 0;
	    var halfPeriod = 0;
	    for (let i = 1; i < yZeros.length; i++) {
		halfPeriod = halfPeriod + yZeros[i] - yZeros[i-1];
		nHalfPeriods = nHalfPeriods + 1;
	    }
	    halfPeriod = halfPeriod/nHalfPeriods;
	    return Math.PI/halfPeriod;
	}
    }

    function getPhase(cydata, amplitude) {
	if (cydata[0] >= amplitude/2) {
	    return phi = 0;
	} else if (cydata[0] <= -amplitude/2) {
	    return phi = Math.PI;
	} else if (cydata[1]-cydata[0] >= 0) {
	    return phi = -Math.PI/2;
	} else {
	    return phi = Math.PI/2;
	}
    }

    function getOneOverD(cxdata, cydata, npts) {
	var y1 = Math.max(...cydata);
	var y2 = Math.min(...cydata);
	var x1 = cxdata[cydata.indexOf(y1)];
	var x2 = cxdata[cydata.indexOf(y2)];
	var lny1 = Math.log(Math.abs(y1));
	var lny2 = Math.log(Math.abs(y2));
	var oneOverD = (lny1 - lny2)/(x2 - x1);
	return oneOverD;
    }
}

function prepData(chosenFit, xdata, ydata, npts) {
    var lxdata = [];    // create arrays to hold data for a preliminary linear fit (to get initial guesses)
    var lydata = [];    // which we do using logarithms and a straight-line fit
    var A = ydata[npts-1];
    var ypeak = Math.max(...ydata);
    var xpeak = xdata[ydata.indexOf(ypeak)];
    var lnpts = npts;
    var j = 0;
    for (var i = 0; i < npts; i++) {
	switch(chosenFit) {
	case 'powerLaw':
	    if (ydata[i] > 0 && xdata[i] > 0) {		    
		lydata[j] = Math.log(ydata[i]);
		lxdata[j] = Math.log(xdata[i]);
		j = j + 1;
	    } else {
		lnpts = lnpts - 1;
	    }
	    break;
	case 'expDecay':
	    if (ydata[i] > 0) {
		lydata[j] = Math.log(ydata[i]);
		lxdata[j] = xdata[i];
		j = j + 1;
	    } else {
		lnpts = lnpts - 1;
	    }
	    break;
	case 'relaxation':
	    var temp = -ydata[i] + A;
	    if (temp > 0) {
		lxdata[j] = xdata[i];
		lydata[j] = Math.log(temp);
		j = j + 1;
	    } else {
		lnpts = lnpts - 1;
	    }
	    break;
	case 'gaussian':
	    if (ydata[i] > 0) {
		lxdata[j] = Math.pow(xdata[i] - xpeak, 2);
		lydata[j] = Math.log(ydata[i]);
		j = j + 1;
	    } else {
		lnpts = lnpts - 1;
	    }
	    break;
	case 'log':
	    if (xdata[i] > 0) {
		lxdata[j] = Math.log(xdata[i]);
		lydata[j] = ydata[i];
		j = j + 1;
	    } else {
		lnpts = lnpts - 1;
	    }
	    
	}
    }
    return {xdata: lxdata, ydata: lydata, npts: lnpts};
}

function getGuesses(chosenFit) {
    var A = Number(document.getElementById('guessA').value);
    var B = Number(document.getElementById('guessB').value);
    var C = Number(document.getElementById('guessC').value);
    var D = Number(document.getElementById('guessD').value);
    var base = Number(document.getElementById('baselineMessage').innerHTML);
    var afin = new Array(nlpar).fill(0);
    switch (chosenFit) {
    case 'cosine':
	afin.splice(4,4,base, A, B, C);
	break;
    case 'dampedCosine':
	var oneOverD = 1/D;
	afin[4] = base;
	afin.splice(8,4, A, B, C, oneOverD);
	break;
    case 'relaxation':
	var oneOverB = 1/B;
	afin[12] = A;
	afin[13] = oneOverB;
	break;
    case 'gaussian':
	var oneOverC = 1/C;
	afin[4] = D;
	afin.splice(14, 3, A, B, oneOverC);
	break;
    }
    return {good: true, afin: afin};
}

// Part 2:  The actual routines from Numerical Recipes
// Linear least squares fitting routine
//
function lfit(x,y,sig,ndat,a,ia,ma,covar) {               // input arrays a and covar are modified in the calling routine!
    // This is the fitting function for the linear fits
    var afuncs = [0,0,0,0,0,0,0];
    var dummy;
    var mfit=0;
    for (var j=0; j<ma; j++) {
        if(ia[j] != 0) {
	    mfit = mfit + 1;
	}
    }
    if (mfit == 0) {
	console.log('lfit: no parameters to be fitted')
	return -9
    }
    var beta = [];
    for (var j=0; j<mfit; j++) {
	for (var k=0; k<mfit; k++) {
	    covar[j][k] = 0;
	}
	beta[j] = 0;
    }
    for (var i=0; i<ndat; i++) {
	dummy = funcs(x[i], afuncs);
        var ym = y[i];
        if (mfit < ma) {
	    for (j=0; j<ma; j++) {
		if (ia[j] == 0) {
		    ym = ym - a[j] * afuncs[j];
		}
	    }
	}
        var sig2i = 1/sig[i]/sig[i];
        var jj = -1;
	for (var l=0; l<ma; l++) {
	    if (ia[l] != 0) {
		jj = jj + 1;
		var wt = afuncs[l] * sig2i;
		var kk = -1;
		for (var m=0; m<l+1; m++) {
		    if (ia[m] != 0) {
			kk = kk + 1;
			covar[jj][kk] = covar[jj][kk] + wt * afuncs[m];
		    }
		}
		beta[jj] = beta[jj] + ym * wt;
	    }
	}
    }
    for (var j=1; j<mfit; j++) {
	for (var k=0; k<j; k++) {
	    covar[k][j] = covar[j][k];
	}
    }
    var gjret = gaussj(covar,mfit,beta);  // arrays are pass by reference.  covar and beta are modified now.
    jj=-1;
    for (l=0; l<ma; l++) {
        if (ia[l] != 0) {
	    jj = jj + 1;
	    a[l] = beta[jj];
	}
    }
    var chisq = 0;
    for (var i=0; i<ndat; i++) {
	dummy = funcs(x[i], afuncs);
        var sum = 0;
	for (var j=0; j<ma; j++) {
	    sum = sum + a[j] * afuncs[j];
	}
        chisq = chisq + ((y[i] - sum)/sig[i])*((y[i] - sum)/sig[i])
    }
    covar = covsrt(covar,ma,ia,mfit);
    return chisq;

    function funcs(xi, afuncs) {  // evaluate the fitting function at the value xi (arrays are pass by reference)
	afuncs[0] = xi * xi;
	afuncs[1] = xi;
	afuncs[2] = 1;
	afuncs[3] = 1/xi;
	if (!isFinite(afuncs[3])) {
	    afuncs[3] = 0;
	}
	afuncs[4] = 1/xi/xi;
	if (!isFinite(afuncs[4])) {
	    afuncs[4] = 0;
	}
	afuncs[5] = Math.sqrt(xi);
	if (isNaN(afuncs[5])) {
	    afuncs[5] = 0;
	}
	afuncs[6] = 1/Math.sqrt(xi);
	if (isNaN(afuncs[6]) || !isFinite(afuncs[6])) {
	    afuncs[6] = 0;
	}
	return 0;
    }
}

//***********************************************************************************************************************
// Utility function for use with both linear and nonlinear fitting routines
//
function covsrt(a,ma,ia,mfit) {  // arrays are pass by reference.  Whatever "a" refers to will be modified.
    var swap;
    for (i=mfit; i<ma; i++) {
	for (j=0; j<i; j++) {
            a[i][j] = 0;
            a[j][i] = 0;
	}
    }
    var k = mfit-1;
    for (j=ma-1; j>0; j--) {
        if (ia[j] != 0) {
	    for (var i=0; i<ma; i++) {
		swap = a[i][k];
		a[i][k] = a[i][j];
		a[i][j] = swap;
	    }
	    for (var i=0; i<ma; i++) {
		swap = a[k][i];
		a[k][i] = a[j][i];
		a[j][i] = swap;
	    }
            k = k - 1;
        }
    }
    return 0;
}

//***************************************************************************************************************************
// Gauss Jordan elimination routine
//
function gaussj(a,n,b) {
    var nmax = 50;
    var icol, irow, ll, big, dum, pivinv; 
    var indxc = [];
    var indxr = [];
    var ipiv = [];
    for (var j=0; j<n; j++) {
        ipiv[j]=0;
    }
    for (var i=0; i<n; i++) {
        big=0;
	for (var j=0; j<n; j++) {
            if(ipiv[j] != 1) {
		for (var k=0; k<n; k++) {
		    if (ipiv[k] == 0) {
			if (Math.abs(a[j][k]) >= big) {
			    big = Math.abs(a[j][k]);
			    irow = j;
			    icol = k;
			}
		    }
		}
	    }
	}
        ipiv[icol] = ipiv[icol] + 1;
        if (irow != icol) {
	    for (l=0; l<n; l++) {
		dum = a[irow][l];
		a[irow][l] = a[icol][l];
		a[icol][l] = dum;
	    }
		dum = b[irow];
		b[irow] = b[icol];
		b[icol] = dum;
	}
        indxr[i] = irow;
        indxc[i] = icol;
        if (a[icol][icol] == 0) {
	    console.log('singular matrix in gaussj');
	    return -1;
	}
        pivinv = 1/a[icol][icol];
        a[icol][icol] = 1;
	for (var l=0; l<n; l++) {
            a[icol][l] = a[icol][l] * pivinv;
	}
            b[icol] = b[icol] * pivinv;
	for (var ll=0; ll<n; ll++) { 
            if (ll != icol) {
		dum = a[ll][icol];
		a[ll][icol] = 0;
		for (var l=0; l<n; l++) {
		    a[ll][l] = a[ll][l] - a[icol][l] * dum;
		}
		    b[ll] = b[ll] - b[icol] * dum;
	    }
	}
    }
    for (var l=n-1; l>-1; l--) {
        if (indxr[l] != indxc[l]) {
	    for (var k=0; k<n; k++) {
		dum = a[k][indxr[l]];
		a[k][indxr[l]] = a[k][indxc[l]];
		a[k][indxc[l]] = dum;
	    }
	}
    }
    
    return 0;
}
//*********************************************************************************************************************
// Levenberg-Marquardt nonlinear fitting routine
//
function mrqmin(xdata,ydata,ndata,a,ia,ma,covar,alpha,mrq) {
    // argument a is array afin in calling routine
    var da = [];
    var mfit = 0;
    for (let j=0; j<ma; j++) {
	if (ia[j] != 0) {
	    mfit = mfit + 1;
	}
    }
    if (mrq.lambda < 0) {
        mrq.lambda = 0.001;
	mrq.ochisq = mrqcof(xdata,ydata,ndata,a,ia,ma,alpha,mrq.lmBeta,mrq.chisq);
	for (let j=0; j<ma; j++) {
            mrq.atry[j]=a[j];
	}
    }
    for (let j=0; j<mfit; j++) {
	for (let k=0; k<mfit; k++) {
            covar[j][k] = alpha[j][k];
	}
        covar[j][j] = alpha[j][j] * (1 + mrq.lambda);
        da[j] = mrq.lmBeta[j];
    }
    var gjret = gaussj(covar,mfit,da);
    if (mrq.lambda == 0) {
        var ret = covsrt(covar,ma,ia,mfit);
        ret = covsrt(alpha,ma,ia,mfit);
	return mrq;
    }
    var jj=-1;
    for (let l=0; l<ma; l++) {
        if (ia[l] != 0) {
            jj =jj + 1;
            mrq.atry[l] = a[l] + da[jj];
	}
    }
    mrq.chisq = mrqcof(xdata,ydata,ndata,mrq.atry,ia,ma,covar,da,mrq.chisq);
    if (mrq.chisq < mrq.ochisq) {
        mrq.lambda = 0.1 * mrq.lambda;
        mrq.ochisq = mrq.chisq;
	for (let j=0; j<mfit; j++) {
	    for (let k=0; k<mfit; k++) {
		alpha[j][k] = covar[j][k];
	    }
	    mrq.lmBeta[j] = da[j];
	}
	for (let l=0; l<ma; l++) {
            a[l] = mrq.atry[l];
	}
    } else {
        mrq.lambda = 10 * mrq.lambda;
        mrq.chisq = mrq.ochisq;
    }
    return mrq;
}

//**************************************************************************************************************
// Part of the LM fitting.  This routine applies the fitting function to the data and prepares the matrix for
//     Gauss-Jordan elimination
//     in Javascript arrays are passed by reference, so b and c are modified by this routine
//
function mrqcof(xdata,ydata,ndata,a,ia,ma,c,b) {
    var dyda = []; // array to hold derivatives of the fitting function             
    var mfit = 0;
    for (let j=0; j<ma; j++) {
        if (ia[j] != 0) {
	    mfit = mfit + 1;
	}
    }
    for (let j=0; j<mfit; j++) {
	for (let k=0; k<j+1; k++) {
            c[j][k] = 0;
	}
        b[j] = 0;
    }
    var chisq=0;
    for (let i=0; i<ndata; i++) {
	var ymod = funcs(xdata[i],a,dyda);
        var dy = ydata[i] - ymod;
        var jj = -1;
	for (let l=0; l<ma; l++) {
            if (ia[l] != 0) {
		jj = jj + 1;
		var wt = dyda[l];
		var kk = -1;
		for (let m=0; m<l+1; m++) {
		    if (ia[m] != 0) {
			kk = kk + 1;
			c[jj][kk] = c[jj][kk] + wt * dyda[m];
		    }
		}
		b[jj] = b[jj] + dy * wt;
	    }
	}
        chisq = chisq + dy * dy;
    }
    
    for (let j=1; j<mfit; j++) {
	for (let k=0; k<j; k++) {
	    c[k][j] = c[j][k];
	}
    }
    return chisq;

    function funcs(x,a,dyda) {
	// evaluates the fitting function and the derivatives wrt the fitting parameters at x
	var y = a[0]*Math.pow(x, a[1]) + a[2]*Math.exp(x*a[3]) + a[4] + a[5]*Math.cos(a[6]*x+a[7]) +
	    a[8]*Math.exp(-a[11]*x)*Math.cos(a[9]*x+a[10]) + a[12]*(1-Math.exp(-a[13]*x)) +
	    a[14]*Math.exp(-Math.pow((x - a[15])*a[16],2)/2); // the full fitting function
   ///   working on the derivatives
	dyda[0] = Math.pow(x, a[1]);                    // derivative wrt a[0]
	dyda[1] = a[0]*Math.pow(x, a[1])*Math.log(x);   // ...wrt a[1]
	dyda[2] = Math.exp(x*a[3]);                     // ...wrt a[2]
	dyda[3] = a[2]*x*Math.exp(x*a[3]);              // ...wrt a[3]
	dyda[4] = 1.0;                                  // ...wrt a[4]
	dyda[5] = Math.cos(a[6]*x+a[7]);
	dyda[6] = -a[5]*x*Math.sin(a[6]*x+a[7]);
	dyda[7] =   -a[5]*Math.sin(a[6]*x+a[7]);
	dyda[8] = Math.exp(-a[11]*x)*Math.cos(a[9]*x+a[10]);
	dyda[9] =  -a[8]*x*Math.exp(-a[11]*x)*Math.sin(a[9]*x+a[10]);
	dyda[10] =   -a[8]*Math.exp(-a[11]*x)*Math.sin(a[9]*x+a[10]);
	dyda[11] = -a[8]*x*Math.exp(-a[11]*x)*Math.cos(a[9]*x+a[10]);
	dyda[12] = (1-Math.exp(-a[13]*x));
	dyda[13] = a[12]*x*Math.exp(-a[13]*x);
	dyda[14] = Math.exp(-Math.pow((x - a[15])*a[16],2)/2);
	dyda[15] = a[14]*(x-a[15])*a[16]*a[16]*Math.exp(-Math.pow((x - a[15])*a[16],2)/2);
	dyda[16] = -a[14]*Math.pow((x-a[15]),2)*a[16]*Math.exp(-Math.pow((x - a[15])*a[16],2)/2);
	return y;
    }
}

// Section:  iPad edition **************************************************************************************************
// Everything in this section was added for the iPad edition (6.20i).  It covers:
//   - small helpers for messages, copying text, and showing the graph as an image
//   - Copy Slopes (tangent finder values for every data point)
//   - Save to File / Open File (export and import a whole graph)
//   - press-and-hold menus that replace the ctrl-click and shift-click shortcuts on devices without a keyboard
//

// Subsection:  Messages and clipboard helpers ******************************************************************************
//
var toastTimer = null;
function showToast(message, ms) {
    // brief message at the bottom of the screen; disappears by itself
    var toast = document.getElementById('toastMessage');
    toast.innerHTML = message;
    toast.style.display = 'block';
    if (toastTimer) {
	clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(function() {
	toast.style.display = 'none';
	toastTimer = null;
    }, ms || 3500);
}

function copyTextToClipboard(text, successMessage) {
    // copy plain text; if the browser refuses, show the text in a box so it can be copied by hand
    try {
	if (navigator.clipboard && navigator.clipboard.writeText) {
	    navigator.clipboard.writeText(text).then(function() {
		showToast(successMessage);
	    }, function() {
		showCopyText(text);
	    });
	    return;
	}
    } catch (err) {}
    showCopyText(text);
}

function showCopyText(text) {
    var box = document.getElementById('copyTextArea');
    box.value = text;
    document.getElementById('copyTextModal').style.display = 'block';
    box.focus();
    box.select();
    try { box.setSelectionRange(0, text.length); } catch (err) {}
}

function showGraphImage(dataURL) {
    // used when the clipboard is not available: press-and-hold the image to copy it or save it to Photos
    document.getElementById('graphImage').src = dataURL;
    document.getElementById('graphImageModal').style.display = 'block';
}

function formatNumber(value) {
    // six significant figures, without trailing zeros, in a form nPlot's data cells will accept
    if (!isFinite(value)) {
	return '';
    }
    return String(Number(value.toPrecision(6)));
}

// Subsection:  Copy Slopes **************************************************************************************************
//
function copySlopes() {
    // Copy the slope of the fit at every data point on the current sheet, as two tab-separated columns (x, slope).
    // Paste into a spreadsheet, or into an empty nPlot graph to plot slope vs. x (for example v vs. t from x vs. t).
    // Values are in real data units (the axis scale factor, if any, is removed).
    var tangentModels = ['squareLaw', 'quadratic', 'inverse', 'inverseSquare', 'powerLaw', 'expDecay', 'root', 'inverseRoot'];
    var sheetNum = getSheetNumber(activeSheet);
    var fitInfo = lastFits[sheetNum];
    if (!fitInfo || sheetFitTypes[sheetNum] == 'none') {
	showToast('<b>Copy Slopes</b> needs a fit on the current sheet. Choose a model first.', 4500);
	return;
    }
    if (tangentModels.indexOf(fitInfo.fit) < 0) {
	showToast('<b>Copy Slopes</b> works with the curved models (Square Law, Quadratic, Inverse, Square Root, ' +
		  'Power Law, Exponential...). For a straight-line fit, the slope is the same everywhere: it is <i>A</i>.', 6000);
	return;
    }
    var xFactor = Math.pow(10, fitInfo.xScale);
    var slopeFactor = Math.pow(10, fitInfo.yScale - fitInfo.xScale);
    var lines = [];
    for (var i = 0; i < fitInfo.x.length; i++) {
	var xValue = fitInfo.x[i];
	var slope = calcSlope(fitInfo.fit, xValue / xFactor, fitInfo.a, fitInfo.afin) * slopeFactor;
	if (isFinite(slope)) {
	    lines.push(formatNumber(xValue) + '\t' + formatNumber(slope));
	}
    }
    if (lines.length == 0) {
	showToast('There were no slopes to copy.');
	return;
    }
    copyTextToClipboard(lines.join('\n') + '\n',
			'Copied ' + lines.length + ' (<i>x</i>, slope) pairs. Paste them into a spreadsheet, or into an empty ' +
			'nPlot graph to plot slope vs. <i>x</i>.');
}

function copySheetData() {
    // keyboard-free replacement for drag-selecting cells and pressing ctrl-c: copies the whole current sheet
    var lines = [];
    var lastRow = 0;
    for (var i = 1; i <= nRows; i++) {
	var row = [];
	var any = false;
	for (var c = 0; c < 4; c++) {
	    var id = String.fromCharCode(65 + c) + activeSheet + i;
	    var raw = sessionStorage[id] || '';
	    var value = raw === '' ? '' : DATA[id.toLowerCase()];
	    if (raw !== '') {
		any = true;
	    }
	    row.push(value === undefined ? '' : String(value));
	}
	lines.push(row.join('\t'));
	if (any) {
	    lastRow = i;
	}
    }
    if (lastRow == 0) {
	showToast('This sheet is empty, so there is nothing to copy.');
	return;
    }
    copyTextToClipboard(lines.slice(0, lastRow).join('\n') + '\n',
			'Copied ' + lastRow + ' rows from Sheet ' + (getSheetNumber(activeSheet) + 1) + '.');
}

// Subsection:  Save to File / Open File *************************************************************************************
//
var importableFits = ['none', 'noRelation', 'exactProportion', 'proportional', 'linear', 'squareLaw', 'quadratic', 'inverse',
		      'inverseSquare', 'root', 'inverseRoot', 'powerLaw', 'expDecay', 'log',
		      'cosine', 'dampedCosine', 'relaxation', 'gaussian'];

function panelForFit(fitType) {
    if (['powerLaw', 'expDecay', 'log'].indexOf(fitType) >= 0) {
	return 'advanced';
    } else if (['cosine', 'dampedCosine', 'relaxation', 'gaussian'].indexOf(fitType) >= 0) {
	return 'expert';
    }
    return 'basic';
}

function buildGraphObject() {
    // Collect everything about the current graph.  Unlike Save Graph, this keeps exactly what was typed in each cell
    //   (including formulas and skip boxes), every model (including Advanced and Expert), and any linearization.
    var sheets = [];
    for (var k = 0; k < nSheets; k++) {
	var letter = getSheetLetter(k);
	var rows = [];
	var lastRow = 0;
	for (var i = 1; i <= nRows; i++) {
	    var row = [];
	    for (var c = 0; c < 4; c++) {
		var value = sessionStorage[String.fromCharCode(65 + c) + letter + i];
		row.push(value === undefined || value === null ? '' : String(value));
	    }
	    if (document.getElementById('E' + letter + i).checked) {
		row.push('skip');
	    }
	    rows.push(row);
	    if (row.some(function(v) { return v !== ''; })) {
		lastRow = i;
	    }
	}
	if (lastRow > 0) {
	    sheets.push({sheet: letter, fit: sheetFitTypes[k], rows: rows.slice(0, lastRow)});
	}
    }
    return {
	format: 'nPlot graph',
	formatVersion: 1,
	nPlotVersion: version,
	saved: new Date().toISOString(),
	name: document.getElementById('saveName').value,
	labels: {
	    xLabel: document.getElementById('xlabel').value,
	    xUnits: document.getElementById('xunit').value,
	    yLabel: document.getElementById('ylabel').value,
	    yUnits: document.getElementById('yunit').value,
	    title: document.getElementById('plotTitle').value
	},
	activeSheet: activeSheet,
	sheets: sheets,
	linearization: {
	    dataLinearized: dataLinearized,
	    xform: xform,
	    transformationString: transformationString,
	    originalXLabel: savedXTitle,
	    originalXUnits: savedXUnit
	},
	annotation: {
	    text: annotation.text.slice(0, annotation.index),
	    x: annotation.x.slice(0, annotation.index),
	    y: annotation.y.slice(0, annotation.index),
	    kind: annotation.isFit.slice(0, annotation.index),
	    tWidth: annotation.tWidth.slice(0, annotation.index),
	    tHeight: annotation.tHeight.slice(0, annotation.index),
	    sheetNum: annotation.activeSheetNum.slice(0, annotation.index),
	    fitType: annotation.fitType.slice(0, annotation.index)
	}
    };
}

function exportGraphFile() {
    var graph = buildGraphObject();
    if (graph.sheets.length == 0) {
	showToast('There is no data to save yet.');
	return;
    }
    var baseName = graph.name.trim();
    if (baseName == '') {
	baseName = buildName(document.getElementById('xlabel').value, document.getElementById('ylabel').value);
    }
    if (baseName == '' || baseName == '_vs_') {
	baseName = 'nPlot graph';
    }
    baseName = baseName.replace(/[\\\/:*?"<>|^]+/g, '').trim() || 'nPlot graph';
    var fileName = baseName + '.nplot.json';
    var text = JSON.stringify(graph, null, 1);
    var blob = new Blob([text], {type: 'application/json'});

    // On iPads, offer the share sheet (Save to Files, Google Drive, AirDrop, ...).  Elsewhere, an ordinary download.
    if (isIOS && navigator.canShare && typeof File !== 'undefined') {
	try {
	    var file = new File([blob], fileName, {type: 'application/json'});
	    if (navigator.canShare({files: [file]})) {
		navigator.share({files: [file], title: fileName}).then(function() {
		    showToast('Graph saved as <b>' + fileName + '</b>');
		}, function(err) {
		    if (!err || err.name != 'AbortError') {
			downloadBlob(blob, fileName);
		    }
		});
		return;
	    }
	} catch (err) {}
    }
    downloadBlob(blob, fileName);
}

function downloadBlob(blob, fileName) {
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(function() { URL.revokeObjectURL(url); }, 10000);
    showToast('Graph saved as <b>' + fileName + '</b> (look in your Downloads).', 4500);
}

function readGraphFile(file) {
    var reader = new FileReader();
    reader.onload = function() {
	var graph;
	try {
	    graph = JSON.parse(reader.result);
	} catch (err) {
	    graph = null;
	}
	if (!graph || graph.format != 'nPlot graph' || !Array.isArray(graph.sheets)) {
	    showToast('<b>' + file.name.replace(/</g, '&lt;') + '</b> is not an nPlot graph file.', 5000);
	    return;
	}
	var npts = countPoints("A") + countPoints("B") + countPoints("C") + countPoints("D") + countPoints("E");
	if (npts == 0 || thereIsNoGraph) {
	    applyImportedGraph(graph);
	} else {
	    pendingImport = graph;              // same "this will erase your graph" question as Recall Graph
	    document.getElementById("recallDialog").style.display = "block";
	}
    };
    reader.onerror = function() {
	showToast('That file could not be read.');
    };
    reader.readAsText(file);
}

function applyImportedGraph(graph) {
    clearAllData();
    dataLinearized = false;
    labelsLinearized = false;
    xform = 'none';
    transformationString = '';

    var labels = graph.labels || {};
    document.getElementById('xlabel').value = labels.xLabel || '';
    document.getElementById('xunit').value = labels.xUnits || '';
    document.getElementById('ylabel').value = labels.yLabel || '';
    document.getElementById('yunit').value = labels.yUnits || '';
    document.getElementById('plotTitle').value = labels.title || '';

    var firstSheet = '';
    graph.sheets.forEach(function(sheet) {
	var letter = String(sheet.sheet);
	if (!/^[A-E]$/.test(letter) || !Array.isArray(sheet.rows)) {
	    return;
	}
	var k = getSheetNumber(letter);
	for (var i = 0; i < Math.min(sheet.rows.length, nRows); i++) {
	    var row = Array.isArray(sheet.rows[i]) ? sheet.rows[i] : [];
	    for (var c = 0; c < 4; c++) {
		var value = row[c];
		sessionStorage[String.fromCharCode(65 + c) + letter + (i + 1)] =
		    (value === undefined || value === null) ? '' : String(value);
	    }
	    document.getElementById('E' + letter + (i + 1)).checked = (row[4] === 'skip');
	}
	sheetFitTypes[k] = importableFits.indexOf(sheet.fit) >= 0 ? sheet.fit : 'none';
	if (firstSheet == '') {
	    firstSheet = letter;
	}
    });

    var lin = graph.linearization || {};
    if (lin.dataLinearized && ['sqr', 'sqrRoot', 'inv', 'invSqr', 'invSqrRoot'].indexOf(lin.xform) >= 0) {
	dataLinearized = true;
	labelsLinearized = true;            // the saved labels already show the transformation
	xform = lin.xform;
	transformationString = lin.transformationString || '';
	savedXTitle = lin.originalXLabel || '';
	savedXUnit = lin.originalXUnits || '';
    }

    var ann = graph.annotation || {};
    if (Array.isArray(ann.text) && ann.text.length > 0) {
	var n = ann.text.length;
	var numbers = function(list) {
	    return Array.from({length: n}, function(v, i) { return Number((list || [])[i]) || 0; });
	};
	annotation.text = ann.text.map(String);
	annotation.x = numbers(ann.x);
	annotation.y = numbers(ann.y);
	annotation.isFit = Array.from({length: n}, function(v, i) { return String((ann.kind || [])[i] || 'note'); });
	annotation.tWidth = numbers(ann.tWidth);
	annotation.tHeight = numbers(ann.tHeight);
	annotation.activeSheetNum = numbers(ann.sheetNum);
	annotation.fitType = Array.from({length: n}, function(v, i) { return String((ann.fitType || [])[i] || ' '); });
	annotation.color = Array.from({length: n}, function() { return 'black'; });
	annotation.index = n;
    }

    document.getElementById('saveName').value = '';
    if (firstSheet != '') {
	var wanted = /^[A-E]$/.test(graph.activeSheet) ? graph.activeSheet : firstSheet;
	var importedFits = sheetFitTypes.slice();
	activePanel = setModelsPanel(panelForFit(importedFits[getSheetNumber(wanted)]));   // (this resets one sheet's model...)
	sheetFitTypes = importedFits;                                                     // (...so put them all back)
	setSheet(wanted);
    }
    document.getElementById('saveName').value = graph.name || '';
    computeAll();
    var message = 'Opened <b>' + String(graph.name || 'graph').replace(/</g, '&lt;') + '</b>';
    if (panelForFit(sheetFitTypes[getSheetNumber(activeSheet)]) == 'expert') {
	message = message + '. Press <b>Go</b> to redo the Expert fit.';
    }
    showToast(message, 4500);
}

// Subsection:  Press-and-hold menus ****************************************************************************************
// Keyboard-free versions of the ctrl-click / shift-click shortcuts.  Press and hold (or right-click) a button to get a
//   small menu.  The ctrl and shift shortcuts still work exactly as before when there is a keyboard.
//
function attachLongPress(buttonId, buildItems) {
    var button = document.getElementById(buttonId);
    var timer = null;
    var startX = 0;
    var startY = 0;
    button.classList.add('hasMenu');
    button.title = 'Press and hold for more options';
    var cancel = function() {
	if (timer) {
	    clearTimeout(timer);
	    timer = null;
	}
    };
    button.addEventListener('pointerdown', function(e) {
	if (e.pointerType == 'mouse' && e.button != 0) {
	    return;
	}
	startX = e.clientX;
	startY = e.clientY;
	cancel();
	timer = setTimeout(function() {
	    timer = null;
	    longPressFired = true;
	    showActionMenu(button, buildItems());
	}, 550);
    });
    button.addEventListener('pointermove', function(e) {
	if (timer && Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 12) {
	    cancel();
	}
    });
    button.addEventListener('pointerup', function() {
	cancel();
	if (longPressFired) {
	    // the click that follows a long press must not also run the button's normal action
	    setTimeout(function() { longPressFired = false; }, 400);
	}
    });
    button.addEventListener('pointercancel', cancel);
    button.addEventListener('pointerleave', cancel);
    button.addEventListener('contextmenu', function(e) {
	e.preventDefault();
	cancel();
	if (document.getElementById('actionMenu').dataset.owner != buttonId) {
	    showActionMenu(button, buildItems());
	}
    });
}

document.addEventListener('click', function(e) {
    // swallow the click that ends a long press, before the button's own listener sees it
    if (longPressFired && e.target.closest && e.target.closest('.hasMenu')) {
	e.stopImmediatePropagation();
	e.preventDefault();
	longPressFired = false;
    }
}, true);

function showActionMenu(button, items) {
    var menu = document.getElementById('actionMenu');
    menu.innerHTML = '';
    items.forEach(function(item) {
	var entry = document.createElement('button');
	entry.className = 'actionMenuItem';
	entry.innerHTML = item.label;
	entry.addEventListener('click', function(e) {
	    e.stopPropagation();
	    hideActionMenu();
	    item.action();
	});
	menu.appendChild(entry);
    });
    // place the menu just below its button (inside the same panel, so it works at any zoom level)
    button.parentNode.appendChild(menu);
    menu.style.left = Math.max(0, Math.min(button.offsetLeft, button.parentNode.clientWidth - 230)) + 'px';
    menu.style.top = (button.offsetTop + button.offsetHeight + 4) + 'px';
    menu.dataset.owner = button.id;
    menu.style.display = 'block';
}

function hideActionMenu() {
    var menu = document.getElementById('actionMenu');
    menu.style.display = 'none';
    menu.dataset.owner = '';
}

document.addEventListener('pointerdown', function(e) {
    var menu = document.getElementById('actionMenu');
    if (menu.style.display == 'block' && !menu.contains(e.target)) {
	hideActionMenu();
    }
});

function withDownloadSetting(downloadFlag, fn) {
    // run fn as if the Preferences "Download" setting were downloadFlag, without changing the saved preference
    var saved = yesDownload;
    var savedFit = includeFit;
    yesDownload = downloadFlag;
    includeFit = false;
    try {
	fn();
    } finally {
	yesDownload = saved;
	includeFit = savedFit;
    }
}

if (window.PointerEvent) {
    attachLongPress('clearDataButton', function() {
	return [
	    {label: 'Clear this sheet', action: function() { clearData(activeSheet, false); }},
	    {label: 'Clear <b>all</b> sheets, labels &amp; notes', action: function() {
		if (window.confirm('Clear all five sheets, the axis labels, and all annotation?')) {
		    clearAllData();
		}
	    }},
	    {label: 'Copy this sheet&rsquo;s data', action: copySheetData}
	];
    });
    attachLongPress('tradeButton', function() {
	return [
	    {label: 'Swap <i>x</i> &amp; <i>y</i> data', action: function() { tradeData(false); }},
	    {label: 'Swap <i>x</i> &amp; <i>y</i> data <b>and</b> labels', action: function() { tradeData(true); }}
	];
    });
    attachLongPress('downloadImageButton', function() {
	return [
	    {label: 'Copy graph to clipboard', action: function() {
		withDownloadSetting(false, function() { downloadGraph(false); });
	    }},
	    {label: 'Download graph as a PNG file', action: function() {
		withDownloadSetting(true, function() { downloadGraph(false); });
	    }},
	    {label: 'Open graph in a new tab', action: function() { downloadGraph(true); }},
	    {label: 'Show graph to save to Photos', action: function() {
		if (thereIsNoGraph) {
		    return;
		}
		downloading = true;
		computeAll();
		var url = canvas1.toDataURL('image/png');
		downloading = false;
		computeAll();
		showGraphImage(url);
	    }}
	];
    });
    attachLongPress('saveGraphButton', function() {
	return [
	    {label: 'Save in this browser', action: saveGraph},
	    {label: 'Save to a file&hellip;', action: exportGraphFile}
	];
    });
}

// Section:  Maintenance & Utilities *******************************************************************************************
//
function delay(ms) {
    return new Promise(dummy => setTimeout(dummy, ms));
}

function checkSettings() {
    var gridSetting = localStorage.getItem('nPlotGrid');
    if (gridSetting == 'false') {
	document.getElementById("showGrid").checked = false;
	yesGrid = false;
    } else {
	document.getElementById("showGrid").checked = true;
	yesGrid = true;
    }
    // var pointSetting = localStorage.getItem('nPlotPoints');
    // if (pointSetting == 'false') {
    // 	document.getElementById("showPoints").checked = false;
    // 	yesPoints = false;
    // } else {
    // 	document.getElementById("showPoints").checked = true;
    // 	yesPoints = true;
    // }
    var scaleSetting = localStorage.getItem('nPlotScale');
    if (scaleSetting == 'false') {
	document.getElementById("includeBars").checked = false;
	scaleWithBars = false;
    } else {
	document.getElementById("includeBars").checked = true;
	scaleWithBars = true;
    }
    var formulaSetting = localStorage.getItem('nFormulas');
    if (formulaSetting == 'false') {
	document.getElementById("inclFormulas").checked = false;
	includeFormulas = false;
    } else {
	document.getElementById("inclFormulas").checked = true;
	includeFormulas = true;
    }
    var downloadSetting = localStorage.getItem('nPlotYesDnld');
    if (downloadSetting == 'false' || downloadSetting == null) {
	document.getElementById("yesDownload").checked = false;
	document.getElementById('downloadImageButton').innerHTML = 'Graph to Clipboard';
	yesDownload = false;
	document.getElementById("includeFit").checked = false;
	includeFit = false;
    } else {
	document.getElementById("yesDownload").checked = true;
	document.getElementById('downloadImageButton').innerHTML = 'Download Graph';
	yesDownload = true;
    }
    
    var includeFitSetting = localStorage.getItem('nPlotInclFit');
    if (includeFitSetting == 'false' || includeFitSetting == null) {
	document.getElementById("includeFit").checked = false;
	includeFit = false;
    } else {
	if(downloadSetting == 'true') {
	    document.getElementById("includeFit").checked = true;
	    includeFit = true;
	} else {
	    document.getElementById("includeFit").checked = false;
	    localStorage.setItem('nPlotInclFit', 'false');
	    includeFit = false;
	}
    }
    var profModeSetting = localStorage.getItem('nPlotProfMode');
    if (profModeSetting == 'true' || profModeSetting == null) {
	profMode = true;
	document.getElementById("professionalMode").checked = true;
    } else {
	profMode = false;
	document.getElementById("professionalMode").checked = false;
    }
    // iPad edition: Suppress Uncertainties is now saved, and defaults to ON
    var noUncertaintySetting = localStorage.getItem('nPlotNoUncertainty');
    if (noUncertaintySetting == 'true' || noUncertaintySetting == null) {
	noUncertainty = true;
	document.getElementById("noUncertainty").checked = true;
    } else {
	noUncertainty = false;
	document.getElementById("noUncertainty").checked = false;
    }
    // iPad edition: new Show Error Bars setting, saved, defaults to OFF
    var showBarsSetting = localStorage.getItem('nPlotShowBars');
    if (showBarsSetting == 'true') {
	showErrorBars = true;
	document.getElementById("showErrorBars").checked = true;
    } else {
	showErrorBars = false;
	document.getElementById("showErrorBars").checked = false;
    }
    var autoZoomSetting = localStorage.getItem('nPlotAutoZoom');
    if (autoZoomSetting == 'false') {
	autoZoom = false;
	document.getElementById("autoZoom").checked = false;
    } else {
	autoZoom = true;
	document.getElementById("autoZoom").checked = true;
    }
    document.getElementById("requireOrigin").checked = true;

    var prefSettings = localStorage.getItem('nPlotSymbols');
    if (prefSettings != null) {
	sheetSymbols = prefSettings.split(',');
    }

    var prefSettings = localStorage.getItem('nPlotColors');
    if (prefSettings != null) {
	sheetColors = prefSettings.split(',');
    }
    
    var prefSettings = localStorage.getItem('nPlotDashes');
        if (prefSettings != null) {
	    sheetDashes = prefSettings.split(',');
	}
}

async function checkVersion() {
    var updateBody ='<p class="upara"><b>New in the iPad edition (6.20i):</b></p>' +
	'<p class="upara">Works with touch: drag a finger on the graph to place notes and arrows or move the tangent finder.</p>' +
	'<p class="upara">No keyboard? Press and hold Clear Data, Swap x &amp; y, Save Graph, or Graph to Clipboard for more options.</p>' +
	'<p class="upara">Save a graph to a file, and open it again later, from the Recall Graph panel.</p>' +
	'<p class="upara">Copy Slopes copies the tangent slope at every data point (e.g. velocities from a position graph).</p>' +
	'<p class="upara">Error bars and fit uncertainties are hidden unless you turn them on in Preferences.</p>' +
	'<br>' +
	'<p class="upara"><b>New in version 6.20:</b></p>' +
	'<p class="upara">New controls to linearize you data within nPlot.</p>' +
	'<p class="upara">New Advanced Model: fit to a logarithmic function.</p>' +
	'<p class="upara">New controls in Preferences to hide the data points on each sheet.</p>' +
	'<p class="upara">Professional Mode is now the default for displaying fit results.</p>' +
	'<br>' +
	'<p class="upara"><b>New in version 6.10:</b></p>' +	
	'<p class="upara">Annotation now includes formula of fit. Turn off in Preferences.</p>' +
	'<p class="upara">Non-numeric superscripts available using ^{stuff}. See User Manual.</p>' +
	'<br>' +
	'<p class="upara">There are other minor changes and bug fixes. See Change Log for full details.</p>';

    var verMatch = true;
    var verString = localStorage.getItem('nPlotVersion');
    if (verString === null) {
	verMatch = false;
	document.getElementById('updateVersion').innerHTML = 'nPlot, version ' + version;
	document.getElementById('updateText').innerHTML = '<p>Welcome to the free data analysis program for introductory science labs.</p>' +
	    '<p style="margin-bottom: 10px">For first time users, here are the TLDR instructions to get you going:</p>' + 
	    '<ol><li>Enter your data in the &quot;data&quot; columns in the spreadsheet</li><li>Label your axes using the entry fields ' +
	    '(below the spreadsheet)</li><li>Fit a line to your data by selecting a model from the choices in the middle of the ' +
	    'page</li><li>Press the &quot;Graph to Clipboard&quot; button to copy your graph and paste it into a document</li></ol>' +
	    '<p>To learn about additional tools and features, click on the &quot;User Manual&quot; button.</p>' + updateBody;
    } else if (verString != version) {
	verMatch = false;
	document.getElementById('updateVersion').innerHTML = '<p style="margin-bottom: 30px"> nPlot has been updated to version ' + version + '</p>';
	document.getElementById('updateText').innerHTML = updateBody;
    }
    if (!verMatch) {
	document.getElementById('updateModal').style.display = 'block';
    	localStorage.setItem('nPlotVersion', version);
    }
}	

