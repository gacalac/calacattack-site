//  Sigmund Video Analysis program for the analysis of time and position information in motion videos
//  Copyright (C) 2022-2026  Geoff Nunes

//  This program is free software: you can redistribute it and/or
//  modify it under the terms of the GNU General Public License Version 3
//  as published by the Free Software Foundation.

//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.

//  You should have received a copy of the GNU General Public License
//  along with this program.  If not, see <https://www.gnu.org/licenses/>.
//
//  MODIFIED VERSION (2026).  Derived from Sigmund 2.16 by Geoff Nunes (https://noragulfa.com/sigmund/).
//  Changes (touch input, scaling, video loading, clipboard fallback, bug fixes) are listed in CHANGES.md.
//
var version = "2.16.1";
document.getElementById('version').textContent = 'Sigmund Video Analyzer ' + version + ' (compatibility fork)';
// to do list ****************************************************************************************************
//
//
//  zoom?  would need to drag the image to pan.  drag data points too?  This will be a fun project!

// BUGS
//
// global parameters **************************************************************************************************
//
var nRows = 100;
var vidWidth = 0;
var vidHeight = 0;
var vidLength = 0;
var frameRate = 0;
var frames = [];      // duration of each frame in video, in seconds
var times = [];       // time of each frame.  times[n] = sum of frames 0 to n (see getDisplayRate for details)
var manualTimes = [];
var vidFrames = 0;
var screenWidth = 960;
var screenHeight = 540;
var displayWidth = 960;
var displayHeight = 540;
var hOffset = 0;
var vOffset = 0;
var progBarMax = 469;
var pBarSize = 469;
var curSiz = 30;
var calibration = 1;
var length = 0;
var unit = '';
var frameZero = 0;
var centerX = 0;
var centerY = 0;
var nCollected = 0;
var tData = [];
var xData = [];
var yData = [];
var calVector = {xStart: 0, yStart: 0, xEnd: 0, yEnd: 0};
var meaVector = {xStart: 0, yStart: 0, xEnd: 0, yEnd: 0};
var maxRate = 32;
var timeBase = 1;
var manualFPS = 0;
var backgroundColor = "#F0F0F0";
var fontColor = "#4C6A94";
var hoverColor = "#D0D0D0";
var standardBorder = "2px solid #4C6A94";
var cancelBorder = "2px solid #FF0000";
var cursorColor = '#FF00FF';

// global traffic control ************************************************************************
// 
var vidLoading = false;
var vidLoaded = false;
var haveMetadata = false;
var gettingFPS = false;
var gotFPS = false;
var playing = false;
var frame = 0;             // current frame being displayed
var dFrame = 0;
var haveProgBar = false;
var seeking = false;
var seeked = false;
var calibrating = false;
var calStarted = false;
var calibrated = false;
var calDone = false;
var calCanceled = false;
var tZeroed = false;
var xZeroing = false;
var xZeroed = false;
var yZeroing = false;
var yZeroed = false;
var collecting = false;
var collected = false;
var calButtonCancel = false;
var xZeroCancel = false;
var yZeroCancel = false;
var responded = false;
var yesResponse = false;
var measuring = false;
var measureStarted = false;
var measured = false;
var measureCancel = false;
var hideDataPoints = false;
var displayOrigin = false;
var showScaleText = false;
var badVideo = false;
var badBrowser = false;
var updateAcknowledge = false;
var useManualFPS = false;
var virgin = true;
var videoMuted = true;
var seekPending = false;      // true while the video is still moving to a requested frame
var seekTimer = null;
var objectUrl = null;
var parseSettled = false;     // frame-timing table has been read (or we know it can't be)
var videoInitDone = false;
var frameTableEstimated = false;
var guideState = '';
var touchCommit = null;       // touch/pen position, committed when the finger or pen is lifted
var measureLongPress = false;
var measureTimer = null;
var flashTimer = null;
var videoFileName = 'video';
var STAGE_W = 1366;
var STAGE_H = 620;
var tipDismissed = false;

// canvas layers ****************************************************************************
//
var calCan = document.getElementById("calibrate");  // z index 2
var calCtx = calCan.getContext("2d");
var orgCan = document.getElementById("origin");     // z index 3
var orgCtx = orgCan.getContext("2d");
var meaCan = document.getElementById("measure");    // z index 4
var meaCtx = meaCan.getContext("2d");
var ptsCan = document.getElementById("points");     // z index 5
var ptsCtx = ptsCan.getContext("2d");
var timCan = document.getElementById("time");       // z index 6
var timCtx = timCan.getContext("2d");
var curCan = document.getElementById("cursor");     // z index 7
var curCtx = curCan.getContext("2d");

// front panel elements *******************************************************************
//
var main = document.getElementById('mainContainer');
var vidWrap = document.getElementById('videoWrapper');
var dropBox = document.getElementById("dropBox");
var theVideo = document.getElementById("theVideo");
var fileSelector = document.getElementById('file-selector');
var progControl = document.getElementById('vcProgressBar');
var theProgBar = document.getElementById('videoProgress');
var frameCounter = document.getElementById('frameCounter');
var calButton = document.getElementById('calButton');
var tZeroButton = document.getElementById('setTZero');
var xZeroButton = document.getElementById('setXZero');
var yZeroButton = document.getElementById('setYZero');
var getDataButton = document.getElementById('getDataButton');
var calDialogPane = document.getElementById('calDialogPane');
var skipInput = document.getElementById('skipInput');
var measureDistance = document.getElementById('measureDistance');
var hidePoints = document.getElementById('hidePoints');
var showOrigin = document.getElementById('showOrigin');
var showScale = document.getElementById('showScale');
var copyXData = document.getElementById('copyXData');
var copyYData = document.getElementById('copyYData');
var copyBothXandY = document.getElementById('copyBothXandY');
var badVideoOKButton = document.getElementById('badVideoOKButton');
var dialogContainer = document.getElementById('dialogContainer');
var confirmCopyMessage = document.getElementById('confirmCopyMessage');
var skipFrameButton = document.getElementById('skipFrameButton');

// ***********************************************************************************************************************
// event listeners
//
dropBox.addEventListener("dragenter", dragenter);
dropBox.addEventListener("dragover", dragover);
dropBox.addEventListener("drop", drop);
fileSelector.addEventListener('change', readFile);
theVideo.addEventListener('loadedmetadata', getMetaData);
// iOS Safari does not always fire canplaythrough, so any of these can start things off (tryInitVideo only runs once)
theVideo.addEventListener('loadeddata', function() { tryInitVideo(); });
theVideo.addEventListener('canplay', function() { tryInitVideo(); });
theVideo.addEventListener('canplaythrough', function() { tryInitVideo(); });
theVideo.addEventListener('error', showBadVideo);
theVideo.addEventListener('seeked', onSeeked);
theVideo.addEventListener('ended', function() { if (playing) { stopPlaying(); } });
document.getElementById('replay').addEventListener('click', resetVideo);
document.getElementById('stepForward').addEventListener('click', function() {
    fwdStep(1);
});
document.body.addEventListener('keydown', function(event) {
    var tag = event.target && event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !vidLoaded) {
        return;     // arrow keys belong to text fields; nothing to step before a video is loaded
    }
    if (event.key == 'ArrowRight') {
        event.preventDefault();
        fwdStep(1);
    } else if (event.key == 'ArrowLeft') {
        event.preventDefault();
        bakStep();
    }
});
document.getElementById('stepBack').addEventListener('click', bakStep);
skipFrameButton.addEventListener('click', skipThisFrame);
document.getElementById("manualFrameRate").addEventListener('click', function(e) {
    getManualFrameRate();
});
// const rateList = document.querySelectorAll('.frameRateValue');
// rateList.forEach(function(rate) {
//     rate.addEventListener('click', function(e) {
// 	manualFPS = Number(e.currentTarget.dataset.value);
// 	setManualFrameRate();
//     });
// });
// document.getElementById("manualFrameRate").addEventListener('change', function(e) {
//     manualFPS = Number(e.target.value);
//     setManualFrameRate();
// });
document.getElementById('selectManual').addEventListener('click', function(e) {
    if (useManualFPS) {
	e.target.checked = false;
	useManualFPS = false;
	document.getElementById("manualFrameRate").value = "";
	document.getElementById("frameRateSelector").style.display = "none";
    } else {
	e.target.checked = true;
	getManualFrameRate();
    }
});
calButton.addEventListener('click', function(event) {
    if (event.shiftKey) {
	setInterface('tZero');
    } else {
	startCalibration()
    }
});
document.getElementById('calDone').addEventListener('click', function(e) {
    calDone = true;
});
document.getElementById('calCancel').addEventListener('click', function(e) {
    calCanceled = true;
});
tZeroButton.addEventListener('click', function(e) {
    if (e.shiftKey) {
	setInterface('xZero');
    } else {
	setZero('T');
    }
});
xZeroButton.addEventListener('click', function(e) {
    if (e.shiftKey) {
	setInterface('yZero');
    } else {
	setZero('X');
    }
});
yZeroButton.addEventListener('click', function(e) {
    if (e.shiftKey) {
	setInterface('done');
    } else{
	setZero('Y');
    }
});
getDataButton.addEventListener('click', startCollecting);
document.getElementById('doneCollecting').addEventListener('click', doneCollecting);
document.getElementById('cancelCollecting').addEventListener('click', cancelCollecting);
measureDistance.addEventListener('click', function(e) {
    if (measureLongPress) {
	measureLongPress = false;
	return;
    }
    if (e.shiftKey) {
	clearCan(meaCtx);
    } else {
	startMeasuring();
    }
});
hidePoints.addEventListener('click', togglePoints);
showOrigin.addEventListener('click', toggleOrigin);
showScale.addEventListener('click', toggleScale);
copyXData.addEventListener('click', function(e) {
    if (e.shiftKey) {
	dataToClipboard('x', true);
    } else {
	dataToClipboard('x', false);
    }
});
copyYData.addEventListener('click', function(e) {
    if (e.shiftKey) {
	dataToClipboard('y', true);
    } else {
	dataToClipboard('y', false);
    }
});
copyBothXandY.addEventListener('click', function(e) {
    if (e.shiftKey) {
	dataToClipboard('both', true);
    } else {
	dataToClipboard('both', false);
    }
});
document.getElementById('doIt').addEventListener('click', function(e) {
    yesResponse = true;
    responded = true;
});
document.getElementById('nope').addEventListener('click', function(e) {
    yesResponse = false;
    responded = true;
});
document.getElementById('newVideo').addEventListener('click', function() {
    location.reload();
});
document.getElementById('getHelp').addEventListener('click', function(e) {
    dialogContainer.style.zIndex = '11';
    document.getElementById('helpPane').style.display = 'block';
});
document.getElementById('helpClose').addEventListener('click', function(e) {
    dialogContainer.style.zIndex = '0';
    document.getElementById('helpPane').style.display = 'none';
});
document.getElementById('aboutButton').addEventListener('click', function(e) {
    dialogContainer.style.zIndex = '11';
    document.getElementById('aboutPane').style.display = 'block';
});
document.getElementById('aboutClose').addEventListener('click', function(e) {
    dialogContainer.style.zIndex = '0';
    document.getElementById('aboutPane').style.display = 'none';
});
badVideoOKButton.addEventListener('click', function() {
    location.reload();
});
document.getElementById('largeVideoOKButton').addEventListener('click', function() {
    location.reload();
});
document.getElementById('updateMessageButton').addEventListener('click', function() {
    updateAcknowledge = true;
});
document.getElementById('noVideoOKButton').addEventListener('click', function() {
    responded = true;
});
document.getElementById('muted').addEventListener('click', function () {
    toggleVideoSound();
});
document.getElementById('unmuted').addEventListener('click', function () {
    toggleVideoSound();
});

