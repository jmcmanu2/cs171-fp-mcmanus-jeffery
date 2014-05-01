// Map area
var map = {
	width: 900,
	height: 570
}

// Map projection	
var projection = d3.geo.mercator()
	.center([77.2, 27.0])
	.scale(15000)
	.translate([map.width*0.5, map.height*0.5]);
	
var path = d3.geo.path().projection(projection);

var mapSVG = d3.select("div#map")
	.append("svg")
	.attr({
		width: map.width,
		height: map.height
    })

	
var mapBorder = mapSVG.append("rect")
	.attr("x", 0)
	.attr("y", 0)
	.attr("height", map.height)
	.attr("width", map.width)
	.style("stroke", "black")
	.style("fill", "none")
	.style("stroke-width", 1);
	
// Map tooltips
var tooltip = d3.select("body")
	.append("div")   
	.attr("class", "tooltip")               
	.style("opacity", 0);

// Color for choropleths
var color_range = colorbrewer.Reds[9];
//var color_range = ["#600000","#900000","#C00000","#F00000"];
var color = d3.scale.linear()
	.range(color_range);
	
// Data binding	
var centered; 
var zoom_level = 0;
d3.csv("../data/Performance index.csv",function(error, perf_data){

	// Convert string values to numeric
	perf_data.forEach(function(obj){
		Object.keys(obj).forEach(function(d){
			if (d != "district" && d != "tahsil"  && d != "gp_name"){
				obj[d] = parseFloat(obj[d]);
			}
		})
	})
	
	console.log(perf_data);

	// Bind data to maps
	mainMap(perf_data);

})	

// Description area	
d3.select("div#description").append("text")
	.style("font-weight","bold")
	.html("Description")
	;

d3.select("div#description").append("text")
	.attr("class","description")
	//.attr("transform", "translate(10,20)")
	.html("<br/>This tool shows the quality of local management of the Mahatma Gandhi National Rural Employment Guarantee Scheme (MGNREGS) in three districts in Rajasthan, India. Darker-shaded villages indicate higher-quality management, and lighter-shaded villages indicate lower-quality management. <br/><br/> Quality of management data comes from surveys of program beneficiaries collected by the Abdul Latif Jameel Poverty Action Lab at MIT (J-PAL). In a representative sample of 250 out of 750 villages in the three study districts, beneficiaries were asked to assess how the program was managed in their village and to report problems with accessing services. Tooltips indicate whether or not a village was surveyed. I aggregated these responses and created a composite score for each surveyed village, which reflects the quality of local management of the program in that village from the beneficiary's point of view. <br/><br/> For the remaining 500 villages, I predicted quality of management based on administrative data collected by the Ministry of Rural Development and a linear prediction model. The village dashboard includes information on individual components of the composite score, if the village was surveyed, or uncertainty bounds around the prediction, if the village was not surveyed.")
	
var mapVis = mapSVG
	.append("g")
		
// District-level map
function mainMap(perf_data){
d3.json("../data/districts2.json", function(error,json){
		
	// Map title
	mapSVG.selectAll(".map_title").remove();
	mapSVG.append("text")
		.attr("class", "map_title")
		.attr("transform", "translate(10,20)")
		.style("font-weight","bold")
		.text("Study area")
		;

	mapSVG.append("text")
		.attr("class", "map_title")
		.attr("transform", "translate(10,40)")
		.text("Left-click on a district to zoom down to block view")
		;
		
	// Create district paths
	mapVis.selectAll(".area")
		.data(json.features)
		.enter()
		.append("path")
		.attr("d", path)
		.attr("class", "area")
		.on("click", function(d){
			Zoom(d);
			blockMap(d, perf_data);
			
			mapVis	
				.on("contextmenu", function(){
					unZoom(d, perf_data);
					d3.event.preventDefault();
				})		
				;			
		})
		;
	
	// Add map labels
	mapVis.selectAll(".place-label").remove();
	mapVis.selectAll(".place-label")
		.data(json.features)
		.enter()
		.append("text")
		.attr("class", "place-label")
		.attr("transform", function(d){ 
			var x_coord = d3.mean(d['geometry']['coordinates'][0], function(d){
				return d[0];
			})
			
			//var x_coord = 0.5*(d['bbox'][0]+d['bbox'][2]);
			var y_coord = d3.mean(d['geometry']['coordinates'][0], function(d){
				return d[1];
			})			
			//var y_coord = 0.5*(d['bbox'][1]+d['bbox'][3]);
			return "translate(" + projection([x_coord,y_coord]) + ")"; })
		//.attr("dy", ".35em")
		.text(function(d) { return d['properties']['district']; })
		;

})
}

