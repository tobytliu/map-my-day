// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkID=397704
// To debug code on page load in Ripple or on Android devices/emulators: launch your app, set breakpoints, 
// and then run "window.location.reload()" in the JavaScript Console.

$("#controlButtonsToggle").hide();
$("#controlButtonsToggleFinal").hide();
hideEverythingOnCurrentDayPage();
hideEverything();

var dayMapsDB;
/*var timeIntervalDB;*/

var storage = window.localStorage;

//cosmetic timekeeping
var startTime;
var stopTime;

var efficiencyPercent = preciseRound(0, 2);
var intervalListener;
var efficiencyIntervalListener;

//keeps track of what is the current page
var currentPage;

//keeps track of which timer is running
storage.setItem("timerType", "");

(function () {
    "use strict";

    document.addEventListener( 'deviceready', onDeviceReady.bind( this ), false );

    function onDeviceReady() {
        
        // Handle the Cordova pause and resume events
        document.addEventListener( 'pause', onPause.bind( this ), false );
        document.addEventListener('resume', onResume.bind(this), false);
        document.addEventListener('window.onunload', onExit.bind(this), false);
        
        // TODO: Cordova has been loaded. Perform any initialization that requires Cordova here.
        var parentElement = document.getElementById('deviceready');

    
        $("#sun").attr('src', "images/active_sun.png");
        $("#today").css('color', "#303236");

        dayMapsDB = window.openDatabase("Database", "1.0", "Cordova Demo", 200000);
        /*timeIntervalDB = window.openDatabase("Database", "1.0", "Cordova Demo", 200000);*/

        startTime = initializeDates(startTime);
        stopTime = initializeDates(stopTime);

        // Create databases
        dayMapsDB.transaction(function (transaction) {
            transaction.executeSql('CREATE TABLE IF NOT EXISTS dayMapsDB (id INTEGER PRIMARY KEY, date DATETIME, efficiency NUMERIC, totalStartTime TEXT, totalStopTime TEXT)', [],
                function (tx, result) {
                    console.log("dayMaps table created successfully");
                },
                function (error) {
                    console.log("Error occurred while creating the dayMaps table.");
                });
        });

        $("#currentDayPage").show();
        $("#currentDay").show();

        storage.setItem("currentPage", "sunWrapper");

        // initialize wow.js
        new WOW().init();

        //create graphs and sliders (created here to ensure it only laods once)
        createCharts();

        updateCharts();
        createSliders("efficiencySlider");
        createSliders("totalStopTimeSlider");
        createSliders("totalStartTimeSlider");

        //create intial stat table
        createStatTable();


        //ensures that null days dont get added to graphs or lists
        storage.setItem("currentTimingProcess", false);
    }

    function onExit() {
        $("#pauseDay").triggeR();
        $("#stopDay").trigger();
        $("#discardDay").trigger();
    }

    function onPause() {
        $("#pauseDay").trigger();
        
        var currentTime = new Date();

        storage.setItem("pauseTime", currentTime);

        console.log("on pause")
    };

    function onResume() {
        var resumeTime = new Date();

        var elapsedTime = convertToHours(resumeTime.toString('HH:mm:ss')) - convertToHours(storage.getItem("pauseTime").toString('HH:mm:ss')); // finds the difference between the current time and the time at pause

        if (storage.getItem("timerType") === "startTimer") {

            var totalElapsedTime = convertToHours(startTime.toString) + elapsedTime; // adds up startTime and elapsedTime to get total time passed in hours

            // begins to set the total elapsed time as the new startTime
            var hours = Math.floor(totalElapsedTime);

            totalElapsedTime = totalElapsedTime.toString();
            var minutes = Number(totalElapsedTime.substring(totalElapsedTime.indexOf("."))) * 60;

            startTime = initializeDates(startTime);
            startTime.setHours(hours, minutes);

        }
        else if (storage.getItem("timerType") === "stopTimer") {

            var totalElapsedTime = convertToHours(stopTime.toString) + elapsedTime; // adds up stopTime and elapsedTime to get total time passed in hours

            // begins to set the total elapsed time as the new stopTime
            var hours = Math.floor(totalElapsedTime);

            totalElapsedTime = totalElapsedTime.toString();
            var minutes = Number(totalElapsedTime.substring(totalElapsedTime.indexOf("."))) * 60;

            stopTime = initializeDates(stopTime);
            stopTime.setHours(hours, minutes);

        }
        else {
            console.log("timerType is neither");
        }

        var time1 = convertTimeToNumber(startTime);
        var time2 = convertTimeToNumber(stopTime);

        efficiencyPercent = (time1 / (time1 + time2)) * 100;

        $("#resumeDay").trigger();

        console.log("on resume");
    };
})();