// listeners needed because css hover is fragile************************************************************************************
calButton.addEventListener('pointerenter', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    hiliteButton(calButton, calButtonCancel);
});
calButton.addEventListener('pointerleave', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    normalButton(calButton, calButtonCancel);
});
tZeroButton.addEventListener('pointerenter', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    hiliteButton(tZeroButton, false);
});
tZeroButton.addEventListener('pointerleave', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    normalButton(tZeroButton, false);
});
xZeroButton.addEventListener('pointerenter', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    hiliteButton(xZeroButton, xZeroCancel);
});
xZeroButton.addEventListener('pointerleave', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    normalButton(xZeroButton, xZeroCancel);
});
yZeroButton.addEventListener('pointerenter', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    hiliteButton(yZeroButton, yZeroCancel);
});
yZeroButton.addEventListener('pointerleave', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    normalButton(yZeroButton, yZeroCancel);
});
getDataButton.addEventListener('pointerenter', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    hiliteButton(getDataButton, false);
});
getDataButton.addEventListener('pointerleave', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    normalButton(getDataButton, false);
});
measureDistance.addEventListener('pointerenter', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    hiliteButton(measureDistance, measureCancel);
});
measureDistance.addEventListener('pointerleave', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    normalButton(measureDistance, measureCancel);
});
hidePoints.addEventListener('pointerenter', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    hiliteButton(hidePoints, false);
});
hidePoints.addEventListener('pointerleave', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    normalButton(hidePoints, false);
});
showOrigin.addEventListener('pointerenter', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    hiliteButton(showOrigin, false);
});
showOrigin.addEventListener('pointerleave', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    normalButton(showOrigin, false);
});
showScale.addEventListener('pointerenter', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    hiliteButton(showScale, false);
});
showScale.addEventListener('pointerleave', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    normalButton(showScale, false);
});
newVideo.addEventListener('pointerenter', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    hiliteButton(newVideo, false);
});
newVideo.addEventListener('pointerleave', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    normalButton(newVideo, false);
});
getHelp.addEventListener('pointerenter', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    hiliteButton(getHelp, false);
});
getHelp.addEventListener('pointerleave', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    normalButton(getHelp, false);
});
aboutButton.addEventListener('pointerenter', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    hiliteButton(aboutButton, false);
});
aboutButton.addEventListener('pointerleave', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    normalButton(aboutButton, false);
});
copyXData.addEventListener('pointerenter', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    if (nCollected > 0) {
	hiliteButton(copyXData, false);
    }
});
copyXData.addEventListener('pointerleave', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    normalButton(copyXData, false);
});
copyYData.addEventListener('pointerenter', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    if (nCollected > 0) {
	hiliteButton(copyYData, false);
    }
});
copyYData.addEventListener('pointerleave', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    normalButton(copyYData, false);
});
copyBothXandY.addEventListener('pointerenter', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    if (nCollected > 0) {
	hiliteButton(copyBothXandY, false);
    }
});
copyBothXandY.addEventListener('pointerleave', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    normalButton(copyBothXandY, false);
});
nPlotLauncher.addEventListener('pointerenter', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    hiliteButton(nPlotLauncher, false);
});
nPlotLauncher.addEventListener('pointerleave', function(e) {
    if (e.pointerType !== 'mouse') { return; }
    normalButton(nPlotLauncher, false);
});
window.addEventListener('resize', function (e) {
    setScreenZoom(true);
});

// ***********************************************************************************************************************
// MAIN PROGRAM

// **************************************************************************************************************
// user interface: calibration & data acquisition
function mDownAction(p) {
    // mouse down on canvas
    var mx = p.x;
    var my = p.y;
    if (calibrating) {
	if (!calStarted) {
	    calVector.xStart = mx;
	    calVector.yStart = my;
	    calStarted = true;
	    return
	} else {
	    calVector.xEnd = mx;
	    calVector.yEnd = my;
	    calibrating = false;
	    calStarted = false;
	    curCan.style.cursor = "default";
	    clearCan(curCtx);
	    clearCan(calCtx);
	    calCtx.lineWidth = 1;
	    calCtx.strokeStyle = cursorColor;
	    calCtx.beginPath();
	    calCtx.moveTo(calVector.xStart, calVector.yStart);
	    calCtx.lineTo(calVector.xEnd, calVector.yEnd);
	    calCtx.stroke();
	    getCalibration();
	    return;
	}
    }
    if (xZeroing) {
	centerX = mx;
	xZeroed = true;
	xZeroing = false;
	curCan.style.cursor = 'default';
	clearCan(curCtx);
	xZeroCancel = false;
	resetButton(xZeroButton, 'Set <i>x</i> = 0');
	setInterface('yZero');
	return;
    }
    if (yZeroing) {
	centerY = my;
	yZeroed = true;
	yZeroing = false;
	curCan.style.cursor = 'default';
	clearCan(curCtx);
	yZeroCancel = false;
	resetButton(yZeroButton, 'Set <i>y</i> = 0');
	setInterface('done');
	return;
    }
    if (collecting) {
	if (seekPending) {
	    return;       // the previous frame is still loading: a click now would be on the old picture
	}
	if (nCollected >= nRows) {
	    doneCollecting();
	    flashMessage('The table is full (' + nRows + ' points).', 2500);
	    return;
	}
	drawPoint(mx, my);
	addPoint(mx, my);
	fwdStep(skipInput.value);
	if (nCollected >= nRows) {
	    doneCollecting();
	    flashMessage('The table is full (' + nRows + ' points).', 2500);
	}
    }
    if (measuring) {
	if (!measureStarted) {
	    meaVector.xStart = mx;
	    meaVector.yStart = my;
	    measureStarted = true;
	    return
	} else {
	    meaVector.xEnd = mx;
	    meaVector.yEnd = my;
	    measuring = false;
	    measureStarted = false;
	    measureCancel = false;
	    resetButton(measureDistance, 'Measure');
	    curCan.style.cursor = "default";
	    clearCan(curCtx);
	    drawScale('meas', true, meaCtx);
	    return;
	}
    }
}

