/*
* Magic Mirror module for displaying weather forecast
* By Matt Whalley
* MIT Licensed
*/

Module.register("MMM-WxChart",{
  // Default module config.
  defaults: {
    refInterval: 300000,   // 5 minutes
    forecastXmlStr: "",
    forecastXmlFile: "public/forecast.xml",
    insideImg: "modules/MMM-TempTrace/public/house_white.png",
    outsideImg: "modules/MMM-TempTrace/public/leaf_green.png",
    heatImg: "modules/MMM-TempTrace/public/heat_rays.png",
    width: 560, // 300
    height: 470, // 250
    fadeSpeed: 0    // only used if content will change
  },

  getScripts: function() {
    return ["https://cdn.plot.ly/plotly-latest.min.js"];
   // return ["https://cdn.plot.ly/plotly-1.50.1.min.js"];
    return ["https://momentjs.com/downloads/moment.js"];
    //return ["http://localhost:8080/modules/MMM-WxChart/WxChartFunc.js"];
  },

  start: function() {
    Log.info("Starting module: " + this.name);

    // Schedule update timer.
    var that = this;
    setInterval(function() {
      if (that.config.forecastXmlFile != null) {
        that.readForecastXmlFile((response) => {
          let xmlStr = response.toString();
          if (xmlStr != that.config.forecastXmlStr) {
            that.config.forecastXmlStr = xmlStr;
            that.updateDom(that.config.fadeSpeed);
          }
        });
      }
      //that.updateDom(that.config.fadeSpeed);
    }, 20000);
  },

  // Define required scripts.
  //  getScripts: function() {
  //    return ["jquery.sparkline.js"];
  //  },

  //Import additional CSS Styles
  getStyles: function() {
    return ['WxChart.css']
  },

  // Override dom generator.
  getDom: function() {
    var wrapper = document.createElement("div");
    var plotWrapper = document.createElement("div");

    //plotWrapper.style.display = "inline-block";
    //plotWrapper.style.verticalAlign = "middle";

    wrapper.appendChild(plotWrapper);

    wrapper.style.float = 'right';
    wrapper.className = this.config.classes ? this.config.classes : "bright small light";

    if (this.config.forecastXmlStr) {
      parser = new DOMParser();
      xml = parser.parseFromString(this.config.forecastXmlStr,"text/xml");
      
      var wxData = xmlToData(xml);
      var wxStr = getForecastStr(wxData);
      makePlot(wxData, wxStr);
    }

    function xmlToData(xml) {
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

    function getForecastStr(data) {
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

      for (i = 0, j = dataStr.str.length; i < j; i++) {
        dataStr.str[i] = '<b>' + dataStr.str[i] + '</b>';
      }

      return dataStr;
    };

    function makePlot(data, dataStr) {
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
        zsmooth: false, // "best",
        zmin: 0,
        zmax: 105
      }];

      var layout = {
        //title: description,
        annotations: [],
        width: 450,
        height: 450,
        margin: {t: 60, r: 10, b: 0, l: 30, pad: 3},
        plot_bgcolor: 'black',
        paper_bgcolor: 'black',
        font: {size: 24, color: 'white'},
        xaxis: {
          showline: false,
          showgrid: false,
          zeroline: false,
          ticks: "",
          side: "top",
          tickvals: [2.5, 5.5, 8.5, 11.5, 14.5, 17.5, 20.5],
          ticktext: [3, 6, 9, 12, 3, 6, 9],
          //tickfont: {color: 'white', size: 14}
        },
        yaxis: {
          autorange: 'reversed',
          showline: false,
          showgrid: false,
          ticks: "",
          zeroline: false,
          tickvals: [0, 1, 2, 3, 4, 5, 6, 7],
          ticktext: data.dayLabels,
          //tickfont: {color: 'white', size: 14}
        }
};

for ( var i = 0, j = data.temps.length; i < j; i++ ) {
  var currentValue = data.temps[i];
  var result = {
    xref: 'x1',
    yref: 'y1',
    x: dataStr.hours[i],
    y: dataStr.days[i],
    text: dataStr.str[i],
    font: {color: 'black'/*, family: 'PT Sans Narrow'*/, size: 24},
    showarrow: false
  };
  layout.annotations.push(result);
};

var plotlyConfig = {
  //      scrollZoom: false,
  //      editable: false,
  staticPlot: true,
  displayModeBar: false,
  showLink: false
};

Plotly.react(plotWrapper, plotData, layout, plotlyConfig);

};

return wrapper;
},

readForecastXmlFile: function(callback) {
  var xobj = new XMLHttpRequest();
  xobj.overrideMimeType("text/plain");
  xobj.open("GET", this.file(this.config.forecastXmlFile), true);
  xobj.onreadystatechange = function () {
    if (xobj.readyState == 4 && xobj.status == "200") {
      callback(xobj.responseText);
    }
  };
  xobj.send(null);
}
});