// Block-level map
function blockMap(DISTRICT, perf_data){
	d3.json("../data/blocks2.json", function(error,json_blocks){

		// Change map title
		mapSVG.selectAll(".map_title").remove();
		mapSVG.append("text")
			.attr("class", "map_title")
			.attr("transform", "translate(10,20)")
			.style("font-weight","bold")
			.text("District: " + DISTRICT['properties']['district'])
			;

		mapSVG.append("text")
			.attr("class", "map_title")
			.attr("transform", "translate(10,40)")
			.text("Left-click on a block to zoom down to village view")
			;

		mapSVG.append("text")
			.attr("class", "map_title")
			.attr("transform", "translate(10,60)")
			.text("Right-click on the map to zoom up to district view")
			;
		
		// Filter blocks in selected district
		var selected_blocks = [];
		json_blocks.features.forEach(function(block){
			if (block['properties']['district'] == DISTRICT['properties']['district']){
				selected_blocks.push(block);
			}
		})
	
		// Get average performance value for villages in block
		var block_perf = {};
		selected_blocks.forEach(function(block){
			block_perf[block['properties']['tahsil']] = [];
		})
		
		Object.keys(block_perf).forEach(function(block){
			perf_data.forEach(function(gp){
				if (gp['tahsil'] == block){
					block_perf[block].push(gp['Hperf_overall']);
				}
			})
		})

		// Set input domain for color scale 
		color.domain([
		//	d3.min(Object.keys(block_perf), function(block) { return d3.mean(block_perf[block]); }), 
		//	d3.max(Object.keys(block_perf), function(block) { return d3.mean(block_perf[block]); }), 
		-0.05,0.05
		]);
		
		// Create block paths
		mapVis.selectAll(".area")
			.data(selected_blocks)
			.enter()
			.append("path")
			.attr("d", path)
			.attr("class", "area")
			.style("fill", function(d) {
				var this_block = d['properties']['tahsil'];
				var value = d3.mean(block_perf[this_block]);
				if (value) {
					return color(value);
				} 
				else {
					return "#ccc";
				}
			})	
			.on("click", function(d){
				Zoom(d);
				gpMap(d, perf_data);
			})			
			.on("mouseover", function(d){
				d3.select(this)
				.style("fill","yellow");

				var block_name = d["properties"]["tahsil"];
				
				var this_block = d['properties']['tahsil'];
				var perf_score = d3.round(d3.mean(block_perf[this_block]), 3);

				tooltip
					.html("Performance Score: " + perf_score) 
					.style("opacity", 1)
					.style("left", (d3.event.pageX + 20) + "px")     
					.style("top", (d3.event.pageY) + "px")   
					.style("height", "15px")
					;
			})
			.on("mouseout", function(){
				d3.select(this)		
				.style("fill", function(d) {
					var this_block = d['properties']['tahsil'];
					var value = d3.mean(block_perf[this_block]);
					if (value) {
						return color(value);
					} 
					else {
						return "#ccc";
					}
				})
				
				tooltip.style("opacity", 0); 
			})	
			
		// Add map labels
		mapVis.selectAll(".place-label").remove();
		mapVis.selectAll(".place-label")
			.data(selected_blocks)
			.enter()
			.append("text")
			.attr("class", "place-label")
			.attr("transform", function(d){ 
				var x_coord = d3.mean(d['geometry']['coordinates'][0], function(d){
					return d[0];
				})
				
				var y_coord = d3.mean(d['geometry']['coordinates'][0], function(d){
					return d[1];
				})			
				return "translate(" + projection([x_coord,y_coord]) + ")"; })
			.attr("dx", "-2.5em")
			.style("font-size", "6pt")
			.text(function(d) { return d['properties']['tahsil']; })
			;

		/*		
		// Add legend
		var legend = mapSVG.append("svg")
			.attr("class", "legend")
			.attr("width", 100)
			.attr("height", 100)
			.selectAll("g")
			.data(color.domain().slice().reverse())
			.enter().append("g")
			.attr("transform", function(d, i) { return "translate(10," + i * 20 + ")"; });

		legend.append("rect")
			.attr("width", 18)
			.attr("height", 18)
			.style("fill", color);

		legend.append("text")
			.attr("x", 24)
			.attr("y", 9)
			.attr("dy", ".35em")
			.text(function(d) { return d; });
		*/
		
	})
}

