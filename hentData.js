//Dc variabels
var depthValue;
dc.config.defaultColors( d3.schemeCategory10);
//Map variables
let  map = {};
let geomDimension= {};
let featureLayer= {};
let markers= {};
let geoData= {};
let heatMap= {};

const displayText = {
    "title": "Jordskælv",
    "fetching": "Henter data",
    "aggragationPrompt" : "Vis jordskelv som",
    "aggragationTypes": ["Grupper","Heat map"]
};

const magnitudeChart = dc.barChart("#dc-magnitude-chart");
const depthChart = dc.barChart("#dc-depth-chart");
const timeChart = dc.barChart("#dc-time-chart");
const dataTable = dc.dataTable("#dc-table-graph");

geoJson2heat = function(geojson) {
    console.log(geojson)
    return geojson.map(function(feature) {

        return [parseFloat(feature.geometry.coordinates[1]), parseFloat(feature.geometry.coordinates[0])];
    });
}

function mapTypeToggel(btr,checked){
    console.log(btr+ " : "+checked);
    if(btr== "Heat map"){
        if (checked) map.addLayer(heatMap); else map.removeLayer(heatMap)
    }
    if (btr=="Grupper"){
        if (checked) map.addLayer(markers); else map.removeLayer(markers)
    }
}

function displayAggTypes() {
    const form = d3.select("#mapTypes").append("form");
    const j = 1;  // Choose the rectangle as default
    labels = form.selectAll("label")
        .data(displayText.aggragationTypes)
        .enter()
        .append("label")
        .text(function (d) {
            return  d + " ";
        })
        .insert("input")
        .attr("class", "checkbox-inline")
        .attr("type","checkbox")
        .attr("onclick","mapTypeToggel(this.name,this.checked)")
        //.attr("class", "mapType")
        .attr("name", d => d)
        .attr("value", function (d, i) {
                return i;
            }
        )
        .property("checked", function (d, i) {
            return i === j;
        });
}

function updateMapFilter() {
    var bounds = map.getBounds(),
        n=bounds._northEast.lat,
        e=bounds._northEast.lng,
        s=bounds._southWest.lat,
        w=bounds._southWest.lng;

    var boundsFeature = {
        type: 'Feature',
        geometry: {
            type:'Polygon',
            coordinates: [
                [[w, s], [w, n], [e, n], [e, s], [w, s]]
            ]
        }
    }

    geomDimension.filter(function(d) {
        //make feature
        var point = {
            type: 'Feature',
            geometry: d
        }

        return turf.inside(point, boundsFeature)
    })

    dc.redrawAll();
}

