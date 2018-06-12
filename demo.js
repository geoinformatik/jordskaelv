//Could be replaced bu version form Jstat
//jStat.normal.pdf( x, mean, std )

function gaussian_pdf(x, mean, sigma) {
    var gaussianConstant = 1 / Math.sqrt(2 * Math.PI),
        x = (x - mean) / sigma;
    return gaussianConstant * Math.exp(-.5 * x * x) / sigma;
};


var margin = {top: 10, right: 30, bottom: 50, left: 40},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;


var x = d3.scaleLinear()
    .range([margin.left,width-margin.right]);
var xlable = "Antal mænd pr kvide";


var yHist = d3.scaleLinear()
    .range([height, 0]);
var yHistLable ="Antal kommuner";

var yAccum = d3.scaleLinear()
    .range([height, 0])
    .domain([0,1]);
var yAccumLable = "Akkumuleet frekvens";

var kommuneData;

function drawSvg(ticks){
var svgtest = d3.select("#histogram").select("svg");
if (!svgtest.empty()){
     svgtest.remove()
    console.log("Remove");
}

    var svg = d3.select("#histogram").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    if (ticks == 0){
        ticks = Math.ceil(Math.sqrt(kommuneData.length))
    }

    //when we use ticks for bins we get nice intervales .
    var histogram = d3.histogram()
        .value(d => d)
        .domain(x.domain())
        .thresholds(x.ticks(ticks));

    var bins = histogram(kommuneData.map(d => d[1]));
    console.log(ticks);
    console.log(bins);

    yHist.domain([0, d3.max(bins, function(d) { return d.length; })]);

    var rects = svg.selectAll("rect")
        .data(bins)

    rects.exit().remove()

    rectsEnter = rects.enter().append("rect")
        .attr("class", "bar").attr("x", 1)
        .attr("transform", function(d) {
            return "translate(" + x(d.x0) + "," + yHist(d.length) + ")"; })
        .attr("width", function(d) { return x(d.x1) - x(d.x0) -1 ; })
        .attr("height", function(d) { return height - yHist(d.length); });


    var acumLine = d3.line()
        .x((d) => x(d[1]))
        .y((d) => yAccum(d[2]))
        .curve(d3.curveLinear);


    var line = svg.append('path')
        .attr('d', acumLine(kommuneData))
        .attr('class', 'AccumLine');


    // add the x Axis
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    // add the y Axis

    svg.append("g")
        .attr("transform", "translate("+(width - (margin.right))+", 0 )")
        .call(d3.axisRight(yHist));

    svg.append("g")
        .attr("transform", "translate("+margin.left+", 0 )")
        .attr("class", "y axis")
        .call(d3.axisLeft(yAccum))

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 10 - margin.left)
        .attr("x",0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text(yAccumLable);

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", width )
        .attr("x",0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text(yHistLable);

    svg.append("text")
        .attr("transform",
            "translate(" + (width/2) + " ," +
            (height + (margin.bottom -margin.top)) + ")")
        .style("text-anchor", "middle")
        .text(xlable);
    // Caalculate normal distibution curve

    var min= Number(d3.select("#min").node().innerHTML);
    var max = Number(d3.select("#max").node().innerHTML);
    var mean = Number(d3.select("#midelværdig").node().innerHTML);
    var std = Math.sqrt(Number(d3.select("#var").node().innerHTML));
    var step = (max-min)/100;
    console.log(d3.select("#min").node());

    console.log("Min "+ min +" max "+max+ " step "+step);

    var normalData = []; //erase current data
    //populate the data

    bins.forEach(function (e){
        e.normValue = ((jStat.normal.cdf( e.x1, mean, std) - jStat.normal.cdf( e.x0, mean, std))* kommuneData.length)
    });

    var acumLine = d3.line()
        .x((d) => x(d.x0))
        .y((d) => yHist(d.normValue))
        .curve(d3.curveStepAfter);


    var line = svg.append('path')
        .attr('d', acumLine(bins))
        .attr('class', 'NormaLine');


    console.log("Farver");
    //var blues = d3.scaleOrdinal(d3.schemeBlues[9]);
    console.log(blues)



}

function process(data){
console.log("Start;")
    var xmlData = data.documentElement.getElementsByTagName("No");
    var dataNodes = d3.select(data).selectAll("No")._groups[0];
    var nestData = d3.nest()
        .key(d => {return d.getAttribute("V1");})
        .entries(dataNodes);

    kommuneData = nestData.map(function(d){
        if(d.values[0].getAttribute("V2")==1)
        {return [d.key, d.values[0].textContent/ d.values[1].textContent];}
        else
        {return [d.key, d.values[1].textContent/ d.values[1].textContent];}
    });

    //Sorter kommunerne efter sex ratio
    kommuneData.sort(function(a, b) {
        return a[1] - b[1];
    });

    //Løb kommuneren i gennem og generer allumulered vørdig.
    muniCount = kommuneData.length;
    var last = 0;

    //Muni array 0 = mini code 1 = sex ration 2 =sccumulated
    for(var i=0; i < kommuneData.length; i++){
        kommuneData[i][2] = last + 1/muniCount;
        last = kommuneData[i][2];
        kommuneData[i][2] = kommuneData[i][2];
    }
    x.domain(d3.extent(kommuneData.map(d => d[1]))).nice();
    var format = d3.format(".3f")
    d3.select("#min").node().innerHTML = format(d3.min(kommuneData,d => d[1]))
    d3.select("#max").node().innerHTML = format(d3.max(kommuneData,d => d[1]))

    d3.select("#midelværdig").node().innerHTML = format(d3.mean(kommuneData,d => d[1]))
    d3.select("#var").node().innerHTML = format(d3.variance(kommuneData,d => d[1]))

    drawSvg(0)

  }

function handleClick(event){
     drawSvg(document.getElementById("myVal").value)

    //draw(document.getElementById("myVal").value)
    return false;
}
console.log("før folk");

console.log("Hej");
d3.xml("FOLK1A.xml",process);