function initializeDates(userTime) {
    userTime = new Date();

    //doesn't set the days to 0
    userTime.clearTime();

    //sets days to 0 and double checks resetting everything
    userTime.setMilliseconds(0);
    userTime.setSeconds(0);
    userTime.setMinutes(0);
    userTime.setHours(0);

    userTime.addSeconds(0);

    return userTime;
}

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function hideEverythingOnCurrentDayPage() {
    $("#currentDay").hide();
    $("#currentDayTiming").hide();
}

function hideEverything() {
    $("#currentDayPage").hide();
    $("#statPage").hide();
    $("#trendsPage").hide();
    $("#helpPage").hide();
}

$("#startDay").click(function () {
    
    //add to dayMapsDB
    dayMapsDB.transaction(function (transaction) {
        var d = new Date();
        var date = (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();
            
        var executeQuery = "INSERT INTO dayMapsDB (date) VALUES (?)";

        transaction.executeSql(executeQuery, [date]
            , function (tx, result) {
                console.log('Inserted date into dayMapsDB');
            },
            function (error) {
                console.log('Error occurred when inserting date into dayMapsDB');
            });
    });

    $("#currentDay").hide();
    $("#currentDayTiming").show();

    setCurrentID();
    storage.setItem("currentTimingProcess", true);
})

$("#startButton").click(function () {

    //clear any previous intervals 
    window.clearInterval(intervalListener);
    window.clearInterval(efficiencyIntervalListener);

    console.log("start button clicked");
    storage.setItem("timerType", "startTimer")

    startTimeTimer();

});

$("#stopButton").click(function () {

    //clear any previous intervals 
    window.clearInterval(intervalListener);
    window.clearInterval(efficiencyIntervalListener);

    console.log("stop button clicked");
    storage.setItem("timerType", "stopTimer");

    stopTimeTimer();

});

$("#pauseDay").click(function () {

    window.clearInterval(intervalListener);
    window.clearInterval(efficiencyIntervalListener);

    pauseToggleButtons();

    $("#controlButtons").hide();
    $("#controlButtonsToggle").show();

    console.log("day paused");

})

$("#resumeDay").click(function () {

    unpauseToggleButtons();

    $("#controlButtonsToggle").hide();
    $("#controlButtons").show();

    console.log("day resumed");

})

$("#stopDay").click(function () {

    $("#controlButtonsToggle").hide();
    $("#controlButtonsToggleFinal").show();

    console.log("day stopped");

})

$("#discardDay").click(function () {

    //delete current id
    var localID = storage.getItem("currentID");

    console.log("current ID is " + localID);

    dayMapsDB.transaction(function (transaction) {
        var executeQuery = "DELETE FROM dayMapsDB where id=?";
        transaction.executeSql(executeQuery, [localID],
          //On Success
          function (tx, result) { console.log('Delete successful'); },
          //On Error
          function (error) { console.log('Delete unsuccessful'); });
    });

    //reset buttons
    unpauseToggleButtons();
    $("#controlButtonsToggleFinal").hide();
    $("#controlButtonsToggle").hide();
    $("#controlButtons").show();

    //reset timers
    resetEverything();

    hideEverythingOnCurrentDayPage();
    $("#currentDay").show();

    storage.setItem("currentTimingProcess", false);

    console.log("day deleted");
})

$("#saveDay").click(function () {
    var localEfficiency = efficiencyPercent;
    var localStartTime = startTime.toString('HH:mm:ss');
    var localStopTime = stopTime.toString('HH:mm:ss');
    var localID = storage.getItem("currentID");

    //add efficiency, startTime, and stopTime to dayMapsDB
    dayMapsDB.transaction(function (transaction) {
        var executeQuery = "UPDATE dayMapsDB SET efficiency=?, totalStartTime=?, totalStopTime=? WHERE id=?";
        transaction.executeSql(executeQuery, [localEfficiency, localStartTime, localStopTime, localID],
          //On Success
          function (tx, result) { console.log('added ' + localEfficiency + " and " + localStartTime + " and " + localStopTime + " to database"); },
          //On Error
          function (error) { console.log('did not add ' + localEfficiency + " and " + localStartTime + " and " + localStopTime + " to database"); });
    });

    //reset buttons
    unpauseToggleButtons();

    $("#controlButtonsToggle").hide();
    $("#controlButtonsToggleFinal").hide();
    $("#controlButtons").show();

    //reset timers
    resetEverything();
    hideEverythingOnCurrentDayPage();
    $("#currentDay").show();

    //update stat table and graph
    updateStatTable();

    createCharts();

    storage.setItem("currentTimingProcess", false);

    console.log("day saved");
})

//timers
function startTimeTimer() {
    //set an interval
    intervalListener = setInterval(function () {
        startTime.addSeconds(1);
        var val = startTime.toString('HH:mm:ss');
        $("#productiveTime").html(val);
        displayEfficiency()
    }, 1000);
}

function stopTimeTimer() {
    intervalListener = setInterval(function () {
        stopTime.addSeconds(1);
        var val = stopTime.toString('HH:mm:ss');
        $("#wastedTime").html(val);
        displayEfficiency()
    }, 1000);
}

//efficiency function
function displayEfficiency() {
    if (convertTimeToNumber(startTime) === 0 && convertTimeToNumber(stopTime) === 0) {
        $("#efficiencyPercent").html("00.00%");
        efficiencyPercent = preciseRound(0, 2);
    }
        //percentages for 0 or 100 seem to be flipped!!!!!!!!!!!
    else if (convertTimeToNumber(startTime) === 0) {
        $("#efficiencyPercent").html("00.00%");
        efficiencyPercent = preciseRound(0, 2);
    }
    else if (convertTimeToNumber(stopTime) === 0) {
        $("#efficiencyPercent").html("100%");
        efficiencyPercent = preciseRound(100, 2);
    }
    else {
        var time1 = convertTimeToNumber(startTime);
        var time2 = convertTimeToNumber(stopTime);

        efficiencyPercent = (time1 / (time1 + time2)) * 100;
        efficiencyPercent = preciseRound(efficiencyPercent, 2);

        $("#efficiencyPercent").html(efficiencyPercent + "%");
    }
};

function convertTimeToNumber(date) {
    var totalTime = 0;
    var stringTime = date.toString('HH:mm:ss');
    totalTime += Number(stringTime.substring(0, stringTime.indexOf(":"))) * 60; //adds hours after converting hours to minutes
    totalTime += Number(stringTime.substring(stringTime.indexOf(":") + 1, stringTime.lastIndexOf(":"))); //adds minutes
    totalTime += Number(stringTime.substring(stringTime.lastIndexOf(":") + 1)) / 60; //converts hours to minutes
    return totalTime; //returns total number of minutes
};

//returns just the date (e.g. day, month, year) of the date object
function convertTimetoDate(date) {
    var dateString = date.toString();
    return dateString.substring(0, dateString.indexOf(":") - 3); //might have to replace with regex
}

//rounds a number to a certain number of decimal places
function preciseRound(num, decimals) {
    var t = Math.pow(10, decimals);
    return (Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)).toFixed(2);
}