function mMoveAction(p) {
    // mouse movement on canvas
    var mx = p.x;
    var my = p.y;
    if (calibrating && !calStarted) {
	curCan.style.cursor = "none";
	drawCrosshairs(mx, my);
	return;
    }
    if (calStarted) {
	drawCrosshairs(mx, my);
	curCtx.lineWidth = 1;
	curCtx.strokeStyle = cursorColor;
	curCtx.beginPath();
	curCtx.moveTo(calVector.xStart, calVector.yStart);
	curCtx.lineTo(mx, my);
	curCtx.stroke();
	return;
    }
    if (xZeroing) {
	clearCan(curCtx);
	curCtx.lineWidth = 1;
	curCtx.strokeStyle = cursorColor;
	curCtx.beginPath();
	curCtx.moveTo(mx, 0);
	curCtx.lineTo(mx, displayHeight);
	curCtx.stroke();
	return;
    }	
    if (yZeroing) {
	clearCan(curCtx);
	curCtx.lineWidth = 1;
	curCtx.strokeStyle = cursorColor;
	curCtx.beginPath();
	curCtx.moveTo(0, my);
	curCtx.lineTo(displayWidth, my);
	curCtx.stroke();
	return;
    }
    if (collecting) {
	drawCrosshairs(mx, my);
	return;
    }
    if (measuring && !measureStarted) {
	curCan.style.cursor = 'none';
	drawCrosshairs(mx, my);
	return;
    }
    if (measureStarted) {
	drawCrosshairs(mx, my);
	curCtx.lineWidth = 1;
	curCtx.strokeStyle = cursorColor;
	curCtx.beginPath();
	curCtx.moveTo(meaVector.xStart, meaVector.yStart);
	curCtx.lineTo(mx, my);
	curCtx.stroke();
	return;
    }
}
	    
function drawCrosshairs(xp, yp) {
    clearCan(curCtx);
    curCtx.lineWidth = 1;
    curCtx.strokeStyle = cursorColor;
    curCtx.beginPath();
    curCtx.moveTo(xp, yp-curSiz);
    curCtx.lineTo(xp, yp+curSiz);
    curCtx.moveTo(xp-curSiz, yp);
    curCtx.lineTo(xp+curSiz, yp);
    curCtx.stroke();
}

function togglePoints() {
    if (hideDataPoints) {
	hideDataPoints = false;
	ptsCan.style.display = 'block';
	hidePoints.innerHTML = 'Hide points';
    } else {
	hideDataPoints = true;
	ptsCan.style.display = 'none';
	hidePoints.innerHTML = 'Show points';
    }
}

function toggleOrigin() {
    if (displayOrigin) {
	displayOrigin = false;
	clearCan(orgCtx);
	showOrigin.innerHTML = 'Show origin';
    } else {
	displayOrigin = true;
	clearCan(orgCtx);
	clearCan(orgCtx);
	orgCtx.lineWidth = 1;
	orgCtx.strokeStyle = cursorColor;
	orgCtx.beginPath();
	orgCtx.moveTo(0, centerY);
	orgCtx.lineTo(displayWidth, centerY);
	orgCtx.moveTo(centerX, 0);
	orgCtx.lineTo(centerX, displayHeight);
	orgCtx.stroke();
	frame = frameZero;
	seekToFrameTime(frame);
	setFrameCounter(frame);
	updateProgressBar();
	showOrigin.innerHTML = 'Hide origin';
    }
}

function toggleScale() {
    if (showScaleText) {
	showScaleText = false;
	showScale.innerHTML = 'Show scale';
	drawScale('cal', false, calCtx);
    } else {
	showScaleText = true;
	showScale.innerHTML = 'Hide scale';
	drawScale('cal', true, calCtx);
    }
}
	
// ***************************************************************************************************************
// data acquisition and manipulation functions
//
async function startCollecting() {
    if (calibrating || xZeroing || yZeroing || measuring) {
	return;
    }
    if (nCollected > 0) {
	setWarnMessage('data');
	dialogContainer.style.zIndex = '11';
	document.getElementById('messagePane').style.display = 'flex';
	document.getElementById('dataWarnContainer').style.display = 'flex';
	while (!responded) {
	    await delay(50);
	}
	responded = false;
	document.getElementById('messagePane').style.display = 'none';
	document.getElementById('dataWarnContainer').style.display = 'none';
	dialogContainer.style.zIndex = '0';
	if (yesResponse) {
	    yesResponse = false;
	    var goAhead = true;
	} else {
	    var goAhead = false;
	}
	if (goAhead) {
	    clearDataTable();
	} else {
	    return;
	}
    }
    collecting = true;
    collected = false;
    dFrame = frame;
    document.getElementById('getButton').style.display = 'none';
    document.getElementById('whileCollectingButtons').style.display = 'flex';
    curCan.style.cursor = 'none';
    clearCan(curCtx);
    clearCan(ptsCtx);
}	

function doneCollecting() {
    collecting = false;
    collected = false;
    dFrame = frame;
    document.getElementById('getButton').style.display = 'flex';
    document.getElementById('whileCollectingButtons').style.display = 'none';
    curCan.style.cursor = 'default';
    clearCan(curCtx);
}	

function cancelCollecting() {
    collecting = false;
    collected = false;
    dFrame = frame;
    document.getElementById('getButton').style.display = 'flex';
    document.getElementById('whileCollectingButtons').style.display = 'none';
    curCan.style.cursor = 'default';
    clearCan(curCtx);
    clearCan(ptsCtx);
    clearDataTable();
}

function drawPoint(x, y) {
    ptsCtx.fillStyle = '#ff0000';
    ptsCtx.beginPath();
    ptsCtx.arc(x, y, 3, 0, 2*Math.PI);
    ptsCtx.fill();
}

function addPoint(x, y) {
    nCollected = nCollected + 1;
    if (useManualFPS) {
	var tReal = (manualTimes[dFrame] - manualTimes[frameZero]);
    } else {
	var tReal = (frameStart(dFrame) - frameStart(frameZero))/ timeBase;
    }
    var xpix = x - centerX;
    var xReal = xpix * calibration;
    var ypix = -(y - centerY);
    var yReal = ypix * calibration;
    tData.push(tReal);
    xData.push(xReal);
    yData.push(yReal);
    document.getElementById('t' + String(nCollected - 1)).innerHTML = tReal.toFixed(3);
    document.getElementById('x' + String(nCollected - 1)).innerHTML = xReal.toFixed(3);
    document.getElementById('y' + String(nCollected - 1)).innerHTML = yReal.toFixed(3);
}

function clearDataTable() {
    nCollected = 0;
    collected = false;
    dFrame = frame;
    tData = [];
    xData = [];
    yData = [];
    for (let i = 0; i < nRows; i++) {
	document.getElementById('t' + String(i)).innerHTML = '';
	document.getElementById('x' + String(i)).innerHTML = '';
	document.getElementById('y' + String(i)).innerHTML = '';
    }
    clearCan(ptsCtx);
}
	
function buildDataText(which, headings) {
    var dataText = '';
    if (headings) {
	if (which == 'x') {
	    dataText = 't (s) \t x (' + unit + ')\n';
	} else if (which == 'y') {
	    dataText = 't (s) \t y (' + unit + ')\n';
	} else {
	    dataText = 't (s) \t x (' + unit + ') \t y (' + unit + ')\n';
	}
    }
    for (let i = 0; i < nCollected; i++) {
	if (which == 'x') {
	    dataText = dataText + tData[i].toFixed(3) + '\t' + xData[i].toFixed(3) + '\n';
	} else if (which == 'y') {
	    dataText = dataText + tData[i].toFixed(3) + '\t' + yData[i].toFixed(3) + '\n';
	} else {
	    dataText = dataText + tData[i].toFixed(3) + '\t' + xData[i].toFixed(3) + '\t' + yData[i].toFixed(3) + '\n';
	}
    }
    return dataText;
}

function dataToClipboard(which, headings) {
    if (nCollected == 0) {
	return;
    }
    var box = document.getElementById('includeHeadings');
    if (box && box.checked) {
	headings = true;      // same as shift-clicking, for devices without a shift key
    }
    var dataText = buildDataText(which, headings);
    var what;
    if (which == 'x') {
	what = '<i>x</i> vs. <i>t</i> data';
    } else if (which == 'y') {
	what = '<i>y</i> vs. <i>t</i> data';
    } else {
	what = 'Both <i>x</i> and <i>y</i> vs. <i>t</i>';
    }
    copyText(dataText).then(function(ok) {
	if (ok) {
	    flashMessage(what + (headings ? ' (with headings)' : '') + ' copied to clipboard', 1500);
	} else {
	    flashMessage('This browser blocked copying.<br>Use <b>Download CSV</b> instead.', 3500);
	}
    });
}

