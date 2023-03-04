function forecast(lat, lon) {
  document.getElementById('plotProgress').innerHTML = 'loading';
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    document.getElementById('plotProgress').innerHTML += " .";
    if (this.readyState == 4 && this.status == 200) {
      var wxData = xmlToData(this.responseXML);
      var wxStr = getForecastStr(wxData);
      makePlot(wxData, wxStr);
      document.getElementById('plotProgress').innerHTML = '';
    }
  }
  //var forecastUrl = "https://forecast.weather.gov/MapClick.php?lat=37.132601&lon=-76.6089303&FcstType=digitalDWML&7401";  // Felker Field
  var forecastUrl = "https://forecast.weather.gov/MapClick.php?lat=" + lat + "&lon=" + lon
  + "&FcstType=digitalDWML&7401&" + Math.floor(1000000*Math.random());

  xhttp.open("GET", forecastUrl, true);
  xhttp.send();
};

xmlToData: function(xml) {
  var data = {hours: [], days: [], temps: [], precips: [], dayLabels: [], description: ""};

  var x = xml.getElementsByTagName('temperature');
  var tempValues = x[2].getElementsByTagName('value');

  var x = xml.getElementsByTagName('probability-of-precipitation');
  var precipValues = x[0].getElementsByTagName('value');

  var timeStrs = xml.getElementsByTagName('start-valid-time');

  var x = xml.getElementsByTagName('description');
  if (x.length) description = x[0].childNodes[0].nodeValue;

  var day = 0;

  for (i = 0, j = tempValues.length; i < j; i++) {
    if (tempValues[i].childNodes[0]) {         // sometimes the temps are empty (no child node)
      var timeMoment = moment.parseZone(timeStrs[i].childNodes[0].nodeValue);
      // timeMoment = timeMoment.add(30, 'm'); // add 30 minutes
      data.hours.push(timeMoment.hour());

      if (i == 0 && timeMoment.hour() != 0) data.dayLabels.push(timeMoment.format('dd'));  // label first day
      if (timeMoment.hour() == 0) {      // label each new day
        day++;
        data.dayLabels.push(timeMoment.format('dd'));
      }
      data.days.push(day);

      var temp = null;
      if (tempValues[i].childNodes.length) temp = tempValues[i].childNodes[0].nodeValue;
      data.temps.push(parseInt(temp));

      var precip = null;
      if (precipValues[i].childNodes.length) precip = precipValues[i].childNodes[0].nodeValue;
      data.precips.push(parseInt(precip));
    }
  }
  return data;
};

getForecastStr: function(data) {
  var dataStr = {hours: [], days: [], str: []};

  for ( i = 0, j = data.temps.length; i < j; i++) {
    dataStr.hours.push(data.hours[i]);
    dataStr.days.push(data.days[i]);
    dataStr.str.push("");

    //  if (precips[i] > 20) dataStr.str[i] = "-";
    if (data.precips[i] > 30) dataStr.str[i] = "-";
    if (data.precips[i] > 60) dataStr.str[i] = "/";
  }

  var maxTemp = -9999;
  var nMax = 0;
  var minTemp = 9999;
  var nMin = 0;

  for ( i = 0, j = data.temps.length; i < j; i++) {   // loop through temps

    if (data.temps[i] == maxTemp) nMax++;
    if (data.temps[i] > maxTemp) {
      var iMax = i;
      nMax = 0;
      maxTemp = data.temps[i];
    }

    if (data.temps[i] == minTemp) nMin++;
    if (data.temps[i] < minTemp) {
      var iMin = i;
      nMin = 0;
      minTemp = data.temps[i];
    }

    if (data.hours[i] == 23 || i == data.temps.length-1) {     // end of day row
      if (data.hours[iMax] != 0 && data.hours[iMax] != 23 && iMax != 0) {
        iMax = Math.floor(iMax + nMax/2);
        dataStr.str[iMax] = data.temps[iMax];
        if (iMax < 23 ) dataStr.str[iMax+1] = "";
        if (iMax > 0) dataStr.str[iMax-1] = "";
      }
      maxTemp = -9999;

      if (data.hours[iMin] != 0 && data.hours[iMin] != 23 && iMin != 0) {
        iMin = Math.floor(iMin + nMin/2);
        dataStr.str[iMin] = data.temps[iMin];
        if (iMin < 23 ) dataStr.str[iMin+1] = "";
        if (iMin > 0) dataStr.str[iMin-1] = "";
      }
      minTemp = 9999;
    }
  }
  dataStr.str[data.temps.length-1] = "";
  return dataStr;
};