function resetEverything() {
    //reset variables
    startTime = initializeDates(startTime);
    stopTime = initializeDates(stopTime);
    efficiencyPercent = 0;
    window.clearInterval(intervalListener);
    window.clearInterval(efficiencyIntervalListener);

    //reset displays
    $("#productiveTime").html("00:00:00");
    $("#wastedTime").html("00:00:00");
    $("#efficiencyPercent").html("00.00%");

    console.log("reset everything");
}

function pauseToggleButtons() {
    document.getElementById("startButton").disabled = true;
    document.getElementById("stopButton").disabled = true;
}

function unpauseToggleButtons() {
    document.getElementById("startButton").disabled = false;
    document.getElementById("stopButton").disabled = false;
}

//botom nav bar active states
$("#sunWrapper").click(function () {
    if (!(storage.getItem("currentPage") === "sunWrapper")) {
            setEverybodyNormal();
            $("#sun").attr('src', "images/active_sun.png");
            $("#today").css('color', "#303236");

            hideEverything();
            $("#currentDayPage").show();

            storage.setItem("currentPage", "sunWrapper");
        }
})

$("#statWrapper").click(function () {
    if (!(storage.getItem("currentPage") === "statWrapper")) {
            setEverybodyNormal();
            $("#stats").attr('src', "images/active_stat.png");
            $("#statistics").css('color', "#303236");

            hideEverything();
            $("#statPage").show();

            storage.setItem("currentPage", "statWrapper");
            
        
            if (storage.getItem("currentTimingProcess") === false) {
                updateStatTable();
            }

            displayTable();
        }
})

$("#graphWrapper").click(function () {

    if (!(storage.getItem("currentPage") === "graphWrapper")) {
        setEverybodyNormal();
        $("#graph").attr('src', "images/active_graph.png");
        $("#trends").css('color', "#303236");

        hideEverything();
        $("#trendsPage").show();

        storage.setItem("currentPage", "graphWrapper");

        if (storage.getItem("currentTimingProcess") === false) {
            createCharts();
        }
    } 
})