// Village-level map
function gpMap(BLOCK, perf_data){

	d3.json("../data/gps2.json", function(error,json_gps){
		
		// Change map title
		mapSVG.selectAll(".map_title").remove();
		mapSVG.append("text")
			.attr("class", "map_title")
			.attr("transform", "translate(10,20)")
			.style("font-weight","bold")
			.text("Block (District): " + BLOCK['properties']['tahsil'] + " (" + BLOCK['properties']['district'] + ")")
			;

		mapSVG.append("text")
			.attr("class", "map_title")
			.attr("transform", "translate(10,40)")
			.text("Left-click on a village to view its dashboard")
			;

		mapSVG.append("text")
			.attr("class", "map_title")
			.attr("transform", "translate(10,60)")
			.text("Right-click on the map to zoom up to block view")
			;

		mapSVG.append("text")
			.attr("class", "map_title")
			.attr("transform", "translate(10,80)")
			.text("Scroll over a village to see name")
			;			
			
		// Filter villages in selected block
		var selected_gps = [];
		json_gps.features.forEach(function(gp){
			if (gp['properties']['tahsil'] == BLOCK['properties']['tahsil']){
				selected_gps.push(gp);
			}
		})
				
		// Bind village data to paths
		selected_gps.forEach(function(gp1){
			perf_data.forEach(function(gp2){
				if (gp1['properties']['district'] == gp2['district'] &&
					gp1['properties']['tahsil'] == gp2['tahsil'] &&
					gp1['properties']['gp_name'] == gp2['gp_name']){
					
					Object.keys(gp2).forEach(function(d){
						gp1[d] = gp2[d];
					})
				}
			})
		})
		
		// Set input domain for color scale 
		color.domain([
		//	d3.min(selected_gps, function(gp) { return gp['Hperf_hat']; }), 
		//	d3.max(selected_gps, function(gp) { return gp['Hperf_hat']; }), 
			-0.05,0.05
		]);
		
		// Create gp paths
		mapVis.selectAll(".area")
			.data(selected_gps)
			.enter()
			.append("path")
			.attr("d", path)
			.attr("class", "area")
			.style("fill", function(d) {
				var value1 = d['Hperf_overall'];
				var value2 = d['Hperf_hat'];
				if (value1) {
					return color(value1);
				} 
				else if (value2) {
					return color(value2);
				}	
				else {
					return "#ccc";
				}
			})
			.on("mouseover", function(d){
				d3.select(this)
				.style("fill","yellow");

				var gp_name = d["properties"]["gp_name"];
				
				var surveyedornot;
				if (d["sample"] == 1){
					surveyedornot = "Surveyed";
				}
				else{
					surveyedornot = "Not surveyed";
				}
				
				var perf_score;
				if (d["sample"] == 1){
					perf_score = d["Hperf_overall"];
				}
				else{
					perf_score = d["Hperf_hat"];
				}

				tooltip
					.html("Village: " + gp_name + "<br/>" + surveyedornot + "<br/>Performance Score: " + perf_score) 
					.style("opacity", 1)
					.style("left", (d3.event.pageX + 20) + "px")     
					.style("top", (d3.event.pageY) + "px")   
					.style("height", "35px")
					;
			})
			.on("mouseout", function(){
				d3.select(this)		
				.style("fill", function(d) {
					var value1 = d['Hperf_overall'];
					var value2 = d['Hperf_hat'];
					if (value1) {
						return color(value1);
					} 
					else if (value2) {
						return color(value2);
					}	
					else {
						return "#ccc";
					}
				})
				
				tooltip.style("opacity", 0); 
			})	
			.on("click", function(d){
				dashboard(d,perf_data);
				zoom_level = 3;
				
				mapSVG	
				.on("contextmenu", function(){
					if (zoom_level == 3){
						backToGP(BLOCK, perf_data);
						d3.event.preventDefault();
					}	
				})	
			})	
			/*
			.style("stroke-width",function(d){
				if (d["sample"] == 1){
					return "1px";
				}
				else {
					return "0.2px";
				}
			})
			.style("stroke", function(d){
				if (d["sample"] == 1){
					return "black";
				}
			})
			*/
			
		// Remove map labels
		mapVis.selectAll(".place-label").remove();		
	})
}