function createBaseMap(){
    L.mapbox.accessToken = 'pk.eyJ1IjoiZXdoIiwiYSI6ImNpZ2x4aGxiajAyMWZ2MWx6cm4wbmM3ODEifQ.dsyuEGi0oOvSxmKRvWgbLg';
    //map = L.mapbox.map('map', 'mapbox.streets')
    map = L.mapbox.map('map')
        .setView([38.1089, 13.3545], 2);
    L.esri.basemapLayer('NationalGeographic').addTo(map);
    map.on('moveend', function() {
        updateMapFilter()
    });
    map.on('zoomend', function() {
        updateMapFilter()
    })
}
function createDataLayers(){
    featureLayer = L.mapbox.featureLayer(depthValue.top(Infinity))
    markers = L.markerClusterGroup();
    markers.addLayer(featureLayer);
 //   markers.addTo(map);
    geoData = geoJson2heat(depthValue.top(Infinity));
    heatMap = new L.heatLayer(geoData,{radius: 40, blur: 35,maxZoom: 13});

    map.addLayer(heatMap)

}
async function fetchData(){
    //d3.select("#statusInfo").text(displayText.fetchingPeriodData + period);
    //const periodArray = [period];
     try {
        const dataset = await d3.json("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson");
         d3.select("#status").node().innerHTML=""; //Clear wait status
         displayAggTypes();

         /****************************************
          * 	Run the data through crossfilter    *
          ****************************************/
         let facts = crossfilter(dataset.features);  // Gets our 'facts' into crossfilter
         var magValue = facts.dimension(function (d) {
             return d.properties.mag;       // group or filter by magnitude
         });
         var magValueGroupSum = magValue.group()
             .reduceSum(function(d) { return d.properties.mag; });	// sums the magnitudes per magnitude
         var magValueGroupCount = magValue.group()
             .reduceCount(function(d) { return d.properties.mag }) // counts the number of the facts by magnitude

// for Depth
         depthValue = facts.dimension(function (d) {
             return Math.round(d.geometry.coordinates[2]);
         });
         var depthValueGroup = depthValue.group();

// define a daily volume Dimension
         var volumeByDay = facts.dimension(function(d) {
             return d3.timeDay(d.properties.time);
         });
// map/reduce to group sum
         var volumeByDayGroup = volumeByDay.group()
             .reduceCount(function(d) { d.properties.time; });

// For datatable
         var timeDimension = facts.dimension(function (d) {
             return d.properties.time;
         }); // group or filter by time

         geomDimension = facts.dimension(function(d) {
             return d.geometry
         });


         //Create Base map
         createBaseMap();

         //Create Data Layers
         createDataLayers();
// Magnitide Bar Graph Summed
         magnitudeChart.width(900)
             .height(350)
             .margins({top: 10, right: 10, bottom: 20, left: 40})
             .dimension(magValue)								// the values across the x axis
             .group(magValueGroupCount)							// the values on the y axis
             .transitionDuration(500)
             .centerBar(true)
             .gap(56)                                            // bar width Keep increasing to get right then back off.
             .x(d3.scaleLinear().domain([0.0, 7.5]))
             .elasticY(true)
             .xAxis().tickFormat(function(v) {return v;});
         // Depth bar graph

         depthChart.width(900)
             .height(300)
             .margins({top: 10, right: 10, bottom: 20, left: 40})
             .dimension(depthValue)
             .group(depthValueGroup)
             .transitionDuration(500)
             .centerBar(true)
             .gap(1)                    // bar width Keep increasing to get right then back off.
             .x(d3.scaleLinear().domain([0, 100]))
             .elasticY(true)
             .xAxis().tickFormat(function(v) {return v;});
// time graph
         let timeEnd = new Date();
         let timeStart = (function(d){ d.setDate(d.getDate()-30); return d})(new Date)
         console.log(depthValue.top(Infinity))
         console.log(depthValueGroup.top(Infinity))

         timeChart.width(900)
             .height(300)
             .margins({top: 10, right: 10, bottom: 20, left: 40})
             .dimension(volumeByDay)
             .group(volumeByDayGroup)
             .transitionDuration(500)
             .centerBar(true)
             .gap(1)
             .elasticY(true)
             .x(d3.scaleTime().domain([timeStart, timeEnd])) // scale and domain of the graph
             .xAxis();

         const dateFormat = d3.timeFormat("%Y-%m-%d");
         dataTable.width(960).height(800)
             .dimension(timeDimension)
             .group(function(d) { return "De 10 første der opfylder filteret"})

             .size(10)							// number of rows to return
             .columns([
                 function(d) { return dateFormat(d.properties.time); },
                 function(d) { return d.geometry.coordinates[0]; },
                 function(d) { return d.geometry.coordinates[1]; },
                 function(d) { return d.geometry.coordinates[2]; },
                 function(d) { return d.properties.mag; },
                 function(d) { return "<a href="+ d.properties.url + " target=_blank>Læs mere</a>"},
              ]);

         depthChart.on('renderlet', function(chart) {
             if (map.hasLayer(heatMap)) {
                 map.removeLayer(heatMap);
                 geoData = geoJson2heat(depthValue.top(Infinity));
                 heatMap =  L.heatLayer(geoData,{radius: 40, blur: 25, maxZoom: 17});
                 map.addLayer(heatMap)
             }
             if (map.hasLayer(markers)){
                 map.removeLayer(markers);
                 markers.removeLayer(featureLayer);
                 featureLayer = L.mapbox.featureLayer(depthValue.top(Infinity))

                 console.log(depthValue.top(Infinity));
                 markers.addLayer(featureLayer);
                 map.addLayer(markers);
             }


         });
         dc.renderAll();


    } catch(e) {
        console.log(e); // 30
    }

}
d3.select("#pageTitle").node().innerHTML=displayText.title;
d3.select("#title").node().innerHTML=displayText.title;

d3.select("#status").node().innerHTML=displayText.fetching;
fetchData();
