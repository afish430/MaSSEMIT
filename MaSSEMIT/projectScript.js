$(function () {

    //global variables
    var svg_bar = d3.select("#barGraphSVG");
    var xScale_bar;
    var yScale_bar;
    var yAxisScale_bar;
    var yAxis_bar;
    var dataset_bar;
    var dataset_bar;
    var w = 1100, h = 110, barPadding = 1;
    var padding = 50;
    var barChartArray = []; //array of objects holding current values for clicked town (category, value, percentile)
    var pieChartArray = []; //array holding relative proprtions of vehicle mileage classes (low, med, hi, etc)
    var leftStats = {}; //object to hold current left-variable statistics for the town last clicked
    var rightStats = {}; //object to hold current right-variable statistics for the town last clicked
    var selectedTown = ""; //keeps track of town last clicked on either map
    var format = d3.format("00,000.00"); //function to be used for formatting large numbers
    var svg_pie = d3.select("#pieGraphSVG");
    var outerRadius = 75;
    var innerRadius = 0;
    var dataset_pie;
    var arc = d3.svg.arc()
					.innerRadius(innerRadius)
					.outerRadius(outerRadius);
    var pie = d3.layout.pie().sort(null);

    //var color = d3.scale.category20c();
    var color = d3.scale.ordinal().range(["#feedde", "#fdbe85", "#fd8d3c", "#e6550d", "#a63603"]);

	//populate towns dropdown
	var townObjects = townsData.features;
	var townNames = [];
	for(var i = 0; i < townObjects.length; i++){
		townNames.push(townObjects[i].properties["TOWN"]);
		//$(".ddlTowns").append("<option value=" + townObjects[i].properties["TOWN"] + ">" + townObjects[i].properties["TOWN"] + "</option>");
	}
	townNames.sort(); //alphabetize array for dropdown
	for(var i = 0; i < townNames.length; i++){ //add names to dropdown
		$(".ddlTowns").append("<option value='" + townNames[i] + "'>" + townNames[i] + "</option>");
	}
	
	positionTownsDropdown();
	
    //DOM event handlers

    //Change map styles when dropdown list selection changes
    $('#ddlLeft').change(function () {
        leftLayer.setStyle(styleLeft);
        selectTownOnMap(selectedTown, "left");
        updateBarGraph(barChartArray);
        if (selectedTown != "") {//make sure a town has been selected
            updateLeftStats(); //need to first update leftStats object with new values for that town- get from barChartArray
            updateLeftStatsLabel(); //update left map stats label using leftStats object
        }
    }); //end $('#ddlLeft').change

    $('#ddlRight').change(function () {
        rightLayer.setStyle(styleRight);
        selectTownOnMap(selectedTown, "right");
        updateBarGraph(barChartArray);
        if (selectedTown != "") {//make sure a town has been selected
            updateRightStats(); //need to first update rightStats object with new values for that town- get from barChartArray
            updateRightStatsLabel(); //update right map stats label using leftStats object
        }
    }); //end $('#ddlRight).change

	//Update maps and charts when a town is selected from dropdown
	$('.ddlTowns').change(function () {
		var townName = $(this).val();
		leftLayer._layers[townName].fire('click');
	});
	
	
    //About Dialog
    $("#aboutDialog").dialog({
        autoOpen: false,
        width: 550,
        zindex: 999999,
        show: {
            effect: "fade",
            duration: 500
        },
        hide: {
            effect: "fade",
            duration: 500
        }
    }); //end dialog

	$(".ui-dialog").removeClass("ui-widget-content"); //fixes color issue with edges
	
    $("#aboutLink").click(function () {
        $("#aboutDialog").dialog("open");
    });

    //D3 initialization
    createBarGraph(); //create initial bar graphs at bottom
    createPieGraph();


    //*******************LEAFLET FUNCTIONS****************************************

    //create maps
    var leftMap = L.map('leftMap').setView([42.18, -71.75], 8);
    var rightMap = L.map('rightMap').setView([42.18, -71.75], 8);

    //create map styles
    function getLeftColor(d) { //purple scale
        return d > 85.71 ? '#4a1486' :
           d > 71.43 ? '#6a51a3' :
           d > 57.14 ? '#807dba' :
           d > 42.86 ? '#9e9ac8' :
           d > 28.57 ? '#bcbddc' :
           d > 14.29 ? '#dadaeb' :
                      '#f2f0f7';
    } //end getLeftColor

    function getRightColor(d) { //blue scale
        return d > 85.71 ? '#084594' :
           d > 71.43 ? '#2171b5' :
           d > 57.14 ? '#4292c6' :
           d > 42.86 ? '#6baed6' :
           d > 28.57 ? '#9ecae1' :
           d > 14.29 ? '#c6dbef' :
                      '#eff3ff';
    } //end getRightColor

    function styleLeft(feature) { //set styles of left map
        var attr = $('#ddlLeft').val();
        return {
            fillColor: getLeftColor(feature.properties[attr]),
            weight: 1,
            opacity: 1,
            color: 'gray',
            dashArray: '0',
            fillOpacity: 0.7
        };
    } //end styleLeft

    function styleRight(feature) {  //set styles of right map
        var attr = $('#ddlRight').val();
        return {
            fillColor: getRightColor(feature.properties[attr]),
            weight: 1,
            opacity: 1,
            color: 'gray',
            dashArray: '0',
            fillOpacity: 0.7
        };
    } //end styleRight

    //add layers to maps

    //add basemaps from mapBox
    var basemapLeft = L.tileLayer('http:\/\/a.tiles.mapbox.com\/v3\/examples.map-0l53fhk2\/{z}\/{x}\/{y}.png').addTo(leftMap); ;

    var basemapRight = L.tileLayer('http:\/\/a.tiles.mapbox.com\/v3\/examples.map-0l53fhk2\/{z}\/{x}\/{y}.png').addTo(rightMap);

    //add town geoJSON layers
    var leftLayer = L.geoJson(townsData, {
        style: styleLeft,
        onEachFeature: onEachFeatureLeft
    }).addTo(leftMap);

    var rightLayer = L.geoJson(townsData, {
        style: styleRight,
        onEachFeature: onEachFeatureRight
    }).addTo(rightMap);
	
    //synchronize maps
    leftMap.sync(rightMap);
    rightMap.sync(leftMap);

    //set map click functionality
    function onEachFeatureLeft(feature, layer) {  //set event handlers for left map
		//assign town name as unique id for this feature- will be used  to trigger click events
		layer._leaflet_id = feature.properties.TOWN;
		//console.log(feature);
		//console.log(layer);
        layer.on('click', function (e) {
            leftLayer.setStyle(styleLeft);
            rightLayer.setStyle(styleRight);
            var attr = $('#ddlLeft').val();
            selectedTown = feature.properties.TOWN
            $("#townName").text(selectedTown + ", MASSACHUSETTS");
			positionTownsDropdown();
			$(".ddlTowns").val(selectedTown);
            highlightFeature(e);
            selectTownOnMap(feature.properties.TOWN, "right");
            //pass array of values to update D3 graphs at bottom of page
            barChartArray = [
                { category: 'Avg. Adjusted Vehicle MPG', value: feature.properties['AvMPG'], percentile: feature.properties['pAvMPG'] },
                { category: 'Avg. Daily CO2 Equiv. per Vehicle', value: feature.properties['AvCO2Veh'], percentile: feature.properties['pAvCO2Veh'] },
                { category: 'Avg. Distance (mi) from Public Transport', value: feature.properties['DistPubTr'], percentile: feature.properties['pDistPubTr'] },
                { category: 'Avg. Fuel Consumed (gal/d) per Vehicle', value: feature.properties['AvGalpd'], percentile: feature.properties['pAvGalpd'] },
                { category: 'Avg. Miles per Day per Household', value: feature.properties['HHmiDayP'], percentile: feature.properties['pHHmiDayP'] },
                { category: 'Avg. Monthly Gas Cost /Household', value: feature.properties['AvGasHHpM'], percentile: feature.properties['pAvGasHHpM'] },
                { category: 'Avg. Vehicle Age (Yrs)', value: feature.properties['AvCarAge'], percentile: feature.properties['pAvCarAge'] },
                { category: 'Avg. Vehicle MSRP', value: feature.properties['AvMSRP'], percentile: feature.properties['pAvMSRP'] },
                { category: 'Avg. Vehicles per Household', value: feature.properties['VehHH'], percentile: feature.properties['pVehHH'] },
                { category: 'Count of Commercial Vehicles', value: feature.properties['ComVeh'], percentile: feature.properties['pComVeh'] },
                { category: 'Count of Households', value: feature.properties['HHCnt'], percentile: feature.properties['pHHCnt'] },
                { category: 'Count of Passenger Vehicles', value: feature.properties['PasVeh'], percentile: feature.properties['pPasVeh'] },
                { category: 'Count of Total Vehicles', value: feature.properties['TotVeh'], percentile: feature.properties['pTotVeh'] },
                { category: 'Count of ZipCar Members', value: feature.properties['ZipCarCnt'], percentile: feature.properties['pZipCarCnt'] },
                { category: 'Hybrid Vehicles per Household', value: feature.properties['HybHH'], percentile: feature.properties['pHybHH'] },
                { category: 'Median Household Income, 2010', value: feature.properties['HHInc'], percentile: feature.properties['pHHInc'] },
                { category: 'Total Daily CO2 Equiv.', value: feature.properties['CO2pd'], percentile: feature.properties['pCO2pd'] }
            ]//end barChartArray
            updateBarGraph(barChartArray);
            //update pie chart
            pieChartArray = [
                feature.properties['pLowMiCnt'],
                feature.properties['pMLMiCnt'],
                feature.properties['pMHMiCnt'],
                feature.properties['pHiMiCnt'],
                feature.properties['pVHiMiCnt']
            ];
            updatePieGraph(pieChartArray);
            //update text box on left map
            var currentLeftCat = $("#ddlLeft :selected").text();
            var currentLeftPctField = $("#ddlLeft :selected").val();
            var currentLeftValField = currentLeftPctField.substr(1); //take the 'p' off the percentile field name to get the value field name
            leftStats.town = selectedTown; //use global leftStats object so it can also be updated using dropdowns
            leftStats.category = currentLeftCat;
            leftStats.value = feature.properties[currentLeftValField];
            leftStats.percentile = feature.properties[currentLeftPctField];
            updateLeftStatsLabel();
            //update text box on right map
            var currentRightCat = $("#ddlRight :selected").text();
            var currentRightPctField = $("#ddlRight :selected").val();
            var currentRightValField = currentRightPctField.substr(1); //take the 'p' off the percentile field name to get the value field name
            rightStats.town = selectedTown; //use global leftStats object so it can also be updated using dropdowns
            rightStats.category = currentRightCat;
            rightStats.value = feature.properties[currentRightValField];
            rightStats.percentile = feature.properties[currentRightPctField];
            updateRightStatsLabel();
        }); //end layer.on
    } //end onEachFeatureLeft

    function onEachFeatureRight(feature, layer) { //set event handlers for right map
        layer.on('click', function (e) {
            leftLayer.setStyle(styleLeft);
            rightLayer.setStyle(styleRight);
            selectedTown = feature.properties.TOWN
            $("#townName").text(selectedTown + ", MASSACHUSETTS");
			positionTownsDropdown();
			$(".ddlTowns").val(selectedTown);
            highlightFeature(e);
            selectTownOnMap(feature.properties.TOWN, "left");
            //pass array of values to update D3 graphs at bottom of page
            barChartArray = [
                { category: 'Avg. Adjusted Vehicle MPG', value: feature.properties['AvMPG'], percentile: feature.properties['pAvMPG'] },
                { category: 'Avg. Daily CO2 Equiv. per Vehicle', value: feature.properties['AvCO2Veh'], percentile: feature.properties['pAvCO2Veh'] },
                { category: 'Avg. Distance (mi) from Public Transport', value: feature.properties['DistPubTr'], percentile: feature.properties['pDistPubTr'] },
                { category: 'Avg. Fuel Consumed (gal/d) per Vehicle', value: feature.properties['AvGalpd'], percentile: feature.properties['pAvGalpd'] },
                { category: 'Avg. Miles per Day per Household', value: feature.properties['HHmiDayP'], percentile: feature.properties['pHHmiDayP'] },
                { category: 'Avg. Monthly Gas Cost /Household', value: feature.properties['AvGasHHpM'], percentile: feature.properties['pAvGasHHpM'] },
                { category: 'Avg. Vehicle Age (Yrs)', value: feature.properties['AvCarAge'], percentile: feature.properties['pAvCarAge'] },
                { category: 'Avg. Vehicle MSRP', value: feature.properties['AvMSRP'], percentile: feature.properties['pAvMSRP'] },
                { category: 'Avg. Vehicles per Household', value: feature.properties['VehHH'], percentile: feature.properties['pVehHH'] },
                { category: 'Count of Commercial Vehicles', value: feature.properties['ComVeh'], percentile: feature.properties['pComVeh'] },
                { category: 'Count of Households', value: feature.properties['HHCnt'], percentile: feature.properties['pHHCnt'] },
                { category: 'Count of Passenger Vehicles', value: feature.properties['PasVeh'], percentile: feature.properties['pPasVeh'] },
                { category: 'Count of Total Vehicles', value: feature.properties['TotVeh'], percentile: feature.properties['pTotVeh'] },
                { category: 'Count of ZipCar Members', value: feature.properties['ZipCarCnt'], percentile: feature.properties['pZipCarCnt'] },
                { category: 'Hybrid Vehicles per Household', value: feature.properties['HybHH'], percentile: feature.properties['pHybHH'] },
                { category: 'Median Household Income, 2010', value: feature.properties['HHInc'], percentile: feature.properties['pHHInc'] },
                { category: 'Total Daily CO2 Equiv.', value: feature.properties['CO2pd'], percentile: feature.properties['pCO2pd'] }
            ]//end barChartArray
            updateBarGraph(barChartArray);
            //update pie chart
            pieChartArray = [
                feature.properties['pLowMiCnt'],
                feature.properties['pMLMiCnt'],
                feature.properties['pMHMiCnt'],
                feature.properties['pHiMiCnt'],
                feature.properties['pVHiMiCnt']
            ];
            updatePieGraph(pieChartArray);
            //update text box on left map
            var currentLeftCat = $("#ddlLeft :selected").text();
            var currentLeftPctField = $("#ddlLeft :selected").val();
            var currentLeftValField = currentLeftPctField.substr(1); //take the 'p' off the percentile field name to get the value field name
            leftStats.town = selectedTown; //use global leftStats object so it can also be updated using dropdowns
            leftStats.category = currentLeftCat;
            leftStats.value = feature.properties[currentLeftValField];
            leftStats.percentile = feature.properties[currentLeftPctField];
            updateLeftStatsLabel();
            //update text box on right map
            var currentRightCat = $("#ddlRight :selected").text();
            var currentRightPctField = $("#ddlRight :selected").val();
            var currentRightValField = currentRightPctField.substr(1); //take the 'p' off the percentile field name to get the value field name
            rightStats.town = selectedTown; //use global leftStats object so it can also be updated using dropdowns
            rightStats.category = currentRightCat;
            rightStats.value = feature.properties[currentRightValField];
            rightStats.percentile = feature.properties[currentRightPctField];
            updateRightStatsLabel();
        }); //end layer.on
    } //end onEachFeatureRight

    function selectTownOnMap(townName, side) { //synchronizes town selections between maps
        var mapLayer = (side == "left" ? leftLayer : rightLayer);
        mapLayer.eachLayer(function (layer) {
            var name = layer.feature.properties.TOWN;
            if (name === townName) {
                layer.setStyle({
                    weight: 4,
                    color: 'yellow',
                    dashArray: '',
                    fillOpacity: 0.7
                });
                if (!L.Browser.ie && !L.Browser.opera) {
                    layer.bringToFront();
                }
            } //end if
        }); //end eachLayer
    } //end selectTownOnMap

    function highlightFeature(e) { //function to highlight towns yellow
        var layer = e.target;
        layer.setStyle({
            weight: 4,
            color: 'yellow',
            dashArray: '',
            fillOpacity: 0.7
        });
        if (!L.Browser.ie && !L.Browser.opera) {
            layer.bringToFront();
        }
    } //end highlightFeature

    //Update map labels showing selected statistic for last town clicked
    function updateLeftStatsLabel() {
        var percentile = d3.round(leftStats.percentile, 0).toString();
        //make sure correct suffix is applied
        var suffix = "th";
        if (percentile.slice(-1) == "1" && percentile.slice(-2) != "11") { suffix = "st"; }
        else if (percentile.slice(-1) == "2" && percentile.slice(-2) != "12") { suffix = "nd"; }
        else if (percentile.slice(-1) == "3" && percentile.slice(-2) != "13") { suffix = "rd"; }
        //apply appropriate number formatting
        var leftText;
        if (leftStats.category.substring(0, 5) == "Count" || leftStats.category.substring(0, 5) == "Total") { //should be integer
            leftText = leftStats.town + "'s " + leftStats.category + ": <b>" + format(d3.round(leftStats.value, 0)) + " (" + percentile + suffix + " percentile)</b>";
        }
        else if (leftStats.category.substring(0, 6) == "Hybrid") //should be long decimal
        {
            leftText = leftStats.town + "'s " + leftStats.category + ": <b>" + format(d3.round(leftStats.value, 4)) + " (" + percentile + suffix + " percentile)</b>";
        }
        else if (leftStats.category.substring(0, 16) == "Avg. Monthly Gas" || leftStats.category == "Avg. Vehicle MSRP" || leftStats.category.substring(0, 6) == "Median") //should be money
        {
            leftText = leftStats.town + "'s " + leftStats.category + ": <b>$" + format(d3.round(leftStats.value, 0)) + " (" + percentile + suffix + " percentile)</b>";
        }
        else { //default to 2 decimal places
            leftText = leftStats.town + "'s " + leftStats.category + ": <b>" + format(d3.round(leftStats.value, 2)) + " (" + percentile + suffix + " percentile)</b>";
        }
        //set label
        $("#leftLabel").html(leftText);
        $("#leftLabel").fadeIn();
    } //end updateLeftStatsLabel

    function updateRightStatsLabel() {
        var percentile = d3.round(rightStats.percentile, 0).toString();
        //make sure correct suffix is applied
        var suffix = "th";
        if (percentile.slice(-1) == "1" && percentile.slice(-2) != "11") { suffix = "st"; }
        else if (percentile.slice(-1) == "2" && percentile.slice(-2) != "12") { suffix = "nd"; }
        else if (percentile.slice(-1) == "3" && percentile.slice(-2) != "13") { suffix = "rd"; }
        //apply appropriate number formatting
        var rightText;
        if (rightStats.category.substring(0, 5) == "Count" || rightStats.category.substring(0, 5) == "Total") { //should be integer
            rightText = rightStats.town + "'s " + rightStats.category + ": <b>" + format(d3.round(rightStats.value, 0)) + " (" + percentile + suffix + " percentile)</b>";
        }
        else if (rightStats.category.substring(0, 6) == "Hybrid") //should be long decimal
        {
            rightText = rightStats.town + "'s " + rightStats.category + ": <b>" + format(d3.round(rightStats.value, 4)) + " (" + percentile + suffix + " percentile)</b>";
        }
        else if (rightStats.category.substring(0, 16) == "Avg. Monthly Gas" || rightStats.category == "Avg. Vehicle MSRP" || rightStats.category.substring(0, 6) == "Median") //should be money
        {
            rightText = rightStats.town + "'s " + rightStats.category + ": <b>$" + format(d3.round(rightStats.value, 0)) + " (" + percentile + suffix + " percentile)</b>";
        }
        else { //default to 2 decimal places
            rightText = rightStats.town + "'s " + rightStats.category + ": <b>" + format(d3.round(rightStats.value, 2)) + " (" + percentile + suffix + " percentile)</b>";
        }
        //set label
        $("#rightLabel").html(rightText);
        $("#rightLabel").fadeIn();
    } //end updateRightStatsLabel

    //update statistics objects when dropdown list is changed
    function updateLeftStats() {
        $.each(barChartArray, function (i, v) { //loop through objects in barChartArray- if category matches dropdown selection, get value and pct from that object
            if (this.category == $("#ddlLeft :selected").text()) {
                leftStats = barChartArray[i];
                leftStats.town = selectedTown; //add town field since this is not in barChartArray
            }
        }); //end each
    } //end updateLeftStats

    function updateRightStats() {
        $.each(barChartArray, function (i, v) {  //loop through objects in barChartArray- if category matches dropdown selection, get value and pct from that object
            if (this.category == $("#ddlRight :selected").text()) {
                rightStats = barChartArray[i];
                rightStats.town = selectedTown; //add town field since this is not in barChartArray
            }
        }); //end each
    } //end updateLeftStats

	//initializes town dropdown position
	function positionTownsDropdown(){
		var screenWidth = $('body').innerWidth();
		var titleWidth = $('#townName').width();
		if((screenWidth/2) > (titleWidth + 60)){
			var spacerWidth = (screenWidth/2) - titleWidth - 60; //subtract margins
			$("#spacer").css("width", spacerWidth);
		}
		else{
			$("#spacer").css("width", 0);
		}
	}
    //*******************************D3 FUNCTIONS*********************************

    //create initial empty graphs
    function createBarGraph() {
        dataset_bar = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        //scales
        xScale_bar = d3.scale.ordinal()
        //.domain(['AvMPG', 'AvCO2Veh', 'DistPubTr', 'AvGalpd', 'HHmiDayP', 'AvGasHHpM', 'AvCarAge', 'AvMSRP', 'VehHH', 'ComVeh', 'HHCnt', 'PasVeh', 'TotVeh', 'ZipCarCnt', 'HybHH', 'HHInc', 'CO2pd'])
							.domain(['Vehicle MPG', 'Daily CO2 /Vehicle', 'Public Transport Distance', 'Vehicle Fuel Use', 'Household Mi/Day', 'Monthly Gas Cost', 'Vehicle Age', 'Vehicle MSRP', 'Vehicles /Household', 'Commercial Vehicles', 'Households', 'Passenger Vehicles', 'Total Vehicles', 'ZipCar Members', 'Hybrids /Household', 'Household Income', 'Total Daily CO2'])
                            .rangeRoundBands([padding, w], 0.05);

        yScale_bar = d3.scale.linear()
							.domain([-5, 110])
							.range([0, h]);

        //axes
        yAxisScale_bar = d3.scale.linear() //using yScale_bar makes axis upside-down, so a new scale was created just for the axis
							.domain([-5, 110])
							.range([h, 0]);

        yAxis_bar = d3.svg.axis()
							  .scale(yAxisScale_bar)
							  .orient("left")
							  .ticks(5);

        //Define X axis
        var xAxis = d3.svg.axis()
							  .scale(xScale_bar)
							  .orient("bottom")
							  .ticks(4);

        //Create bars
        svg_bar.selectAll("rect")
			   .data(dataset_bar)
			   .enter()
			   .append("rect")
			   .attr("x", function (d, i) {
			       //var categories = ['AvMPG', 'AvCO2Veh', 'DistPubTr', 'AvGalpd', 'HHmiDayP', 'AvGasHHpM', 'AvCarAge', 'AvMSRP', 'VehHH', 'ComVeh', 'HHCnt', 'PasVeh', 'TotVeh', 'ZipCarCnt', 'HybHH', 'HHInc', 'CO2pd'];
			       var categories = ['Vehicle MPG', 'Daily CO2 /Vehicle', 'Public Transport Distance', 'Vehicle Fuel Use', 'Household Mi/Day', 'Monthly Gas Cost', 'Vehicle Age', 'Vehicle MSRP', 'Vehicles /Household', 'Commercial Vehicles', 'Households', 'Passenger Vehicles', 'Total Vehicles', 'ZipCar Members', 'Hybrids /Household', 'Household Income', 'Total Daily CO2'];
			       return xScale_bar(categories[i]);
			   })
			   .attr("y", function (d) {
			       return h - yScale_bar(d);
			   })
			   .attr("width", xScale_bar.rangeBand())
			   .attr("height", function (d) {
			       return yScale_bar(d);
			   })
			   .attr("fill", function (d) {
			       //alter this: check if category if d matches variable shown in L or R maps and set that color to purple or blue
			       return "rgb(100, 100, 100)";
			   })
               .append("title");

        //Create Axes
        svg_bar.append("g")
                .attr("class", "y axis")    // <-- Note y added here
                .attr("transform", "translate(" + padding + ",0)")
                .call(yAxis_bar);

        svg_bar.append("g")
                  .attr("class", "x axis")
                  .attr("transform", "translate(0," + h + ")")
                  .call(xAxis)
                  .selectAll(".tick text")
                  .call(wrap, xScale_bar.rangeBand());


        //Add Axis labels
        //svg_bar.append("text") //X Axis Label
        //    .attr("class", "axisLabel")
         //   .attr("text-anchor", "end")
         //   .attr("x", w / 2 + 60)
         //   .attr("y", h + 45)
         //   .text("Category");

        svg_bar.append("text") //Y Axis Label
            .attr("class", "axisLabel")
            .attr("text-anchor", "end")
            .attr("y", 4)
            .attr("x", -10)
            .attr("dy", ".75em")
            .attr("transform", "rotate(-90)")
            .text("Percentile");

    } //end createBarGraph() 

    function updateBarGraph(passedDataset) { //updates the bar graph when a town is clicked
        dataset_bar = passedDataset

        //Update all rects
        svg_bar.selectAll("rect")
					   .data(dataset_bar)
					   .transition()
					   .duration(500)
                       .ease("linear")
			           .attr("y", function (d) {
			               return h - yScale_bar(d.percentile);
			           })
			           .attr("height", function (d) {
			               return yScale_bar(d.percentile);
			           })
			           .attr("fill", function (d) {
			               if (d.category == $('#ddlLeft :selected').text() && d.category == $('#ddlRight :selected').text()) {//if both are set to the same
			                   return "rgb(100, 0, 100)"; //bright pink/purple indicating boht are the same
			               }
			               else if (d.category == $('#ddlLeft :selected').text()) {
			                   return "#54278f"; //purple
			               }
			               else if (d.category == $('#ddlRight :selected').text()) {
			                   return "#08519c"; //blue
			               }
			               else {
			                   return "rgb(100, 100, 100)"; //gray
			               }
			           });
        //end selectAll chain

        //update tooltips on bars when hovered over
        svg_bar.selectAll("rect")
                       .on("mouseover", function (d) { //show tooltip
                           //Get this bar's x/y values, then augment for the tooltip
                           var coordinates = d3.mouse(this); //get mouse coordinates
                           var x = coordinates[0];
                           var y = coordinates[1];
                           //Update the tooltip position and value
                           d3.select("#tooltip")
                           .style("left", x - 15 + "px")//set ttoltip location
                           //.style("top", y+550 + "px")
                           .style("top", "75%")
                           .select("#category").text(d.category); //set tooltip text
                           //format number value based on category
                           if (d.category.substring(0, 5) == "Count" || d.category.substring(0, 5) == "Total") { //should be integer
                               d3.select("#tooltip").select("#value").text(format(d3.round(d.value, 0)));
                           }
                           else if (d.category.substring(0, 6) == "Hybrid") { //should be long decimal
                               d3.select("#tooltip").select("#value").text(format(d3.round(d.value, 4)));
                           }
                           else if (d.category.substring(0, 16) == "Avg. Monthly Gas" || d.category == "Avg. Vehicle MSRP" || d.category.substring(0, 6) == "Median") { //should be money
                               d3.select("#tooltip").select("#value").text("$" + format(d3.round(d.value, 0)));
                           }
                           else { //default to 2 decimal places
                               d3.select("#tooltip").select("#value").text(format(d3.round(d.value, 2)));
                           }

                           //set percentile
                           d3.select("#tooltip").select("#percentile").text(d.percentile);

                           //Show the tooltip
                           d3.select("#tooltip").classed("hidden", false);
                       })//end .on("mouseover")

			           .on("mouseout", function () { //hide tooltip
			               //Hide the tooltip
			               d3.select("#tooltip").classed("hidden", true);
			           }); //end .on("mouseout")

    } //end updateBarGraph

    //function to allow multi-line text for x axis labels
    function wrap(text, width) {
        text.each(function () {
            var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                }
            }
        });
    } //end wrap

    function createPieGraph() {
        dataset_pie = [20, 20, 20, 20, 20];
        //Set up groups
        var arcs = svg_pie.selectAll("g.arc")
						  .data(pie(dataset_pie))
						  .enter()
						  .append("g")
						  .attr("class", "arc")
						  .attr("transform", "translate(" + outerRadius + "," + outerRadius + ")");
        //Draw arc paths
        arcs.append("path")
			    .attr("fill", function (d, i) {
			        return color(i);
			    })
			    .attr("d", arc)
                .append("title"); ;
        //Labels
        arcs.append("text")
			    .attr("transform", function (d) {
			        return "translate(" + arc.centroid(d) + ")";
			    })
                .attr("class", "pieLabel")
        			    .attr("text-anchor", "middle")
        			    .text(function (d, i) {
        			        var vehTypes = ["Low", "Med-Low", "Med-High", "High", "Very High"];
        			        return vehTypes[i];
        			    });
    } //end createPieGraph

    function updatePieGraph(passedDataset) {
        dataset_pie = passedDataset
        //Update arc paths
        svg_pie.selectAll("path")
                .data(pie(dataset_pie))
                .transition()
                .duration(1000)
			    .attr("fill", function (d, i) {
			        return color(i);
			    })
			    .attr("d", arc);
        //Update tooltips
        svg_pie.selectAll("path")
                       .select("title")
			           .text(function (d) {
			               return Math.round(100 * d.value, 2) + "%";
			           });
        //Update labels
        svg_pie.selectAll("text")
                .data(pie(dataset_pie))
                .transition()
                .duration(1000)
			    .attr("transform", function (d) {
			        return "translate(" + arc.centroid(d) + ")";
			    })
			    .attr("text-anchor", "middle")
        			    .text(function (d, i) {
        			        var vehTypes = ["Low", "Med-Low", "Med-High", "High", "Very High"];
        			        return vehTypes[i];
        			    });
    } //end updatePieGraph

});               //end $function