$("#questionMarkWrapper").click(function () {
    if (!(storage.getItem("currentPage") === "questionMarkWrapper")) {
        setEverybodyNormal();
        $("#questionMark").attr('src', "images/active_questionMark.png");
        $("#help").css('color', "#303236");

        hideEverything();
        $("#helpPage").show();

        storage.setItem("currentPage", "questionMarkWrapper");
    }
})

function setEverybodyNormal() {
    $("#today").css('color', "#9297a3");
    $("#statistics").css('color', "#9297a3");
    $("#trends").css('color', "#9297a3");
    $("#help").css('color', "#9297a3");

    $("#sun").attr('src', "images/sun.png");
    $("#stats").attr('src', "images/stat.png");
    $("#graph").attr('src', "images/graph.png");
    $("#questionMark").attr('src', "images/questionMark.png");
}

//stores the id of the current day map 
function setCurrentID() {
    dayMapsDB.transaction(function (transaction) {
        transaction.executeSql('SELECT * FROM dayMapsDB', [], function (tx, results) {
            var lastID = results.rows.length;
            storage.setItem("currentID", lastID.toString());
            console.log("stored currentID as " + storage.getItem("currentID"));
        }, null);
    });
}

function createStatTable() {

    dayMapsDB.transaction(function (transaction) {
        transaction.executeSql('SELECT * FROM dayMapsDB ORDER BY id desc limit 365', [], function (tx, results) {

            var len = results.rows.length, i;

            //populate data arrays
            for (i = 0; i < len; i++) {
                if (i < len - 1) {
                    createStatBox(results.rows.item(i).date, results.rows.item(i).totalStartTime.substring(0, results.rows.item(i).totalStartTime.lastIndexOf(":")), results.rows.item(i).totalStopTime.substring(0, results.rows.item(i).totalStopTime.lastIndexOf(":")), results.rows.item(i).efficiency);
                }

                else {
                    createLastStatBox(results.rows.item(i).date, results.rows.item(i).totalStartTime.substring(0, results.rows.item(i).totalStartTime.lastIndexOf(":")), results.rows.item(i).totalStopTime.substring(0, results.rows.item(i).totalStopTime.lastIndexOf(":")), results.rows.item(i).efficiency);
                }

            }

        });
    });
}

function deleteStatTable() {
    $("#statBody").remove();
    $("#statPage").append("<div id='statBody' class='bg-primary bg-recolor-offWhite'><!-- populated using js --></div>");
}

function updateStatTable() {
    deleteStatTable();
    createStatTable();
}

function formatDateArray(unformatedDateArray) {
    var dateArray = new Array();

    for (var x = 0; x < unformatedDateArray.length; x++) {
        dateArray.push(unformatedDateArray[x].substring(0, unformatedDateArray[x].lastIndexOf("/")));
    }

    return dateArray;
}

// converts a formated time string into a digit that represents the number of hours
function convertToHours(stringTime) {
    var hours = 0;
    hours += Number(stringTime.substring(0, stringTime.indexOf(":")));
    hours += Number(stringTime.substring(stringTime.indexOf(":") + 1, stringTime.lastIndexOf(":"))) / 60;
    hours += Number(stringTime.substring(stringTime.lastIndexOf(":") + 1)) / 3600;

    return hours;
}

// converts number of hours into a formated time string
function convertHoursToFormatedTime(time) {
    if (isNaN(time)) {
        return "0:00";
    }

    var myDate = new Date();

    var hours = Math.floor(time);

    time = time.toString();
    var minutes = Number(time.substring(time.indexOf("."))) * 60;

    myDate = initializeDates(myDate);
    myDate.setHours(hours, minutes);

    var returnDate = myDate.toString('H:mm')

    return returnDate;
}

function removeNullFromDB() {
    dayMapsDB.transaction(function (transaction) {
        transaction.executeSql('DELETE FROM dayMapsDB WHERE totalStartTime IS NULL OR totalStopTime IS NULL OR efficiency IS NULL', [],
            function (tx, result) {
                console.log("deleted null");
            },
            function (error) {
                console.log("Error occurred while deleting null");
            });
    });
}