function copyText(text) {
    // Clipboard API first (needs https or localhost); older-style copy as the fallback
    function legacyCopy() {
	var ok = false;
	try {
	    var ta = document.createElement('textarea');
	    ta.value = text;
	    ta.setAttribute('readonly', '');
	    ta.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;font-size:16px;';
	    document.body.appendChild(ta);
	    ta.focus();
	    ta.select();
	    ta.setSelectionRange(0, text.length);
	    ok = document.execCommand('copy');
	    document.body.removeChild(ta);
	} catch (err) {
	    ok = false;
	}
	return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
	return navigator.clipboard.writeText(text).then(function() { return true; }, function() { return legacyCopy(); });
    }
    return Promise.resolve(legacyCopy());
}

function downloadCSV() {
    if (nCollected == 0) {
	flashMessage('There is no data to save yet.', 1500);
	return;
    }
    function cell(s) {
	return '"' + String(s).replace(/"/g, '""') + '"';
    }
    var lines = [[cell('t (s)'), cell('x (' + unit + ')'), cell('y (' + unit + ')')].join(',')];
    for (let i = 0; i < nCollected; i++) {
	lines.push([tData[i].toFixed(3), xData[i].toFixed(3), yData[i].toFixed(3)].join(','));
    }
    var blob = new Blob(['\ufeff' + lines.join('\r\n') + '\r\n'], {type: 'text/csv;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = videoFileName.replace(/\.[^.]*$/, '') + '-data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 3000);
}

function setWarnMessage(whichMessage) {
    if (whichMessage == 'zero'  || whichMessage == 'calibrate') {
	document.getElementById('dwLine2').innerHTML = 'Is that what you want to to?';
	document.getElementById('doIt').innerHTML = 'Yes, it is.';
	document.getElementById('nope').innerHTML = 'No, it is not.';
    } else if (whichMessage == 'data') {
	document.getElementById('dwLine2').innerHTML = 'Have you pasted it somewhere?';
	document.getElementById('doIt').innerHTML = 'Yes, I have.';
	document.getElementById('nope').innerHTML = 'No, I have not.';
    }
}	

// ***************************************************************************************************************
// origin setting functions
//
async function setZero(which) {
    if (calibrating || measuring) {
	return
    }
    if (nCollected > 0) {
	if (tZeroed || xZeroed || yZeroed || collecting) {
	    setWarnMessage('zero');
	    dialogContainer.style.zIndex = '11';
	    document.getElementById('messagePane').style.display = 'flex';
	    document.getElementById('dataWarnContainer').style.display = 'flex';
	    while (!responded) {
		await delay(50);
	    }
	    responded = false;
	    dialogContainer.style.zIndex = '0';
	    document.getElementById('messagePane').style.display = 'none';
	    document.getElementById('dataWarnContainer').style.display = 'none';
	    if (yesResponse) {
		yesResponse = false;
		var goAhead = true;
	    } else {
		var goAhead = false;
	    }
	    if (goAhead) {
		if (which == 'X') {
		    xZeroed = false;
		    centerX = 0;
		    xZeroing = false;
		} else if (which == 'Y') {
		    yZeroed = false;
		    centerY = 0;
		    yZeroing = false;
		} else {
		    tZeroed = false;
		    frameZero = 0;
		}
		cancelCollecting();
	    } else {
		return;
	    }
	} else {
	    if (which == 'X') {
		xZeroed = false;
		centerX = 0;
		xZeroing = false;
	    } else if (which == 'Y') {
		yZeroed = false;
		centerY = 0;
		yZeroing = false;
	    } else {
		tZeroed = false;
		frameZero = 0;
		dialogContainer.style.zIndex = '11';
		document.getElementById('messagePane').style.display = 'flex';
		document.getElementById('confirmTZeroContainer').style.display = 'flex';
		setTimeout(function() {
		    dialogContainer.style.zIndex = '0';
		    document.getElementById('messagePane').style.display = 'none';
		    document.getElementById('confirmTZeroContainer').style.display = 'none';
		}, 1500);
	    }
	}
    }
    if (which == 'X') {
	if (xZeroing) {
	    xZeroing = false;
	    curCan.style.cursor = 'default';
	    clearCan(curCtx);
	    xZeroCancel = false;
	    resetButton(xZeroButton, 'Set <i>x</i> = 0');
	    xZeroed = false;
	    return;
	} else {
	    if (yZeroing) {
		return;
	    }
	    xZeroing = true;
	    xZeroed = false;
	    xZeroCancel = true;
	    setButtonCancel(xZeroButton, 'Cancel');
	    curCan.style.cursor = 'none';
	    return;
	}
    } else if (which == 'Y') {
 	if (yZeroing) {
	    yZeroing = false;
	    curCan.style.cursor = 'default';
	    clearCan(curCtx);
	    yZeroCancel = false;
	    resetButton(yZeroButton, 'Set <i>y</i> = 0');
	    yZeroed = false;
	    return;
	} else {
	    if (xZeroing) {
		return;
	    }
	    yZeroing = true;
	    yZeroed = false;
	    yZeroCancel = true;
	    setButtonCancel(yZeroButton, 'Cancel');
	    curCan.style.cursor = 'none';
	    return;
	}
    } else if (which == 'T') {
	frameZero = frame;
	tZeroed = true;
	dialogContainer.style.zIndex = '11';
	document.getElementById('messagePane').style.display = 'flex';
	document.getElementById('confirmTZeroContainer').style.display = 'flex';
	setTimeout(function() {
	    dialogContainer.style.zIndex = '0';
	    document.getElementById('messagePane').style.display = 'none';
	    document.getElementById('confirmTZeroContainer').style.display = 'none';
	}, 1500);
	drawTimeStamp(frame);
	setInterface('xZero');
    } else {
	return;
    }
}

// *************************************************************************************************************************
// calibration and measuring functions
//
async function startCalibration() {
    if (!vidLoaded) {
	setWarnMessage('noVideo');
	dialogContainer.style.zIndex = '11';
	document.getElementById('messagePane').style.display = 'flex';
	document.getElementById('noVideoContainer').style.display = 'flex';
	while (!responded) {
	    await delay(50);
	}
	responded = false;
	dialogContainer.style.zIndex = '0';
	document.getElementById('messagePane').style.display = 'none';
	document.getElementById('noVideoContainer').style.display = 'none';
	return;
    }
    if (calibrated || collecting) {
	if (nCollected > 0) {
	    setWarnMessage('calibrate');
	    dialogContainer.style.zIndex = '11';
	    document.getElementById('messagePane').style.display = 'flex';
	    document.getElementById('dataWarnContainer').style.display = 'flex';
	    while (!responded) {
		await delay(50);
	    }
	    responded = false;
	    dialogContainer.style.zIndex = '0';
	    document.getElementById('messagePane').style.display = 'none';
	    document.getElementById('dataWarnContainer').style.display = 'none';
	    if (yesResponse) {
		yesResponse = false;
		var goAhead = true;
	    } else {
		var goAhead = false;
	    }
	    if (goAhead) {
		calibrated = false;
		clearCan(calCtx);
		calibrating = false;
		cancelCollecting();
	    } else {
		return;
	    }
	} else {
	    clearCan(calCtx);
	    calibrated = false;
	    calibrating = false;
	    if (collecting) {
		cancelCollecting();
	    }
	}
    }	
    if (!calibrating) {
	calibrating = true;
	clearCan(curCtx);
	calButtonCancel = true;
	setButtonCancel(calButton, 'Cancel');
    } else {
	calibrating = false;
	calStarted = false;
	clearCan(curCtx);
	calButtonCancel = false;
	resetButton(calButton, 'Calibrate');
	curCan.style.cursor = "default";
    }
}

function parseLength(text) {
    // accepts "2", "0.5", "0,5" (decimal comma, common on iPads set to European regions) and "12 cm"
    var t = String(text).replace(',', '.').replace(/[^0-9.]/g, '');
    var v = parseFloat(t);
    return (isFinite(v) && v > 0) ? v : NaN;
}

async function getCalibration() {
    var lengthInput = document.getElementById('length');
    var unitInput = document.getElementById('unit');
    lengthInput.value = '';
    unitInput.value = '';
    lengthInput.style.borderColor = '';
    dialogContainer.style.zIndex = '11';
    calDialogPane.style.display = 'flex';
    lengthInput.focus();
    var parsed = NaN;
    while (true) {
	while (!calDone && !calCanceled) {
	    await delay(50);
	}
	if (calCanceled) {
	    break;
	}
	parsed = parseLength(lengthInput.value);
	if (parsed > 0) {
	    break;
	}
	// a missing or zero length would make every measurement zero: ask again
	calDone = false;
	lengthInput.style.borderColor = '#FF0000';
	lengthInput.focus();
    }
    if (calDone) {
	calDone = false;
	length = parsed;
	var pixLength = Math.sqrt(Math.pow(calVector.xEnd - calVector.xStart, 2) + Math.pow(calVector.yEnd - calVector.yStart, 2));
	calibration = length/pixLength;
	unit = String(unitInput.value).trim();
	document.getElementById('xHead').textContent = 'x (' + unit + ')';
	document.getElementById('yHead').textContent = 'y (' + unit + ')';
	dialogContainer.style.zIndex = '0';
	calDialogPane.style.display = 'none';
	calibrated = true;
	calButtonCancel = false;
	resetButton(calButton, 'Re-calibrate');
	drawScale('cal', showScaleText, calCtx);
	setInterface('tZero');
    } else {
	calCanceled = false;
	calibrated = false;
	clearCan(calCtx);
	dialogContainer.style.zIndex = '0';
	calDialogPane.style.display = 'none';
	calButtonCancel = false;
	resetButton(calButton, 'Calibrate');
    }
}

function startMeasuring() {
    if (calibrating || xZeroing || yZeroing || collecting) {
	return;
    }
    if (!measuring) {
	measuring = true;
	clearCan(curCtx);
	measureCancel = true;
	setButtonCancel(measureDistance, 'Cancel');
    } else {
	measuring = false;
	measureStarted = false;
	measureCancel = false;
	resetButton(measureDistance, 'Measure');
	clearCan(curCtx);
	curCan.style.cursor = 'default';
    }
}

function drawScale(which, show, ctx) {
    var showText;
    if (which == 'cal') {
	clearCan(calCtx);
	showText = String(length) + ' ' + unit;
	var xs = calVector.xStart;
	var xe = calVector.xEnd;
	var ys = calVector.yStart;
	var ye = calVector.yEnd;
	var r = Math.sqrt(Math.pow(xe - xs, 2) + Math.pow(ye - ys, 2));
    } else {
	var xs = meaVector.xStart;
	var xe = meaVector.xEnd;
	var ys = meaVector.yStart;
	var ye = meaVector.yEnd;
	var r = Math.sqrt(Math.pow(xe - xs, 2) + Math.pow(ye - ys, 2));
	var mDist = r * calibration;
	if (unit == '') {
	    var localUnit = 'px';
	} else {
	    localUnit = unit;
	}
	showText = mDist.toFixed(3) + ' ' + localUnit;
    }	
    ctx.lineWidth = 1;
    ctx.strokeStyle = cursorColor;
    ctx.beginPath();
    ctx.moveTo(xs, ys);
    ctx.lineTo(xe, ye);
    ctx.stroke();
    if (show) {
	var cosTheta = (xe - xs)/r;
	var sinTheta = (ye - ys)/r;
	if (xs > xe) {
	    if (ys > ye) {
		var theta = Math.PI - Math.acos(cosTheta);
	    } else {
		var theta = Math.acos(cosTheta) - Math.PI;
	    }
	} else {
	    var theta = Math.asin(sinTheta);
	}
	ctx.save();
	var transX = xs + (xe - xs)/2;
	var transY = ys + (ye - ys)/2;
	ctx.translate(transX, transY);
	ctx.rotate(theta);
	ctx.font = '20px Arial';
	ctx.fillStyle = cursorColor;
	ctx.textAlign = 'center';
	ctx.fillText(showText, 0, -5);
	ctx.restore();
    }
}    

function setButtonCancel(button, text) {
    button.innerHTML = text;
    button.style.color = fontColor;
    button.style.backgroundColor = hoverColor;
    button.style.border = cancelBorder;
}

function resetButton(button, text) {
    button.innerHTML = text;
    button.style.color = fontColor;
    button.style.backgroundColor = backgroundColor;
    button.style.border = standardBorder;
}

function normalButton(button, cancel) {
    if (!cancel) {
	button.style.color = fontColor;
	button.style.backgroundColor = backgroundColor;
	button.style.border = standardBorder;
	button.style.cursor = 'default';
    }
}

function hiliteButton(button, cancel) {
    if (!cancel && vidLoaded) {
	button.style.color = fontColor;
	button.style.backgroundColor = hoverColor;
	button.style.border = standardBorder;
	button.style.cursor = 'pointer';
    }
}
function handleCalibrationDone(event) {
    if (event.key == 'Enter') {
	calDone = true;
    }
}

// **************************************************************************************************************
// user interface:  progress bar
//
    
// **************************************************************************************************************
// user interface:  video player buttons
//
function playPauseVideo() {
    if (!vidLoaded) {
	return;
    }
    if (!playing) {
	if (collecting) {
	    return;       // frames are stepped by hand while collecting
	}
	playing = true;
	document.getElementById('play').innerHTML = icon('pause');
	manageProgressBar();
	var p = theVideo.play();
	if (p && p.catch) {
	    p.catch(function() { stopPlaying(); });     // e.g. the browser refused to start playback
	}
    } else {
	stopPlaying();
    }
}

function stopPlaying() {
    playing = false;
    document.getElementById('play').innerHTML = icon('play_arrow');
    theVideo.pause();
    frame = getFrameFromTime(theVideo.currentTime);
    setFrameCounter(frame);
    updateProgressBar();
}

function fwdStep(n) {
    if (playing) {
	return;
    }
    var k = Math.max(1, Math.floor(Number(n)) || 1);    // empty or silly Frame Advance box -> 1
    if (frame < vidFrames-1) {
	var step = Math.min(k, vidFrames - 1 - frame);     // never run past the last frame
	frame = frame + step;
	if (collecting) {
	    dFrame = dFrame + step;
	}
	setFrameCounter(frame);
	seekToFrameTime(frame);
	updateProgressBar();
    }
}

function bakStep() {
    if (playing) {
	return;
    }
    if (frame > 0) {
	frame = frame - 1;
	if (collecting) {
	    dFrame = dFrame - 1;
	}
	setFrameCounter(frame);
	seekToFrameTime(frame);
	updateProgressBar();
    }
}

function skipThisFrame() {
    if (playing || !collecting) {
	return;
    }
    if (frame < vidFrames - 1) {
	frame = frame + 1;
	setFrameCounter(frame);
	seekToFrameTime(frame);
	updateProgressBar();
    }
}
function manageProgressBar() {
    function tick() {
	if (!playing) {
	    return;
	}
	frame = getFrameFromTime(theVideo.currentTime);
	updateProgressBar();
	setFrameCounter(frame);
	requestAnimationFrame(tick);
    }
    tick();
}
    
function resetVideo() {
    if (!vidLoaded) {
	return;
    }
    if (playing) {
	stopPlaying();
    }
    frame = 0;
    setFrameCounter(frame);
    seekToFrameTime(0);
    updateProgressBar();
}

function getFrameFromTime(now) {
    var now = theVideo.currentTime;
    var jLow = 0;
    var jHigh = vidFrames - 1;
    var done = false;
    while (!done) {
	if (jHigh - jLow > 1) {
	    var jMid = Math.floor((jLow + jHigh)/2);
	    if (now > times[jMid]) {
		jLow = jMid;
	    } else {
		jHigh = jMid;
	    }
	} else {
	    done = true;
	    if (now <= times[0]) {
		jHigh = 0;
	    }
	}
    }
    return jHigh;
}
    
function updateProgressBar() {
    var prog = Math.ceil(frame / (vidFrames - 1) * progBarMax);
    if (prog > progBarMax) {
	prog = progBarMax;
    }
    theProgBar.style.maxWidth = String(prog) + "px";
}

function setFrameCounter(frame) {
    var displayFrame = Math.round(frame);
    frameCounter.innerHTML = String(displayFrame) + "/" + String(vidFrames - 1);
    drawTimeStamp(frame);
}

function getManualFrameRate() {
    document.getElementById("frameRateSelector").style.display = "block";
}

function setManualFrameRate() {
    useManualFPS = true;
    document.getElementById("frameRateSelector").style.display = "none";
    document.getElementById("manualFrameRate").value = manualFPS;
    document.getElementById('selectManual').checked = true;
    if (manualFPS > 0) {
	manualTimes[0] = 1/manualFPS;
	for (let i = 1; i < frames.length; i++) {
	    manualTimes[i] = manualTimes[i-1] + 1/manualFPS;
 	}
	vidLength = times[frames.length - 1];
    }
}

function drawTimeStamp(frame) {
    if (useManualFPS) {
	var timeStamp = (manualTimes[frame] - manualTimes[frameZero]);
    } else {
	var timeStamp = (frameStart(frame) - frameStart(frameZero));
    }
    var stampText = timeStamp.toFixed(3);
    clearCan(timCtx);
    timCtx.font = '30px Arial';
    var theWidth = Math.ceil(timCtx.measureText(stampText).width)+ 10;
    var theHeight = 35;
    timCtx.fillStyle = '#A0A0A0';
    timCtx.fillRect(959-theWidth, 540-theHeight, theWidth, theHeight);
    timCtx.fillStyle = '#FFFFFF';
    timCtx.textAlign = 'right';
    timCtx.fillText(stampText, 955, 535);
}

function toggleVideoSound() {
    if (videoMuted) {
	theVideo.muted = false;
	videoMuted = false;
	document.getElementById('muted').style.display = 'none';
	document.getElementById('unmuted').style.display = 'block';
	document.getElementById('muteTextBox').innerHTML = 'Click to mute:&ensp;';
    } else {
	theVideo.muted = true;
	videoMuted = true;
	document.getElementById('unmuted').style.display = 'none';
	document.getElementById('muted').style.display = 'block';
	document.getElementById('muteTextBox').innerHTML = 'Click to unmute:&ensp;';
    }	
}

// ***********************************************************************************************************************
// user interactions:  loading the video
//
function dragenter(e) {
    e.stopPropagation();
    e.preventDefault();
}

function dragover(e) {
    e.stopPropagation();
    e.preventDefault();
}

function drop(e) {
    e.stopPropagation();
    e.preventDefault();
    var files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length) {
	var list = Array.prototype.slice.call(files);
	if (loadVideo(list)) {
	    setInterface('calibrate');
	}
    }
}

function readFile(e) {
    var files = e.target.files;
    if (files && files.length) {
	var list = Array.prototype.slice.call(files);    // copy: clearing the input below empties the live FileList
	if (loadVideo(list)) {
	    setInterface('calibrate');
	}
    }
    e.target.value = '';      // so choosing the same file again still triggers a change
}

// ***********************************************************************************************************************
// read in the video
//
// The video is played straight from the file through an object URL.  (The original read the whole file into a
// base64 data URL, which needs several times the file size in memory and can crash Safari on an iPad.)
// The frame timing is read separately from the file's header, without loading the whole file.
var initForced = false;

function loadVideo(files) {
    if (files.length > 1) {
	alert("Don't be greedy!  Only one video at a time.");
	return false;
    }
    var file = files[0];
    if (!file) {
	return false;
    }
    if (file.size > 300000000) {
	dialogContainer.style.zIndex = '11';
	document.getElementById('messagePane').style.display = 'flex';
	document.getElementById('largeVideoContainer').style.display = 'flex';
	return false;
    }
    vidLoading = true;
    videoFileName = file.name;
    var nameBox = document.getElementById('fileNameContainer');
    nameBox.innerHTML = '<b>File:</b>&ensp;';
    nameBox.appendChild(document.createTextNode(file.name));     // text, not HTML: file names can contain anything
    document.getElementById('loaderDiv').style.display = 'none';
    dropBox.style.border = 'none';
    dropBox.style.zIndex = '0';
    vidWrap.style.background = '#A0A0A0';
    clearCan(calCtx);
    drawLoadingMessage();
    main.style.cursor = 'wait';
    theVideo.classList.add("obj");
    theVideo.muted = true;
    frames = [];
    parseSettled = false;
    haveMetadata = false;
    videoInitDone = false;
    initForced = false;
    badVideo = false;

    parseFrameTable(file).then(function(table) {
	if (table && table.length > 1) {
	    frames = table;
	    frameTableEstimated = false;
	} else {
	    frames = [];          // not a file we can read: timing is measured from playback instead
	}
	parseSettled = true;
	tryInitVideo();
    });

    // keep the original behaviour of presenting phone videos (.mov included) to the browser as MP4
    var type = (file.type === 'video/webm' || file.type === 'video/ogg') ? file.type : 'video/mp4';
    if (objectUrl) {
	URL.revokeObjectURL(objectUrl);
    }
    objectUrl = URL.createObjectURL(file.slice(0, file.size, type));
    theVideo.src = objectUrl;
    theVideo.load();
    return true;
}

function drawLoadingMessage() {
    calCtx.save();
    calCtx.font = '24px system-ui, Arial, sans-serif';
    calCtx.textAlign = 'center';
    calCtx.fillStyle = '#FFFFFF';
    calCtx.fillText('Loading video\u2026', calCan.width / 2, calCan.height / 2);
    calCtx.restore();
}

function getMetaData() {
    vidWidth = theVideo.videoWidth;
    vidHeight = theVideo.videoHeight;
    vidLength = theVideo.duration;
    if (!vidWidth || !vidHeight || !isFinite(vidLength)) {
	showBadVideo();
	return;
    }
    haveMetadata = true;
    // Some browsers (iOS) do not load video data until asked to; do not wait for events that may never come
    setTimeout(function() {
	initForced = true;
	tryInitVideo();
    }, 2500);
    tryInitVideo();
}

function showBadVideo() {
    if (badVideo) {
	return;
    }
    badVideo = true;
    vidLoading = false;
    main.style.cursor = 'default';
    dialogContainer.style.zIndex = '11';
    document.getElementById('messagePane').style.display = 'flex';
    document.getElementById('badVideoContainer').style.display = 'flex';
}

// Runs once, as soon as we have the video's size, its frame timing, and (normally) a decoded first frame.
function tryInitVideo() {
    if (videoInitDone || badVideo || !haveMetadata || !parseSettled) {
	return;
    }
    if (!initForced && theVideo.readyState < 2) {
	return;
    }
    videoInitDone = true;
    if (frames.length > 1) {
	finishVideoInit();
    } else {
	estimateFrames().then(finishVideoInit);
    }
}

function finishVideoInit() {
    vidLoaded = true;
    vidLoading = false;
    if (vidHeight/vidWidth*screenWidth > screenHeight) {
	displayWidth = Math.round(screenHeight*vidWidth/vidHeight);
	theVideo.style.width = String(displayWidth) + "px";
	dropBox.style.width = String(displayWidth) + "px";
	hOffset = (screenWidth - displayWidth)/2;
	theVideo.style.left = String(hOffset) + "px";
	dropBox.style.left = String(hOffset) + "px";
    } else {
	displayHeight = Math.round(screenWidth * vidHeight/vidWidth);
	theVideo.style.height = String(displayHeight) + "px";
	dropBox.style.height = String(displayHeight) + "px";
	vOffset = (screenHeight - displayHeight)/2;
	theVideo.style.top = String(vOffset) + "px";
	dropBox.style.top = String(vOffset) + "px";
    }
    var displayRate = getDisplayRate(frames);
    frameRate = displayRate;
    document.getElementById('fpsDisplay').textContent = String(displayRate) + ' fps' + (frameTableEstimated ? ' (est.)' : '');
    theVideo.style.display = "block";
    main.style.cursor = 'default';
    vidFrames = frames.length;
    frame = 0;
    setFrameCounter(0);
    clearCan(calCtx);
    resizeCanvases();
    seekToFrameTime(0);
    if (frameTableEstimated) {
	flashMessage('The frame rate of this file was estimated.<br>If the fps shown is wrong, pick the real one under <b>Use manual frame rate</b>.', 4500);
    }
}

// Fallback for files whose header we cannot read (not MP4/MOV, or unusual): play a moment of the video and
// time the frames the browser actually shows.  Needs requestVideoFrameCallback; otherwise we assume 30 fps.
function estimateFrames() {
    return new Promise(function(resolve) {
	frameTableEstimated = true;
	function build(fps) {
	    var n = Math.max(2, Math.round(vidLength * fps));
	    frames = [];
	    for (let i = 0; i < n; i++) {
		frames.push(1 / fps);
	    }
	    resolve();
	}
	if (!('requestVideoFrameCallback' in HTMLVideoElement.prototype)) {
	    build(30);
	    return;
	}
	var stamps = [];
	var finished = false;
	function finish() {
	    if (finished) {
		return;
	    }
	    finished = true;
	    theVideo.pause();
	    var d = [];
	    for (let i = 1; i < stamps.length; i++) {
		var dt = stamps[i] - stamps[i-1];
		if (dt > 0.0005) {
		    d.push(dt);
		}
	    }
	    d.sort(function(a, b) { return a - b; });
	    var fps = 30;
	    if (d.length) {
		// timestamps are often rounded to whole milliseconds, so average the normal intervals rather than
		// taking one of them; intervals far from the typical one (a dropped frame) are left out
		var typical = d[Math.floor(d.length / 2)];
		var good = d.filter(function(x) { return x > 0.5 * typical && x < 1.5 * typical; });
		var sum = good.reduce(function(a, b) { return a + b; }, 0);
		fps = good.length / sum;
	    }
	    build(fps);
	}
	function onFrame(now, meta) {
	    stamps.push(meta.mediaTime);
	    if (stamps.length >= 30) {
		finish();
	    } else {
		theVideo.requestVideoFrameCallback(onFrame);
	    }
	}
	theVideo.muted = true;
	theVideo.requestVideoFrameCallback(onFrame);
	var p = theVideo.play();
	if (p && p.catch) {
	    p.catch(finish);
	}
	setTimeout(finish, 3000);
    });
}

// ***********************************************************************************************************************
// MP4 / MOV header reader: returns the duration of every video frame (seconds), or null if it cannot be read.
// Only the 'moov' box is loaded, so the cost does not depend on the size of the video.
function readBlob(blob, start, length) {
    return new Promise(function(resolve, reject) {
	var reader = new FileReader();
	reader.onload = function() { resolve(reader.result); };
	reader.onerror = function() { reject(reader.error); };
	reader.readAsArrayBuffer(blob.slice(start, start + length));
    });
}

function fourcc(dv, p) {
    return String.fromCharCode(dv.getUint8(p), dv.getUint8(p + 1), dv.getUint8(p + 2), dv.getUint8(p + 3));
}

// calls visit(type, start, size, headerLength) for each box in [start, end); visit returns false to stop
function walkBoxes(dv, start, end, visit) {
    var p = start;
    while (p + 8 <= end) {
	var size = dv.getUint32(p);
	var type = fourcc(dv, p + 4);
	var header = 8;
	if (size === 1) {
	    size = dv.getUint32(p + 8) * 4294967296 + dv.getUint32(p + 12);
	    header = 16;
	} else if (size === 0) {
	    size = end - p;
	}
	if (size < header || p + size > end) {
	    return;
	}
	if (visit(type, p, size, header) === false) {
	    return;
	}
	p += size;
    }
}

function frameDurationsFromMoov(dv, start, end) {
    var result = null;
    walkBoxes(dv, start, end, function(t1, p1, s1, h1) {
	if (t1 !== 'trak') {
	    return;
	}
	var info = {isVideo: false, timescale: 0, stts: null};
	walkBoxes(dv, p1 + h1, p1 + s1, function(t2, p2, s2, h2) {
	    if (t2 !== 'mdia') {
		return;
	    }
	    walkBoxes(dv, p2 + h2, p2 + s2, function(t3, p3, s3, h3) {
		if (t3 === 'hdlr') {
		    info.isVideo = (fourcc(dv, p3 + h3 + 8) === 'vide');
		} else if (t3 === 'mdhd') {
		    var version = dv.getUint8(p3 + h3);
		    info.timescale = dv.getUint32(p3 + h3 + (version === 1 ? 20 : 12));
		} else if (t3 === 'minf') {
		    walkBoxes(dv, p3 + h3, p3 + s3, function(t4, p4, s4, h4) {
			if (t4 !== 'stbl') {
			    return;
			}
			walkBoxes(dv, p4 + h4, p4 + s4, function(t5, p5, s5, h5) {
			    if (t5 === 'stts') {
				info.stts = p5 + h5;
			    }
			});
		    });
		}
	    });
	});
	if (info.isVideo && info.timescale && info.stts !== null) {
	    var nEntries = dv.getUint32(info.stts + 4);
	    var out = [];
	    for (let i = 0; i < nEntries; i++) {
		var count = dv.getUint32(info.stts + 8 + 8 * i);
		var delta = dv.getUint32(info.stts + 12 + 8 * i);
		for (let j = 0; j < count; j++) {
		    out.push(delta / info.timescale);
		}
		if (out.length > 2000000) {
		    return false;
		}
	    }
	    result = out;
	    return false;       // first video track only
	}
    });
    return result;
}

async function parseFrameTable(file) {
    try {
	var pos = 0;
	while (pos + 8 <= file.size) {
	    var head = new DataView(await readBlob(file, pos, 16));
	    var size = head.getUint32(0);
	    var type = fourcc(head, 4);
	    var header = 8;
	    if (size === 1) {
		size = head.getUint32(8) * 4294967296 + head.getUint32(12);
		header = 16;
	    } else if (size === 0) {
		size = file.size - pos;
	    }
	    if (size < header) {
		return null;
	    }
	    if (type === 'moov') {
		if (size > 64000000) {
		    return null;
		}
		var moov = new DataView(await readBlob(file, pos, size));
		return frameDurationsFromMoov(moov, header, size);
	    }
	    pos += size;       // skip over mdat etc. without reading them
	}
    } catch (err) {
	console.log('Could not read frame timing from the file header:', err);
    }
    return null;
}

function getDisplayRate(frames) {
    // determine average frame rate for front panel display
    // also fill the array times with the running time of the video
    var totalTime = frames[0];
    times[0] = frames[0];
    for (let i=1; i<frames.length; i++) {
	times[i] = times[i-1] + frames[i];
	totalTime = totalTime + frames[i];
    }
    var frameLength = totalTime/frames.length;
    return Math.round(1/frameLength);
}

// ***********************************************************************************************************************
// functions to setup front panel
//
function buildTable() {
    for (let i = 0; i < nRows; i++) {
	var row = document.getElementById("theTable").insertRow(-1);
	var cell = row.insertCell(-1)
	var cellId = 'e' + String(i);
	cell.id = cellId;
	document.getElementById(cellId).innerHTML = String(i + 1);
	document.getElementById(cellId).classList.add('edgeClass');
	cell = row.insertCell(-1);
	cellId = "t" + String(i);
	cell.id = cellId;
	document.getElementById(cellId).classList.add('cellClass');
	cell = row.insertCell(-1)
	cellId = "x" + String(i);
	cell.id = cellId;
	document.getElementById(cellId).classList.add('cellClass');
	cell = row.insertCell(-1);
	cellId = "y" + String(i);
	cell.id = cellId;
	document.getElementById(cellId).classList.add('cellClass');
    }
}

function resizeCanvases() {
    resizeCanvas(calCtx);
    resizeCanvas(orgCtx);
    resizeCanvas(meaCtx);
    resizeCanvas(ptsCtx);
    resizeCanvas(curCtx);

    function resizeCanvas(ctx) {
	ctx.canvas.width = Math.round(displayWidth);
	ctx.canvas.height = Math.round(displayHeight);
	ctx.canvas.style.left = hOffset + "px";
	ctx.canvas.style.top = vOffset + "px";
    }
}

function clearCan(ctx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function drawBox(ctx) {
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(2, 2, ctx.canvas.width-4, ctx.canvas.height-4);
    ctx.stroke();
}

function setInterface(state) {
    if (!virgin) {
	return;
    }
    guideState = state;
    switch(state) {
    case 'calibrate':
	document.getElementById('leftScrim').style.display = 'block';
	document.getElementById('skipMessageBox').style.display = 'block';
	document.getElementById('calibrateButton').style.zIndex = '11';
	break;
    case 'tZero':
	document.getElementById('leftScrim').style.display = 'block';
	document.getElementById('calibrateButton').style.zIndex = '0';
	document.getElementById('setTZeroButton').style.zIndex = '11';
	break;
    case 'xZero':
	document.getElementById('leftScrim').style.display = 'block';
	document.getElementById('setTZeroButton').style.zIndex = '0';
	document.getElementById('setXZeroButton').style.zIndex = '11';
	break;
    case 'yZero':
	document.getElementById('leftScrim').style.display = 'block';
	document.getElementById('setXZeroButton').style.zIndex = '0';
	document.getElementById('setYZeroButton').style.zIndex = '11';
	break;
    case 'done':
	document.getElementById('leftScrim').style.display = 'none';
	document.getElementById('skipMessageBox').style.display = 'none';
	document.getElementById('calibrateButton').style.zIndex = '11';
	document.getElementById('setTZeroButton').style.zIndex = '11';
	document.getElementById('setXZeroButton').style.zIndex = '11';
	virgin = false;
    }
}	

function setScreenZoom() {
    // The app is laid out on a fixed 1366 x 620 stage.  Scale the whole stage to fit the screen
    // (width AND height) and centre it.  transform is standard and behaves the same in Safari,
    // Chrome and Firefox, unlike the old non-standard CSS zoom.
    var vw = document.body.clientWidth;
    var vh = document.body.clientHeight;
    if (!vw || !vh) {
	return;
    }
    var s = Math.min(vw / STAGE_W, vh / STAGE_H, 2.5);
    var x = Math.max(0, (vw - STAGE_W * s) / 2);
    var y = Math.max(0, (vh - STAGE_H * s) / 2);
    document.getElementById('stage').style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
    var tip = document.getElementById('fitTip');
    if (s < 0.62 && !tipDismissed) {
	document.getElementById('fitTipText').textContent = (vh > vw) ? 'Tip: turn your device sideways for a bigger view.' : 'Tip: a larger window gives bigger controls.';
	tip.style.display = 'flex';
    } else {
	tip.style.display = 'none';
    }
}

// ***********************************************************************************************************************
// utilities
//
function delay(ms) {
    return new Promise(dummy => setTimeout(dummy, ms));
}
var memoryStore = {};
function storeGet(key) {
    try {
	return window.localStorage.getItem(key);
    } catch (err) {
	return (key in memoryStore) ? memoryStore[key] : null;     // storage blocked (private mode, etc.)
    }
}
function storeSet(key, value) {
    try {
	window.localStorage.setItem(key, value);
    } catch (err) {
	memoryStore[key] = value;
    }
}

async function checkVersion() {
    var updateBody ='<p>This version has been updated to work more reliably on iPads and in Safari, Chrome and Firefox: ' +
	'touch input, a layout that fits any screen, safer handling of large videos, and a Download CSV button.</p>';

    var verMatch = true;
    var verString = storeGet('SigmundVersion');
    if (verString === null) {
	verMatch = false;
	document.getElementById('updateVersion').innerHTML = '<b>Sigmund Video Analysis, version ' + version + '</b>';
	document.getElementById('updateText').innerHTML = '<p>Welcome to the analysis couch for motion videos.  This app works on ' +
	    'iPads, Chromebooks, Macs and other laptops.  A phone screen is too small to use comfortably.  ' +
	    'It is recommended that you read the instructions, which can be ' +
	    'accessed via the button in the lower left corner of the screen.</p>' +
	    '<p><b>Updates in version ' + version + ' include:</b></p>' + updateBody;
    } else if (verString != version) {
	verMatch = false;
	document.getElementById('updateVersion').innerHTML = '<b>Sigmund has been updated to version ' + version + '</b>';
	document.getElementById('updateText').innerHTML = updateBody;
    }
    if (!verMatch) {
	dialogContainer.style.zIndex = '11';
	document.getElementById('messagePane').style.display = 'flex';
	document.getElementById('updateMessageContainer').style.display = 'flex';
	while (!updateAcknowledge) {
	    await delay(100);
	}
	dialogContainer.style.zIndex = '0';
	document.getElementById('messagePane').style.display = 'none';
	document.getElementById('updateMessageContainer').style.display = 'none';
	storeSet('SigmundVersion', version);
    }
}

// ***********************************************************************************************************************
// compatibility helpers (modified version)
//
// Icons: inline SVG paths (Material Design icons, Apache 2.0) so nothing has to be downloaded from a font server.
var ICON_PATHS = {
    replay: 'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z',
    play_arrow: 'M8 5v14l11-7z',
    pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
    skip_previous: 'M6 6h2v12H6zm3.5 6l8.5 6V6z',
    skip_next: 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
    volume_up: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
    volume_off: 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z'
};

function iconSVG(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + ICON_PATHS[name] + '"/></svg>';
}

function icon(name) {
    return '<i class="material-icons">' + iconSVG(name) + '</i>';
}

function initIcons() {
    var els = document.querySelectorAll('i.material-icons');
    for (let i = 0; i < els.length; i++) {
	var name = els[i].textContent.trim();
	if (ICON_PATHS[name]) {
	    els[i].innerHTML = iconSVG(name);
	}
    }
    var labels = {replay: 'Back to the first frame', play: 'Play or pause', stepBack: 'Previous frame',
		  stepForward: 'Next frame', muted: 'Unmute the video', unmuted: 'Mute the video'};
    for (var id in labels) {
	document.getElementById(id).setAttribute('aria-label', labels[id]);
    }
}

// Seeking: the middle of a frame's time slot is the safest place to land (the original idea, kept).
// seekPending is true until the browser says the frame is ready, so a click is never taken on the old picture.
function seekToFrameTime(f) {
    var t = times[f] - frames[f]/2;
    if (!isFinite(t)) {
	return;
    }
    seekPending = true;
    clearTimeout(seekTimer);
    seekTimer = setTimeout(function() { seekPending = false; }, 600);    // some browsers skip 'seeked' if the time did not change
    theVideo.currentTime = Math.max(0, t);
}

// time at which frame i starts (times[i] is when it ends)
function frameStart(i) {
    return times[i] - frames[i];
}

function onSeeked() {
    seekPending = false;
    clearTimeout(seekTimer);
}

// small message in the middle of the screen (used for "copied", "table full", ...)
function flashMessage(html, ms) {
    confirmCopyMessage.innerHTML = html;
    dialogContainer.style.zIndex = '11';
    document.getElementById('messagePane').style.display = 'flex';
    document.getElementById('confirmCopyContainer').style.display = 'flex';
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function() {
	dialogContainer.style.zIndex = '0';
	document.getElementById('messagePane').style.display = 'none';
	document.getElementById('confirmCopyContainer').style.display = 'none';
    }, ms || 1500);
}

// pointer position in canvas pixels.  Uses the on-screen size of the canvas, so it stays right however the
// stage is scaled, zoomed or rotated (offsetX/offsetY are not reliable under CSS zoom or transforms).
function canvasPoint(e) {
    var r = curCan.getBoundingClientRect();
    return {x: (e.clientX - r.left) * (curCan.width / r.width),
	    y: (e.clientY - r.top) * (curCan.height / r.height)};
}

function setupPointerInput() {
    // --- the video area: mouse clicks act at once; touch and pen show the crosshair while down and place the
    //     point when lifted, so you can slide to the exact spot.  A pen also shows the crosshair while hovering.
    curCan.addEventListener('pointerdown', function(e) {
	if (e.pointerType === 'mouse') {
	    if (e.button === 0) {
		mDownAction(canvasPoint(e));
	    }
	    return;
	}
	e.preventDefault();
	try { curCan.setPointerCapture(e.pointerId); } catch (err) {}
	curSiz = (e.pointerType === 'touch') ? 60 : 30;      // longer arms so a fingertip does not hide the crosshair
	touchCommit = canvasPoint(e);
	mMoveAction(touchCommit);
    });
    curCan.addEventListener('pointermove', function(e) {
	var p = canvasPoint(e);
	if (touchCommit && e.pointerType !== 'mouse') {
	    touchCommit = p;
	    mMoveAction(p);
	} else if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
	    mMoveAction(p);
	}
    });
    curCan.addEventListener('pointerup', function(e) {
	if (e.pointerType === 'mouse' || !touchCommit) {
	    return;
	}
	var p = canvasPoint(e);
	touchCommit = null;
	mDownAction(p);
	if (collecting) {
	    clearCan(curCtx);       // the video has moved on: clear the crosshair so the new frame is visible
	}
    });
    curCan.addEventListener('pointercancel', function() {
	touchCommit = null;
	clearCan(curCtx);
    });

    // --- progress bar: press or drag to scrub (works with finger, pen and mouse; keeps tracking outside the bar)
    var scrubbing = false;
    function scrubTo(e) {
	if (!vidLoaded || vidFrames < 2) {
	    return;
	}
	var r = progControl.getBoundingClientRect();
	var f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
	var target = Math.round(f * (vidFrames - 1));
	if (target === frame && !playing) {
	    return;
	}
	frame = target;
	setFrameCounter(frame);
	seekToFrameTime(frame);
	updateProgressBar();
    }
    progControl.addEventListener('pointerdown', function(e) {
	if (e.pointerType === 'mouse' && e.button !== 0) {
	    return;
	}
	e.preventDefault();
	scrubbing = true;
	try { progControl.setPointerCapture(e.pointerId); } catch (err) {}
	scrubTo(e);
    });
    progControl.addEventListener('pointermove', function(e) {
	if (scrubbing) {
	    scrubTo(e);
	}
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function(name) {
	progControl.addEventListener(name, function() { scrubbing = false; });
    });

    // --- buttons that used to rely on onclick attributes or on the shift key
    document.getElementById('play').addEventListener('click', playPauseVideo);
    document.getElementById('downloadCSV').addEventListener('click', downloadCSV);
    document.getElementById('skipStepButton').addEventListener('click', function() {
	if (calibrating || xZeroing || yZeroing || calDialogPane.style.display === 'flex') {
	    return;
	}
	var next = {calibrate: 'tZero', tZero: 'xZero', xZero: 'yZero', yZero: 'done'}[guideState];
	if (next) {
	    setInterface(next);
	}
    });
    measureDistance.addEventListener('pointerdown', function() {
	measureLongPress = false;
	clearTimeout(measureTimer);
	measureTimer = setTimeout(function() {
	    measureLongPress = true;
	    clearCan(meaCtx);
	    flashMessage('Measurements cleared', 1000);
	}, 700);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function(name) {
	measureDistance.addEventListener(name, function() { clearTimeout(measureTimer); });
    });

    // --- manual frame rate pop-up: listeners are added once here
    var rates = document.querySelectorAll('.frameRateValue');
    for (let i = 0; i < rates.length; i++) {
	rates[i].addEventListener('click', function(e) {
	    manualFPS = Number(e.currentTarget.dataset.value);
	    setManualFrameRate();
	});
    }

    // --- calibration dialog: Return in the length box moves on to the unit box
    document.getElementById('length').addEventListener('keydown', function(e) {
	if (e.key === 'Enter') {
	    document.getElementById('unit').focus();
	}
    });

    // --- dropping a file anywhere else must not make the browser navigate away and lose the data
    window.addEventListener('dragover', function(e) { e.preventDefault(); });
    window.addEventListener('drop', function(e) { e.preventDefault(); });

    // --- keep the stage fitted to the screen
    window.addEventListener('orientationchange', function() { setTimeout(setScreenZoom, 250); });
    if (window.ResizeObserver) {
	new ResizeObserver(function() { setScreenZoom(); }).observe(document.body);
    }
    document.getElementById('fitTipClose').addEventListener('click', function() {
	tipDismissed = true;
	document.getElementById('fitTip').style.display = 'none';
    });
}

// ***********************************************************************************************************************
// START-UP (kept at the end of the file so everything above is defined before it runs)
initIcons();
setupPointerInput();
checkVersion();
buildTable();
setScreenZoom();