makePlot: function(data, dataStr) {
  var colorscaleValue = [
    [0, '#ffd2ff'],
    [1/10, '#df8ee2'],
    [2/10, '#a760c8'],
    [3/10, '#5e4eac'],
    [4/10, '#37c4e2'],
    [5/10, '#33de9d'],
    [6/10, '#7ed634'],
    [7/10, '#ffff32'],
    [8/10, '#fb9232'],
    [9/10, '#da4f33'],
    [1, '#b23833']
  ];

  var plotData = [{
    x: data.hours,
    y: data.days,
    z: data.temps,
    type: 'heatmap',
    colorscale: colorscaleValue,
    showscale: false,
    connectgaps: false,
    //zsmooth: (document.getElementById('smoothButton').value == 'unsmooth') ? "best" : false,
    zsmooth: false,
    zmin: 0,
    zmax: 105
  }];

  var layout = {
    //title: description,
    annotations: [],
    width: 300,
    height: 375,
    margin: { l:25, r: 0, t:20, b: 0, pad: 3},
    plot_bgcolor: 'black',
    paper_bgcolor: 'black',
    xaxis: {
      showline: false,
      showgrid: false,
      zeroline: false,
      ticks: "",
      side: "top",
      //  tickvals: [3, 6, 9, 12, 15, 18, 21],
      tickvals: [2.5, 5.5, 8.5, 11.5, 14.5, 17.5, 20.5],
      ticktext: [3, 6, 9, 12, 3, 6, 9],
      tickfont: {color: 'white', size: 13}
    },
    yaxis: {
      autorange: 'reversed',
      showline: false,
      showgrid: false,
      ticks: "",
      zeroline: false,
      tickvals: [0, 1, 2, 3, 4, 5, 6, 7],
      //  ticktext: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      ticktext: data.dayLabels,
      tickfont: {color: 'white', size: 13}
    }
    /*  shapes: [
    {
    type: 'line',
    xref: 'x',
    yref: 'y',
    x0: 4, x1: 4.1, y0: -0.5, y1: 8,
    fillcolor: 'black',
    opacity: 0.1
  },
  {
  type: 'line',
  xref: 'x',
  yref: 'y',
  x0: 20, x1: 19.9, y0: -0.5, y1: 8,
  fillcolor: 'black',
  opacity: 0.1
}
] */
};

for ( var i = 0, j = data.temps.length; i < j; i++ ) {
  var currentValue = data.temps[i];
  var result = {
    xref: 'x1',
    yref: 'y1',
    x: dataStr.hours[i],
    y: dataStr.days[i],
    text: dataStr.str[i],
    font: {color: 'black'/*, family: 'PT Sans Narrow'*/, size: 13},
    showarrow: false
  };
  layout.annotations.push(result);
};
//    Plotly.plot(plotWrapper, data, layout, {showLink: false});
document.querySelector('.js-plotly-plot') ? Plotly.react(plotWrapper, plotData, layout, {staticPlot: true}) :
Plotly.newPlot(plotWrapper, plotData, layout, {staticPlot: true);

  //  if (document.getElementById('wxmapDiv').className) // chart already exists
  //  Plotly.react('wxmapDiv', plotData, layout, {staticPlot: true});
  //  else
  //  Plotly.newPlot('wxmapDiv', plotData, layout, {staticPlot: true});
};

function currentObservation(station) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      //  var xmlDoc = $.parseXML(this.responseText);
      //  var $xml = $(xmlDoc);
      x = this.responseXML.getElementsByTagName('temp_f');
      document.getElementById("currentDiv").innerHTML = station + "&nbsp&nbsp" + x[0].childNodes[0].nodeValue + " F";
    }
  };
  var currentObsUrl = "https://w1.weather.gov/xml/current_obs/" + station + ".xml?"
  + Math.floor(1000000*Math.random());    // Felker Field
  xhttp.open("GET", currentObsUrl, true);
  xhttp.send();
};

function smoothToggle(button) {
  var isSmooth = (button.value == 'unsmooth') ? false : "best";
  var update = {zsmooth: isSmooth};
  Plotly.restyle('wxmapDiv', update);
  button.value = (isSmooth) ? "unsmooth" : "smooth";
};

function initLocationData(){
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      locationData = JSON.parse(this.responseText);
      //    console.log(locationData["KFAF"].name);
    }
  };
  xmlhttp.open("GET", "location_data.json", true);
  xmlhttp.send();
}