//populates data arrays
function createCharts() {
    //makes sure that all data rows do not contain null and can be used to create graphs
    //removeNullFromDB();

    removeCharts();

    dayMapsDB.transaction(function (transaction) {
        //SELECT * FROM (SELECT * FROM dayMapsDB ORDER BY id desc limit 365) ORDER BY id ASC
        transaction.executeSql('SELECT * FROM dayMapsDB ORDER BY id desc limit 365', [], function (tx, results) {
            var date7 = new Array();
            var date14 = new Array();
            var date30 = new Array();

            var efficiency7 = new Array();
            var efficiency14 = new Array();
            var efficiency30 = new Array();

            var totalStartTime7 = new Array();
            var totalStartTime14 = new Array();
            var totalStartTime30 = new Array();

            var totalStopTime7 = new Array();
            var totalStopTime14 = new Array();
            var totalStopTime30 = new Array();

            var totalStartTime = 0;
            var totalStopTime = 0;

            var len = results.rows.length, i;

            //populate data arrays
            for (i = 0; i < len; i++) {
                if (i < 7) {
                    date7.unshift(results.rows.item(i).date);
                    efficiency7.unshift(results.rows.item(i).efficiency);
                    totalStartTime7.unshift(convertToHours(results.rows.item(i).totalStartTime));
                    totalStopTime7.unshift(convertToHours(results.rows.item(i).totalStopTime));
                }

                if (i < 14) {
                    date14.unshift(results.rows.item(i).date);
                    efficiency14.unshift(results.rows.item(i).efficiency);
                    totalStartTime14.unshift(convertToHours(results.rows.item(i).totalStartTime));
                    totalStopTime14.unshift(convertToHours(results.rows.item(i).totalStopTime));
                }

                if (i < 30) {
                    date30.unshift(results.rows.item(i).date);
                    efficiency30.unshift(results.rows.item(i).efficiency);
                    totalStartTime30.unshift(convertToHours(results.rows.item(i).totalStartTime));
                    totalStopTime30.unshift(convertToHours(results.rows.item(i).totalStopTime));
                }

                totalStartTime = totalStartTime + convertToHours(results.rows.item(i).totalStartTime);
                totalStopTime = totalStopTime + convertToHours(results.rows.item(i).totalStopTime);
            }

            if (len < 7 || len < 14 || len < 30 || len < 365) {
                var intitialCounter = i;

                for (i - 1; i < 7; i++) {
                    date7.push("");
                }
                i = intitialCounter;

                for (i - 1; i < 14; i++) {
                    date14.push("");
                }
                i = intitialCounter;

                for (i - 1; i < 30; i++) {
                    date30.push("");
                }
                i = intitialCounter;
            }

            date7 = formatDateArray(date7);
            date14 = formatDateArray(date14);
            date30 = formatDateArray(date30);

            //create charts
            hideAllEfficiencyCharts();
            hideAllTotalStopTimeCharts();
            hideAllTotalStartTimeCharts();

            createEfficiencyLineCharts("efficiencyChart7Days", date7, efficiency7, 4, "#3498db", "#79c9fd");
            createEfficiencyLineCharts("efficiencyChart14Days", date14, efficiency14, 4, "#3498db", "#79c9fd");
            createEfficiencyLineCharts("efficiencyChart30Days", date30, efficiency30, 3, "#3498db", "#79c9fd");

            createTimeLineCharts("totalStopTimeChart7Days", date7, totalStopTime7, 4, "#e74c3c", "#f7968c");
            createTimeLineCharts("totalStopTimeChart14Days", date14, totalStopTime14, 4, "#e74c3c", "#f7968c");
            createTimeLineCharts30("totalStopTimeChart30Days", date30, totalStopTime30, 3, "#e74c3c", "#f7968c");

            createTimeLineCharts("totalStartTimeChart7Days", date7, totalStartTime7, 4, "#1abc9c", "#5adec4");
            createTimeLineCharts("totalStartTimeChart14Days", date14, totalStartTime14, 4, "#1abc9c", "#5adec4");
            createTimeLineCharts30("totalStartTimeChart30Days", date30, totalStartTime30, 3, "#1abc9c", "#5adec4");

            $("#efficiencyChart7Days").show();
            $("#totalStopTimeChart7Days").show();
            $("#totalStartTimeChart7Days").show();

            // pie chart
            var myTotalStartTime = 0;
            var myTotalStopTime = 0;

            for (i = 0; i < len; i++) {
                myTotalStartTime = myTotalStartTime + convertToHours(results.rows.item(i).totalStartTime);
                myTotalStopTime = myTotalStopTime + convertToHours(results.rows.item(i).totalStopTime);
            }

            var averageStartTime = myTotalStartTime / len;
            var averageStopTime = myTotalStopTime / len;

            createHoursPieChart("hoursPieChart", ["Productive Time", "Wasted Time"], ["#3498db", "#e74c3c"], [averageStartTime, averageStopTime]);

            $("#averageStartTimeLegendTime").html(convertHoursToFormatedTime(averageStartTime));
            $("#averageStopTimeLegendTime").html(convertHoursToFormatedTime(averageStopTime));
        })
    });
}

    /////////////////////////////////////////////// Charts
 
    function createEfficiencyLineCharts(id, xDataType, yDataType, pointSize, pointColor, backgroundColor) {
        var ctx = document.getElementById(id);

        var myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: xDataType,
                datasets: [
                    {
                        fill: true,
                        lineTension: 0.2,
                        backgroundColor: backgroundColor,
                        borderColor: pointColor,
                        borderCapStyle: 'butt',
                        borderDash: [],
                        borderDashOffset: 0.0,
                        borderJoinStyle: 'miter',
                        pointBorderColor: pointColor,
                        pointBackgroundColor: pointColor,
                        pointBorderWidth: 1,
                        onHover: null,
                        pointRadius: pointSize,
                        pointHitRadius: 0,
                        data: yDataType,
                        spanGaps: false,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                autoSkip: true,
                legend: {
                    display: false
                },
                tooltips: false,
                scales: {
                    yAxes: [{
                        ticks: {
                            startAtZero: true,
                            min: 0,
                            max: 100,
                            stepSize: 20,
                            callback: function (value, index, values) {
                                return value + "%";
                            }
                        }
                    }],
                    xAxes: [{
                        type: 'category',
                        ticks: {
                            startAtZero: true,
                            callback: function (value, index, values) {
                                return value + " ";
                            }
                        }
                    }]
                }
            }
        });
    }

    //--------------------------------------------------------------------------------------------------------------------------------------------------

    function createTimeLineCharts(id, xDataType, yDataType, pointSize, pointColor, backgroundColor) {
        var ctx = document.getElementById(id);

        var myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: xDataType,
                datasets: [
                    {
                        fill: true,
                        lineTension: 0.2,
                        backgroundColor: backgroundColor,
                        borderColor: pointColor,
                        borderCapStyle: 'butt',
                        borderDash: [],
                        borderDashOffset: 0.0,
                        borderJoinStyle: 'miter',
                        pointBorderColor: pointColor,
                        pointBackgroundColor: pointColor,
                        pointBorderWidth: 1,
                        onHover: null,
                        pointRadius: pointSize,
                        pointHitRadius: 0,
                        data: yDataType,
                        spanGaps: false,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                autoSkip: true,
                legend: {
                    display: false
                },
                tooltips: false,
                scales: {
                    yAxes: [{
                        ticks: {
                            startAtZero: true,
                            min: 0,
                            callback: function (value, index, values) {
                                return value + " h";
                            }
                        }
                    }],
                    xAxes: [{
                        type: 'category',
                        ticks: {
                            startAtZero: true,
                            callback: function (value, index, values) {
                                return value + " ";
                            }
                        }
                    }]
                }
            }
        });
    }

    function createTimeLineCharts30(id, xDataType, yDataType, pointSize, pointColor, backgroundColor) {
        var ctx = document.getElementById(id);

        var myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: xDataType,
                datasets: [
                    {
                        fill: true,
                        lineTension: 0.2,
                        backgroundColor: backgroundColor,
                        borderColor: pointColor,
                        borderCapStyle: 'butt',
                        borderDash: [],
                        borderDashOffset: 0.0,
                        borderJoinStyle: 'miter',
                        pointBorderColor: pointColor,
                        pointBackgroundColor: pointColor,
                        pointBorderWidth: 1,
                        onHover: null,
                        pointRadius: pointSize,
                        pointHitRadius: 0,
                        data: yDataType,
                        spanGaps: false,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                autoSkip: true,
                legend: {
                    display: false
                },
                tooltips: false,
                scales: {
                    yAxes: [{
                        ticks: {
                            startAtZero: true,
                            min: 0,
                            callback: function (value, index, values) {
                                return value + " h";
                            }
                        }
                    }],
                    xAxes: [{
                        type: 'category',
                        ticks: {
                            startAtZero: true,
                            callback: function (value, index, values) {
                                if (index % 2 === 0) {
                                    return value + " ";
                                }
                            }
                        }
                    }]
                }
            }
        });
    }

    //--------------------------------------------------------------------------------------------------------------------------------------------------