function dashboard(GP, perf_data){
	mapVis.selectAll(".area").remove()
	mapVis.selectAll(".place-label").remove()

	// Change title
	mapSVG.selectAll(".map_title").remove();
	mapSVG.append("text")
		.attr("class", "map_title")
		.attr("transform", "translate(10,20)")
		.style("font-weight","bold")
		.text("VILLAGE (Block, District): " + GP['gp_name'] + " (" + GP['properties']['tahsil'] + ", " + GP['properties']['district'] + ")")
		;

	mapSVG.append("text")
		.attr("class", "map_title")
		.attr("transform", "translate(10,40)")
		.text("Right-click to return to block view")
		;			

	mapSVG.append("text")
		.attr("class", "map_title")
		.attr("transform", "translate(10,60)")
		.style("fill", "red")
		.text(function(){
			if (GP["sample"] == 1){
				return "This is a surveyed village. Performance data comes from a survey of voters in this village."
			}
			else {
				return "This is not a surveyed village. The performance score is a prediction."			
			}
		})
		;		
	
	// Histogram: Where the performance score is relative to all villages
	
		// Get performance data values
		var hist_values = [];
		perf_data.forEach(function(gp){
			var value;
			if (gp["sample"] == 1){
				value = gp['Hperf_overall'];
			}
			else {
				value =  gp['Hperf_hat'];		
			}
			hist_values.push(value);
		})			
		
		// Get this village's performance score
		if (GP["sample"] == 1){
			var perf_score = GP["Hperf_overall"];
		}
		else {
			var perf_score = GP["Hperf_hat"];
		}
		
		// Dimensions
		var hist_margin = {top: 40, right: 30, bottom: 30, left: 30};
		var hist_width = 300 - hist_margin.left - hist_margin.right;
		var hist_height = 300 - hist_margin.top - hist_margin.bottom;

		// X Scale
		var min_score = d3.min(perf_data, function(gp) { 
			if (gp["sample"] == 1){
				return gp['Hperf_overall'];
			}
			else {
				return gp['Hperf_hat'];		
			}
		})	
		var max_score = d3.max(perf_data, function(gp) { 
			if (gp["sample"] == 1){
				return gp['Hperf_overall'];
			}
			else {
				return gp['Hperf_hat'];		
			}
		})	

		var xScale = d3.scale.linear()
			.domain([min_score, max_score])
			.range([0,hist_width])
			;
		
		// Histogram layout
		var hist_data = d3.layout.histogram()
			.bins(xScale.ticks(20))
			(hist_values)
			;

		// Y Scale
		var yScale = d3.scale.linear()
			.domain([0, d3.max(hist_data, function(d){ return d.y;})])
			.range([hist_height, 0])
			;
			
		// X Axis
		var xAxis = d3.svg.axis()
			.scale(xScale)
			.orient("bottom")
			.ticks(5)
			;
	
		// Histogram area
		var histogram = mapSVG.append("g")
			.attr("width", hist_width + hist_margin.left + hist_margin.right)
			.attr("height", hist_height + hist_margin.top + hist_margin.bottom)
			.attr("class", "histogram")
			.attr("transform", "translate(" + hist_margin.left + ",140)")
			;
		
		// Histogram title
		mapSVG
			.append("text")
			.attr("class","hist_title")
			.text("Distribution of performance scores with village reference line")
			.attr("transform", "translate(10,100)")
		mapSVG
			.append("text")
			.attr("class","hist_title")
			.html("Performance score of " + GP['gp_name'] + ": " + perf_score)
			.attr("transform", "translate(10,120)")

		// Histogram bars
		var bar = histogram.selectAll(".bar")
			.data(hist_data)
			.enter()
			.append("g")
			.attr("class", "bar")
			.attr("transform", function(d) { return "translate(" + xScale(d.x) + "," + yScale(d.y) + ")"; });

		bar.append("rect")
			.attr("x", 1)
			.attr("width", 15)
			.attr("height", function(d) { return hist_height - yScale(d.y); })
			//.attr("transform", "translate(0," + hist_margin.top + ")")
			;
			
		// Add X axis
		histogram.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + hist_height + ")")
			.call(xAxis)
			;

		// Village reference line
		histogram.append('line')
			//.attr("class","ref_line")
			.attr("x1", xScale(perf_score))		
			.attr("x2", xScale(perf_score))		
			.attr("y1", hist_height)	
			.attr("y2", 0)	
			.style("stroke","red")
			;
		
		
}