//"hoursPieChart", ["Productive Time", "Wasted Time"], ["#3498db", "#e74c3c"], [363], [536]
    function createHoursPieChart(id, labelsArray, backgroundColorArray, dataArray) {
        var ctx = document.getElementById(id);
        var myPieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ["Productive Time", "Wasted Time"],
                datasets: [
                    {
                        data: dataArray,
                        backgroundColor: ["#1abc9c", "#e74c3c"],
                        hoverBackgroundColor: ["#1abc9c", "#e74c3c"]
                    }]
            },
            options: {
                legend: {
                    display: false,
                    labels: {
                        fontSize: 14,
                        fontFamily: "Arial"
                    }
                },
                tooltips: false,
            }
        });
    }

    ///////////////////////////////////////////////

    function hideAllEfficiencyCharts() {
        $("#efficiencyChart7Days").hide();
        $("#efficiencyChart14Days").hide();
        $("#efficiencyChart30Days").hide();
    }

    function hideAllTotalStopTimeCharts() {
        $("#totalStopTimeChart7Days").hide();
        $("#totalStopTimeChart14Days").hide();
        $("#totalStopTimeChart30Days").hide();
    }

    function hideAllTotalStartTimeCharts() {
        $("#totalStartTimeChart7Days").hide();
        $("#totalStartTimeChart14Days").hide();
        $("#totalStartTimeChart30Days").hide();
    }

    function removeCharts() {
        $("#efficiencyChart7Days").remove();
        $("#efficiencyChart14Days").remove();
        $("#efficiencyChart30Days").remove();

        $("#totalStopTimeChart7Days").remove();
        $("#totalStopTimeChart14Days").remove();
        $("#totalStopTimeChart30Days").remove();

        $("#totalStartTimeChart7Days").remove();
        $("#totalStartTimeChart14Days").remove();
        $("#totalStartTimeChart30Days").remove();

        $("#hoursPieChart").remove();

        $("#efficiencyChartContainer").append("<canvas id='efficiencyChart7Days' class='fuckYou' width='5' height='5'></canvas> <canvas id='efficiencyChart14Days' width='5' height='5'></canvas>" +
            "<canvas id='efficiencyChart30Days' width='5' height='5'></canvas>");

        $("#totalStopTimeChartContainer").append("<canvas id='totalStopTimeChart7Days' width='5' height='5'></canvas> <canvas id='totalStopTimeChart14Days' width='5' height='5'>" +
            "</canvas><canvas id='totalStopTimeChart30Days' width='5' height='5'></canvas>");

        $("#totalStartTimeChartContainer").append("<canvas id='totalStartTimeChart7Days' widt='5' height='5'></canvas><canvas id='totalStartTimeChart14Days' width='5' height='5'></canvas>" +
            "<canvas id='totalStartTimeChart30Days' width='5' height='5'></canvas>");

        $("#pieChartContainer").append("<canvas id='hoursPieChart' width='5' height='5'></canvas>");

        console.log("reset charts");
    }

    /////////////////////////////////////////////// Sliders
    //totalStopTimeSlider
    function createSliders(id) {
        var $slider = $("#" + id);

        if ($slider.length > 0) {
            $slider.slider({
                min: 1,
                max: 3,
                value: 1,
                orientation: "horizontal",
                range: "min",
                change: function (event, ui) { }
            }).addSliderSegments($slider.slider("option").max);
        }
    }

    function updateCharts() {
        $(".slider").each(function () {
            $(this).on("slidechange", function () {
                var name = $(this).attr("id"); //efficiencySlider

                var nameRoot = "";

                switch (name) {
                    case "efficiencySlider":
                        nameRoot = "efficiencyChart";
                        break;
                    case "totalStopTimeSlider":
                        nameRoot = "totalStopTimeChart";
                        break;
                    case "totalStartTimeSlider":
                        nameRoot = "totalStartTimeChart";
                        break;
                }

                var value = $(this).slider("value");

                // for the purpose of making sure that the eval can hide all of each graph type
                var evalHideAll = "hideAll" + nameRoot.charAt(0).toUpperCase() + nameRoot.substring(1, nameRoot.lastIndexOf("Chart")) + "Charts();";

                switch (value) {
                    case 1:
                        eval(evalHideAll); // eval that hides each graph type
                        $(document.getElementById(nameRoot + "7Days")).show();
                        $(document.getElementById(nameRoot + "Range")).html("Last 7 Days");
                        break;
                    case 2:
                        eval(evalHideAll);
                        $(document.getElementById(nameRoot + "14Days")).show();
                        $(document.getElementById(nameRoot + "Range")).html("Last 14 Days");
                        break;
                    case 3:
                        eval(evalHideAll);
                        $(document.getElementById(nameRoot + "30Days")).show();
                        $(document.getElementById(nameRoot + "Range")).html("Last 30 Days");
                        break;
                }

            })
        })
    }

    $.fn.addSliderSegments = function (amount, orientation) {
        return this.each(function () {
            if (orientation == "vertical") {
                var output = ''
                  , i;
                for (i = 1; i <= amount - 2; i++) {
                    output += '<div class="ui-slider-segment" style="top:' + 100 / (amount - 1) * i + '%;"></div>';
                };
                $(this).prepend(output);
            } else {
                var segmentGap = 100 / (amount - 1) + "%"
                  , segment = '<div class="ui-slider-segment" style="margin-left: ' + segmentGap + ';"></div>';
                $(this).prepend(segment.repeat(amount - 2));
            }
        });
    };

    ///////////////////////////////////////////////

    function createStatBox(date, totalStartTime, totalStopTime, efficiency) {

        $("#statBody").append("<div class='statBox'><div class='statBoxInner'> <p class='statText statTextHeader removeSpacing'>" + date + "</p> <div class='row'><div class='col-xs-6'> <p class='statText statTextBody removeSpacing'>Productive Time - "
            + totalStartTime + "</p> </div><div class='col-xs-6'><p class='statTextWasted statText statTextBody removeSpacing'>Wasted Time - " + totalStopTime + "</p> </div></div> <p class='statText statTextBody statTextBody2 removeSpacing'>Efficiency - "
            + efficiency + "</p></div></div>");
        //$("#statBody").append("<p class='statText statTextHeader removeSpacing'>" + date + "</p>");
        //$("#statBody").append("<div class='row'><div class='col-xs-6'>");
        //$("#statBody").append("<p class='statText statTextBody removeSpacing'>Productive Time - " + totalStartTime + "</p>");
        //$("#statBody").append("</div><div class='col-xs-6'><p class='statText statTextBody removeSpacing'>Wasted Time - " + totalStopTime + "</p>");
        //$("#statBody").append("</div></div>");
        //$("#statBody").append("<p class='statText statTextBody statTextBody2 removeSpacing'>Efficiency - " + efficiency + "</p>");
            //$("#statBody").append("</div>");
   
    }

    //really bad hack to get around the last statBox border-bottom
    function createLastStatBox(date, totalStartTime, totalStopTime, efficiency) {
        $("#statBody").append("<div class='lastStatBox statBox'><div class='statBoxInner'> <p class='statText statTextHeader removeSpacing'>" + date
            +"</p> <div class='row'><div class='col-xs-6'> <p class='statText statTextBody removeSpacing'>Productive Time - "
            + totalStartTime + "</p> </div><div class='col-xs-6'><p class='statTextWasted statText statTextBody removeSpacing'>Wasted Time - " + totalStopTime
            + "</p> </div></div> <p class='statText statTextBody statTextBody2 removeSpacing'>Efficiency - "
            + efficiency + "</p></div></div>");
    }

    /*
                        <div class="statBoxInner">

                            <p class="statText statTextHeader removeSpacing">8/13/16</p>

                            <div class="row">
                                <div class="col-xs-6">
                                    <p class="statText statTextBody removeSpacing">Productive Time - 9:34</p>
                                </div>

                                <div class="col-xs-6">
                                    <p class="statText statTextBody removeSpacing">Wasted Time - 2:51</p>
                                </div>
                            </div>

                            <p class="statText statTextBody statTextBody2 removeSpacing">Efficiency - 62.46%</p>

                        </div>

    */

    //testing
    function displayTable() {
        dayMapsDB.transaction(function (transaction) {
            transaction.executeSql('SELECT * FROM dayMapsDB', [], function (tx, results) {
                var len = results.rows.length, i;
                for (i = 0; i < len; i++) {
                    console.log(results.rows.item(i).id + " " + results.rows.item(i).date + " " + results.rows.item(i).efficiency + " " + results.rows.item(i).totalStartTime + " " + results.rows.item(i).totalStopTime);
                }
            }, null);
        });
    };


    $("#questionMarkWrapper").dblclick(function () {
        //deletes table
        /*
        dayMapsDB.transaction(function (transaction) {
            transaction.executeSql('DROP TABLE IF EXISTS dayMapsDB')});
       */

        dayMapsDB.transaction(function (transaction) {
            var executeQuery = "DELETE FROM dayMapsDB where 1=1";
            transaction.executeSql(executeQuery, [],
              //On Success
              function (tx, result) { alert('Deleted all rows successfully'); },
              //On Error
              function (error) { alert('Error in deleting all rows'); });
        });
    })

    $("#testButton").click(function () {
        dayMapsDB.transaction(function (transaction) {

            var dateTest = $("#dateTest").val();
            var efficiencyTest = $("#efficiencyTest").val();
            var totalStartTimeTest = $("#totalStartTimeTest ").val();
            var totalStopTimeTest = $("#totalStopTimeTest ").val();

            var executeQuery = "INSERT INTO dayMapsDB (date, efficiency, totalStartTime, totalStopTime) VALUES (?, ? ,? ,?)";

            transaction.executeSql(executeQuery, [dateTest, efficiencyTest, totalStartTimeTest, totalStopTimeTest]
                , function (tx, result) {
                    console.log('Inserted test into dayMapsDB');
                },
                function (error) {
                    console.log('Error occurred when inserting test into dayMapsDB');
                });
        });
    })