// Zoom
function Zoom(AREA){

	if (zoom_level == 0){
		var x, y, k;

		var centroid = path.centroid(AREA);
		x = centroid[0];
		y = centroid[1];
		k = 1.4;
		centered = AREA;
	 
		mapVis.selectAll("path")
			.classed("active", centered && function(d) { return d === centered; })
			.remove()

		mapVis.transition()
			.duration(750)
			.attr("transform", "translate(" + map.width / 2 + "," + map.height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
			;	
		zoom_level = 1;
	}	

	else if (zoom_level == 1){
		var x, y, k;

		var centroid = path.centroid(AREA);
		x = centroid[0];
		y = centroid[1];
		k = 3.0;
		centered = AREA;
	 
		mapVis.selectAll("path")
			.classed("active", centered && function(d) { return d === centered; })
			.remove()

		mapVis.transition()
			.duration(750)
			.attr("transform", "translate(" + map.width / 2 + "," + map.height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
			;	
		zoom_level = 2;
	}		
}

// Unzoom
function unZoom(BLOCK, perf_data){

	if (zoom_level == 1){
		x = map.width / 2;
		y = map.height / 2;
		k = 1;
		
		mapVis.selectAll("path")
			.remove()

		mapVis.transition()
			.duration(750)
			.attr("transform", "translate(" + map.width / 2 + "," + map.height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
			;	
	
		mainMap(perf_data);
		zoom_level = 0
	}
	
	else if (zoom_level == 2){
		var x, y, k;

		var centroid = path.centroid(BLOCK);
		x = centroid[0];
		y = centroid[1];
		k = 1.4;
		centered = BLOCK;
	 
		mapVis.selectAll("path")
			.classed("active", centered && function(d) { return d === centered; })
			.remove()

		mapVis.transition()
			.duration(750)
			.attr("transform", "translate(" + map.width / 2 + "," + map.height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
			;	
		blockMap(BLOCK, perf_data);	
		zoom_level = 1
	}

}	

// Return to GP view from dashboard
function backToGP(BLOCK, perf_data){
	mapSVG.selectAll(".histogram").remove();
	mapSVG.selectAll(".hist_title").remove();
	zoom_level = 1;
	Zoom(BLOCK);
	gpMap(BLOCK, perf_data);
}

		