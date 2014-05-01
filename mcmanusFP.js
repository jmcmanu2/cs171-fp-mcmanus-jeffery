// Modal
var bootbox_msg = "This visualization shows the quality of local management of the Mahatma Gandhi National Rural Employment Guarantee Scheme (MGNREGS) in three districts in Rajasthan, India. Blue-shaded villages indicate higher-quality management, and red-shaded villages indicate lower-quality management. <br/><br/> Data on the quality of management comes from surveys of program beneficiaries collected by the Abdul Latif Jameel Poverty Action Lab at MIT (J-PAL) in 2010. Survey responses have been aggregated to yield performance scores for villages. Details about each village's performance score are provided in a 'dashboard' of indicators, which includes the village's scores on specific criteria and MGNREGS program outlays in the village over time.<br/><br/> Left-click on areas of the map to zoom down, and right-click to return to the previous view. To skip directly to a village's dashboard, select from the dropdown menus at right.<br/><br/> For more information, scroll down the page to view the screencast and the process book below the visualization."

bootbox.dialog({
	message: bootbox_msg,
	title: "Local variation in the quality of public service delivery: <br/>A tool for targeting social audits in India",
	buttons:{
		vis:{
			label: "Go to visualization",
			className: "btn-vis",
			callback: function(){}
		}
	}
	
});


// Map area
var map = {
	width: 900,
	height: 570
}
var titles = {
	width: map.width,
	height: 30
}

// Map projection	
var projection = d3.geo.mercator()
	.center([77.2, 27.0])
	.scale(15000)
	.translate([map.width*0.5, map.height*0.5]);
	
var path = d3.geo.path().projection(projection);

var mapTitles = d3.select("div#titles")
	.append("svg")
	.attr({
		width: titles.width,
		height: titles.height
	})
	
var titlesBorder = mapTitles.append("rect")
	.attr("x", 0)
	.attr("y", 0)
	.attr("height", titles.height)
	.attr("width", titles.width)
	.style("stroke", "black")
	.style("fill", "black")
	.style("stroke-width", 1)
	;
	
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
	.style("fill", "#F0F0F0")
	.style("stroke-width", 1);
	
// Map tooltips
var tooltip = d3.select("body")
	.append("div")   
	.attr("class", "tooltip")               
	.style("opacity", 0);
	
var tooltip2 = d3.select("body")
	.append("div")   
	.attr("class", "tooltip")               
	.style("opacity", 0);
	
// Color for choropleths
//var color_range = colorbrewer.Reds[7];
var color_range = ["#67001f","#b2182b","#d6604d","#f4a582","#fddbc7","#d1e5f0","#92c5de","#4393c3","#2166ac","#053061"];
var color = d3.scale.quantize()
	.domain([1,10])
	.range(color_range);
	
// Data binding	
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

	// Drop-down search lists
	var ddarea = {
		width: 1300-map.width,
		height: 50
	}

	var dropdown1 = d3.select("div#search")
		.append("select")
		.attr("class","dropdown")
	dropdown1
		.append("option")
		.text("(Select District)")
		
	var dropdown2 = d3.select("div#search")
		.append("select")
		.attr("class","dropdown")
	dropdown2
		.append("option")
		.text("(Select Block)")
		
	var dropdown3 = d3.select("div#search")
		.append("select")
		.attr("class","dropdown")
	dropdown3
		.append("option")
		.text("(Select Village)")
				
		// District list
		var district_list = ["(Select District)"];
		perf_data.forEach(function(gp){
			district_list.push(gp["district"])
		})
		district_list = d3.set(district_list).values();


		dropdown1.selectAll("option")
			.data(district_list)
			.enter()
			.append("option")
			.attr("value",function(d){ return d})
			.text(function(d){ return d})

		dropdown1.on("change", blockdd);

		// Block list
		function blockdd(){
			dropdown2.selectAll("option").remove();
			dropdown2
				.append("option")
				.text("(Select Block)")
					
			dropdown3.selectAll("option").remove();
			dropdown3
				.append("option")
				.text("(Select Village)")
					
			var selectedDistrict = d3.event.target.value
			
			var this_district = ["(Select Block)"];
			perf_data.forEach(function(gp){
				if (selectedDistrict == gp["district"]){
					this_district.push(gp["tahsil"])
				}
			})
			this_district = d3.set(this_district).values();

			dropdown2.selectAll("option")
				.data(this_district)
				.enter()
				.append("option")
				.attr("value",function(d){ return d})
				.text(function(d){ return d})

			dropdown2.on("change", gpdd);

		}

		// GP list
		function gpdd(){
			dropdown3.selectAll("option").remove();
			var selectedBlock = d3.event.target.value
			
			var this_block = ["(Select Village)"];
			perf_data.forEach(function(gp){
				if (selectedBlock == gp["tahsil"]){
					this_block.push(gp["gp_name"])
				}
			})
			this_block = d3.set(this_block).values();

			dropdown3.selectAll("option")
				.data(this_block)
				.enter()
				.append("option")
				.attr("value",function(d){ return d})
				.text(function(d){ return d})
				
			dropdown3.on("change",function(){
				mapSVG.selectAll("text").remove();	
		
				var selectedGP = d3.event.target.value;
				
				var selectedGP_data;
				perf_data.forEach(function(gp){
					if (selectedGP == gp["gp_name"] && selectedBlock == gp["tahsil"]  ){
						selectedGP_data = gp;
					}
				})
				selectedGP_data["properties"] = {"district": selectedGP_data["district"], "tahsil": selectedGP_data["tahsil"]}
				
		
				var selectedBLOCK_data ;
				d3.json("../data/blocks2.json", function(error,json_blocks){
					json_blocks.features.forEach(function(block){
						if (block['properties']['tahsil'] == selectedGP_data['properties']['tahsil']){
							selectedBLOCK_data = block;
						}
					})	
					
					dashboard(selectedGP_data, perf_data);
					zoom_level = 3;
					mapSVG	
					.on("contextmenu", function(){
						if (zoom_level == 3){
							backToGP(selectedBLOCK_data, perf_data);
							d3.event.preventDefault();
								mapVis	
									.on("contextmenu", function(){
										unZoom(selectedBLOCK_data, perf_data);
										d3.event.preventDefault();
									})		
									;							
						}			
					})
				})
			})

		}

	// Bind data to maps
	mainMap(perf_data);

})	

var mapVis = mapSVG
	.append("g")

// Add legend
var color_for_legend = [1,2,3,4,5,6,7,8,9,10];
var legend_labels = ["1 (worst)",,,,,,,,,"10 (best)"]
function Legend(){
	var legend = mapSVG.selectAll(".legend")
		.data(color_for_legend)
		.enter().append("g")
		.attr("class", "legend");

	var ls_w = 20, ls_h = 20;
	legend.append("text")
		.attr("x", 20)
		.attr("y", map.height - (10*ls_h) - ls_h - 4)
		.attr("font-weight","bold")
		.text("Performance Score");

	legend.append("rect")
		.attr("x", 20)
		.attr("y", function(d, i){ return map.height - (i*ls_h) - 2*ls_h;})
		.attr("width", ls_w)
		.attr("height", ls_h)
		.style("fill", function(d, i) { return color(d); })
		.style("opacity", 1.0);
	 
	legend.append("text")
		.attr("x", 50)
		.attr("y", function(d, i){ return map.height - (i*ls_h) - ls_h - 4;})
		.text(function(d, i){ return legend_labels[i]; });

}
Legend();

// Starting map parameters
var centered; 
var zoom_level = 0;
		
// District-level map
function mainMap(perf_data){
d3.json("../data/states2.json", function(error,json_states){

	// Create state boundaries for context
	mapVis.selectAll(".state_context")
		.data(json_states.features)
		.enter()
		.append("path")
		.attr("d", path)
		.attr("class", "state_context")
		;
	
	mapSVG.append("text")
		.attr("class", "state_name")
		.attr("transform", "translate(200,200)")
		.style("font-weight","bold")
		.text("Rajasthan")
		;
		
	mapSVG.append("text")
		.attr("class", "state_name")
		.attr("transform", "translate(425,15)")
		.style("font-weight","bold")
		.text("Haryana")
		;				

	mapSVG.append("text")
		.attr("class", "state_name")
		.attr("transform", "translate(700,200)")
		.style("font-weight","bold")
		.text("Uttar Pradesh")
		;	

	mapSVG.append("text")
		.attr("class", "state_name")
		.attr("transform", "translate(650,500)")
		.style("font-weight","bold")
		.text("Madhya Pradesh")
		;

			
	d3.json("../data/districts2.json", function(error,json_districts){
			
		// Map title
		mapTitles.selectAll(".map_title").remove();
		mapTitles.append("text")
			.attr("class", "map_title")
			.attr("transform", "translate("+map.width/2+",20)")
			.style("font-weight","bold")
			.style("fill","white")
			.style("stroke","black")
			.style("stroke-width","0.1")
			.text("Study area")
			;
	
		// Create village polygons
		d3.json("../data/gps2.json", function(error,json_gps){

			// Filter villages in selected district
			var all_gps = [];
			json_gps.features.forEach(function(gp){
				all_gps.push(gp);
			})
					
			// Bind village data to paths
			all_gps.forEach(function(gp1){
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

			mapVis.selectAll(".gp_area")
				.data(all_gps)
				.enter()
				.append("path")
				.attr("d", path)
				.attr("class", "gp_area")
				.style("opacity", 0.5)
				.style("stroke-opacity", 0.3)
				.style("fill", function(d) {
					var value = d['Hperf_final'];
					if (value) {
						return color(value);
					} 
					else {
						return color(5);
					}
				})

			// Add map labels
			mapVis.selectAll(".place-label").remove();
			mapVis.selectAll(".place-label")
				.data(json_districts.features)
				.enter()
				.append("text")
				.attr("class", "place-label")
				.attr("transform", function(d){ 
					var x_coord = path.centroid(d)[0]
					var y_coord = path.centroid(d)[1]
					return "translate(" + x_coord+","+y_coord + ")"; 
				})
					
				//.attr("dy", ".35em")
				.text(function(d) { return d['properties']['district']; })
				;

			// Create district paths
			mapVis.selectAll(".area")
				.data(json_districts.features)
				.enter()
				.append("path")
				.attr("d", path)
				.attr("class", "area")
				.style("stroke","black")
				.style("fill-opacity", 0)
				.style("fill", "white")
				.style("stroke-width","1px")
				.style("stroke-opacity", 0.7)
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
				.on("mouseover", function(d){
					d3.select(this)
					.style("fill","yellow")
					.style("fill-opacity", 0.4);
					
					tooltip
						.html("Click to zoom to block view") 
						.style("opacity", 1)
						.style("left", (d3.event.pageX + 20) + "px")     
						.style("top", (d3.event.pageY) + "px")   
						.style("height", "35px")
						;	
				})
				.on("mouseout", function(){
					d3.select(this)		
					.style("fill", "white")
					.style("fill-opacity", 0.0)
					
					tooltip.style("opacity",0)
				})	
				;
			

		})
	})
})
}

// Block-level map
function blockMap(DISTRICT, perf_data){
// Create state boundaries for context
d3.json("../data/states2.json", function(error,json_states){

	mapVis.selectAll(".state_context")
		.data(json_states.features)
		.enter()
		.append("path")
		.attr("d", path)
		.attr("class", "state_context")
		;

	// Create district boundaries for context
	d3.json("../data/districts2.json", function(error,json_districts){

		mapVis.selectAll(".district_context")
			.data(json_districts.features)
			.enter()
			.append("path")
			.attr("d", path)
			.attr("class", "district_context")

		d3.json("../data/blocks2.json", function(error,json_blocks){

			// Change map title
			mapTitles.selectAll(".map_title").remove();
			mapTitles.append("text")
				.attr("class", "map_title")
				.attr("transform", "translate("+map.width/2+",20)")
				.style("font-weight","bold")
				.style("fill","white")
				.text("District: " + DISTRICT['properties']['district'])
				;
		
			// Create village polygons
			d3.json("../data/gps2.json", function(error,json_gps){
					
				// Filter villages in selected district
				var district_gps = [];
				json_gps.features.forEach(function(gp){
					if (gp['properties']['district'] == DISTRICT['properties']['district']){
						district_gps.push(gp);
					}
				})
						
				// Bind village data to paths
				district_gps.forEach(function(gp1){
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

				mapVis.selectAll(".gp_area")
					.data(district_gps)
					.enter()
					.append("path")
					.attr("d", path)
					.attr("class", "gp_area")
					.style("opacity", 0.5)
					.style("stroke-opacity", 0.3)
					.style("fill", function(d) {
						var value = d['Hperf_final'];
						if (value) {
							return color(value);
						} 
						else {
							return "#ccc";
						}
					})

				// Filter blocks in selected district
				var selected_blocks = [];
				json_blocks.features.forEach(function(block){
					if (block['properties']['district'] == DISTRICT['properties']['district']){
						selected_blocks.push(block);
					}
				})
			
				// First add map labels
				mapVis.selectAll(".place-label").remove();
				mapVis.selectAll(".place-label")
					.data(selected_blocks)
					.enter()
					.append("text")
					.attr("class", "place-label")
					.attr("transform", function(d){ 
						var x_coord = path.centroid(d)[0]
						var y_coord = path.centroid(d)[1]
						return "translate(" + x_coord+","+y_coord + ")";
					})
					.attr("dx", "-2.5em")
					.style("font-size", "7pt")
					.text(function(d) { return d['properties']['tahsil']; })
					;
		
				// Create block paths
				mapVis.selectAll(".block_area")
					.data(selected_blocks)
					.enter()
					.append("path")
					.attr("d", path)
					.attr("class", "block_area")
					.style("stroke","black")
					.style("fill-opacity", 0)
					.style("fill", "white")
					.style("stroke-width","1px")
					.style("stroke-opacity", 0.5)
					.on("click", function(d){
						Zoom(d);
						gpMap(d, perf_data);
					})			
					.on("mouseover", function(d){
						d3.select(this)
						.style("fill","yellow")
						.style("fill-opacity", 0.4);
						
						tooltip
							.html("Click to zoom to village view<br/>Right click to return to district") 
							.style("opacity", 1)
							.style("left", (d3.event.pageX + 20) + "px")     
							.style("top", (d3.event.pageY) + "px")   
							.style("height", "35px")
							;	
					})
					.on("mouseout", function(){
						d3.select(this)		
						.style("fill", "white")
						.style("fill-opacity", 0.0)
						
						tooltip.style("opacity", 0); 
					})	
		
			})
			
			
		})
	})
})
}

// Village-level map
function gpMap(BLOCK, perf_data){

// Create state boundaries for context
d3.json("../data/states2.json", function(error,json_states){

	mapVis.selectAll(".state_context")
		.data(json_states.features)
		.enter()
		.append("path")
		.attr("d", path)
		.attr("class", "state_context")
		;

	// Create district boundaries for context
	d3.json("../data/districts2.json", function(error,json_districts){

		mapVis.selectAll(".district_context")
			.data(json_districts.features)
			.enter()
			.append("path")
			.attr("d", path)
			.attr("class", "district_context")
		
		d3.json("../data/gps2.json", function(error,json_gps){
			
			// Change map title
			mapTitles.selectAll(".map_title").remove();
			mapTitles.append("text")
				.attr("class", "map_title")
				.attr("transform", "translate("+map.width/2+",20)")
				.style("font-weight","bold")
				.style("fill","white")
				.text("Block (District): " + BLOCK['properties']['tahsil'] + " (" + BLOCK['properties']['district'] + ")")
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

			
			// Create gp paths
			mapVis.selectAll(".gp_area")
				.data(selected_gps)
				.enter()
				.append("path")
				.attr("d", path)
				.attr("class", "gp_area")
				.style("stroke-width", "0.2px")
				.style("fill", function(d) {
					var value = d['Hperf_final'];
					if (value) {
						return color(value);
					} 
					else {
						return "#ccc";
					}
				})
				.on("mouseover", function(d){
					d3.select(this)
					.style("fill","yellow");

					var gp_name = d["properties"]["gp_name"];
					var perf_score = d['Hperf_final']

					tooltip
						.html("Village: " + gp_name + "<br/>Click to view dashboard<br/>Right click to return to block") 
						.style("opacity", 1)
						.style("left", (d3.event.pageX + 20) + "px")     
						.style("top", (d3.event.pageY) + "px")   
						.style("height", "50px")
						;
				})
				.on("mouseout", function(){
					d3.select(this)		
					.style("fill", function(d) {
						var value = d['Hperf_final'];
						if (value) {
							return color(value);
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
				
			// Remove map labels
			mapVis.selectAll(".place-label").remove();		
		})
	})
})
}

function dashboard(GP, perf_data){
	mapVis.selectAll("path").remove()
	mapVis.selectAll(".place-label").remove()
	mapSVG.selectAll(".legend").remove()
	
	// Tooltip with instructions
	mapSVG
		.on("click", function(){
			tooltip2
				.html("Right click to return to map") 
				.style("opacity", 1)
				.style("left", (d3.event.pageX + 20) + "px")     
				.style("top", (d3.event.pageY) + "px")   
				.style("height", "35px")
				;
			tooltip2
				.transition()
				.duration(2000)
				.style("opacity",0)
		})

		
	// Change title
	mapTitles.selectAll(".map_title").remove();
	mapTitles.append("text")
		.attr("class", "map_title")
		.attr("transform", "translate("+map.width/2+",20)")
		.style("font-weight","bold")
		.style("fill","white")
		.text("VILLAGE (Block, District): " + GP['gp_name'] + " (" + GP['properties']['tahsil'] + ", " + GP['properties']['district'] + ")")
		;


	// Create grid borders for dashboard
	var mapBorder1 = mapSVG.append("rect")
		.attr("class","border")
		.attr("x", 0)
		.attr("y", 0)
		.attr("height", map.height/2)
		.attr("width", map.width)
		.style("stroke", "black")
		.style("fill", "none")
		.style("stroke-width", 1);
		
	var mapBorder2 = mapSVG.append("rect")
		.attr("class","border")
		.attr("x", 0)
		.attr("y", 0)
		.attr("height", map.height)
		.attr("width", map.width/2)
		.style("stroke", "black")
		.style("fill", "none")
		.style("stroke-width", 1);

		
	// Print this village's performance score
	var perf_score = GP["Hperf_final"];

	// Histogram of performance scores
		
		// Histogram title
		mapSVG
			.append("text")
			.attr("class","dash_subtitles")
			.text("Distribution of performance scores in study area.")
			.attr("transform", "translate(10,15)")
		mapSVG
			.append("text")
			.attr("class","dash_subtitles")
			.text(GP['gp_name']+"'s score is in the highlighted bin.")
			.attr("transform", "translate(10,30)")

		// Get performance data values
		var hist_values = [];
		perf_data.forEach(function(gp){
			var value = gp['Hperf_final'];
			hist_values.push(value);
		})			
		
		// Dimensions
		var hist_margin = {top: 40, right: 30, bottom: 30, left: 30};
		var hist_width = map.width/2 - hist_margin.left - hist_margin.right;
		var hist_height = map.height/2 - hist_margin.top - hist_margin.bottom;

		// X Scale
		var xScale = d3.scale.linear()
			.domain([0.5, 10.5])
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
			.tickValues([1,2,3,4,5,6,7,8,9,10])
			.outerTickSize(0)
			;

		// Histogram area
		var histogram = mapSVG.append("g")
			.attr("width", hist_width + hist_margin.left + hist_margin.right)
			.attr("height", hist_height + hist_margin.top + hist_margin.bottom)
			.attr("class", "histogram")
			.attr("transform", "translate(" + hist_margin.left + ",45)")
			;
			
		// Histogram bars
		var bar = histogram.selectAll(".bar")
			.data(hist_data)
			.enter()
			.append("g")
			.attr("class", "bar")
			.attr("transform", function(d) { return "translate(" + xScale(d.x-0.5) + "," + yScale(d.y) + ")"; });

		bar.append("rect")
			.attr("x", 1)
			.attr("width", hist_width/11)
			.attr("height", function(d) { return hist_height - yScale(d.y); })
			.style("fill", function(d) {
				if (perf_score == d.x){
					return "yellow";
				}
				else {
					return "blue";
				}
			})
			//.attr("transform", "translate(0," + hist_margin.top + ")")
			;
			
		// Add X axis
		histogram.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + hist_height + ")")
			.call(xAxis)
			;
		
		// Add X axis labels
		var label_y = map.height/2-5;
		mapSVG.append("text")
			.attr("transform", "translate(5,"+label_y+")")
			.text("(worst)")
			
		var label_x = map.width/2-38;
		mapSVG.append("text")
			.attr("transform", "translate("+label_x+","+label_y+")")
			.text("(best)")


	// Table of components of performance scores
	
		// Table title
		var title_x = map.width/2 + 10
		mapSVG
			.append("text")
			.attr("class","dash_subtitles")
			.text("Components of performance score")
			.attr("transform", "translate("+title_x+",20)")
			
		// Table data
		var column_names = ["Component","All Villages Average",GP['gp_name']];
		var table_data = [column_names];
		var varnames = ["Hperf1","Hperf2","Hperf3","Hperf4","Hperf5"];
		varnames.forEach(function(varname){
			var temp_all = [];
			perf_data.forEach(function(gp){
				temp_all.push(gp[varname + "_final"])
			})
			if (varname == "Hperf1"){
				var avg_value = d3.round(d3.mean(temp_all),2);
			}
			else{
				var avg_value = d3.round(d3.mean(temp_all));
			}

			var this_value = GP[varname + "_final"];
			var var_name;
			table_data.push([var_name,avg_value,this_value]);
		})

		var row_names = ["MGNREGS Rating","(1 = worst, 5 = best)","Wages below 100/day","(% HH)","Unmet demand","(% HH)","Paid bribe for job","(% HH)","Delay in getting job","(average num of days)"];
		
		// Table dimensions
		var tableX = 470;
		var tableY = 30;
		var tableH = map.height/2;
		var tableW = map.width/2-30;
		var cellH = tableH/7;
		var cellW = tableW/3;
		
		// Table elements
		var table = mapSVG
			.append("g")
			.attr("class","table")
			.attr("transform","translate("+tableX+","+tableY+")")
			;
		
		var first_column = mapSVG.selectAll("text.row")
			.data(row_names)
			.enter()
			.append("text")
			.attr("transform",function(d,i){
				var X = tableX + 5;
				var Y = tableY + cellH + (i+1)*cellH/2 - 7.5;
				return "translate("+X+","+Y+")"
				})
			.text(function(d){return d;})
			;
			
		var tableBody = table.append("g");
		var row = tableBody.selectAll("g.row")
			.data(table_data);
		row
			.enter()
			.append("g")
			.each(function(A,B){
				
				// Cells
				var cell = d3.select(this)
					.selectAll("rect.cell")
					.data(A)
				
				cell
					.enter()
					.append("rect")
					.attr({
						width: cellW,
						height: cellH,
						x: function(d,i) {return i*cellW;},
						y: function(d,i) {return B*cellH;},
						fill: "white",
						stroke: "black"
					})
				
				// Text
				cell
					.enter()
					.append("text")
					.attr({
						x: function(d,i) {return i*cellW;},
						y: function(d,i) {return B*cellH;},
						dx: function(d,i){
							if (i == 0){
								return 5;
							}
							else {
								return cellW/2;
							}
						},
						dy: cellH/2,
						fill: "black",
						"text-anchor": function(d,i){
							if (i == 0){
								return "left";
							}
							else {
								return "middle";
							}
						}
					})
					.html(function(d,i) {return d;})
				})	
					
	// Expenditures over time (Line1)
	var line1_x = 10;
	LineGraph("web_exp_tot","MGNREGS Expenditures Over Time","Expenditures (Rs lakh)", line1_x);

	// Person-days over time (Line2)
	var line2_x = map.width/2 + 10;
	LineGraph("web_persondays_total","MGNREGS Person-Days Over Time","Person-Days ('000s)", line2_x);
	
	// Line graph function
	function LineGraph(indicator,line_title, yaxis_title, translate_left){
	
		// Line1 title
		var title_y = map.height/2 + 20;
		var line1_title = mapSVG
			.append("text")
			.attr("class","dash_subtitles")
			.text(line_title)
			.attr("transform", "translate("+translate_left+","+title_y+")")
		
		// Data
		var years = [2009,2010,2011,2012,2013];
		var line1_data = [];
		years.forEach(function(year){
			var temp_all = [];
			perf_data.forEach(function(gp){
				if (gp[indicator + year] != 0){
					temp_all.push(gp[indicator + year]);
				}
			})
			var avg_value = d3.round(d3.mean(temp_all),2);
			var this_value = GP[indicator + year];
			line1_data.push({"year": year, "avg": avg_value, "this_gp": this_value});
		})

		// Dimensions
		var line1_margin = {top: 60, right: 30, bottom: 30, left: 40};
		var line1_width = map.width/2 - line1_margin.left - line1_margin.right;
		var line1_height = map.height/2 - line1_margin.top - line1_margin.bottom;
	
		// X Scale
		var xScale_line1 = d3.scale.linear()
			.domain(d3.extent(years))
			.range([0,line1_width])
			;
			
		// X Axis
		var xAxis_line1 = d3.svg.axis()
			.scale(xScale_line1)
			.orient("bottom")
			.tickValues(years)
			.outerTickSize(0)
			.tickFormat(d3.format("d"))
			;

		// Y Scale
		var yScale_line1 = d3.scale.linear()
			.domain([0, d3.max(line1_data, function(d){ 
				return d3.max([d["avg"],d["this_gp"]]);
			})])
			.range([line1_height, 0])
			;

		// Y Axis
		var yAxis_line1 = d3.svg.axis()
			.scale(yScale_line1)
			.orient("left")
			.outerTickSize(0)
			;
			
		// Line1 graph area
		var line1_x = translate_left + line1_margin.left;
		var line1_y = map.height/2 + line1_margin.top;
		var line1_graph = mapSVG.append("g")
			.attr("width", line1_width + line1_margin.left + line1_margin.right)
			.attr("height", line1_height + line1_margin.top + line1_margin.bottom)
			.attr("class", "line_graph")
			.attr("transform", "translate(" + line1_x + ","+line1_y+")")
			;

		// Dots
		var series = ["avg","this_gp"];
		series.forEach(function(line){
		
			var line1_dots = line1_graph.selectAll(".line1_points")
				.data(line1_data)
				.enter()
				.append("circle")
				.attr("r", 2)
				.attr("cx", function(d) { return xScale_line1(d["year"]);})
				.attr("cy", function(d) { return yScale_line1(d[line]);})
				.style("stroke", "black")
				.style("stroke-width","0.5")
				.style("fill",function(){
					if (line == "avg"){
						return "blue";
					}
					else{
						return "red";
					}
				});

			// Lines
			var line1 = d3.svg.line()
				.x(function(d) { 
					return xScale_line1(d["year"]); 
				})
				.y(function(d) {
						return yScale_line1(d[line]); 
				})
			;	
			
			line1_graph
				.append("path")
				.datum(line1_data)
				.attr("class","line")
				.attr("d",line1)
				.style("stroke",function(){
					if (line == "avg"){
						return "blue";
					}
					else{
						return "red";
					}
				});				
		})
		
		// Add X axis
		line1_graph.append("g")
			.attr("class", "axis")
			.attr("transform", "translate(0," + line1_height + ")")
			.call(xAxis_line1)
			;

		// Add Y axis
		var line1_yaxis_y = line1_margin.top - line1_margin.bottom;
		line1_graph.append("g")
			.attr("class", "axis")
			.attr("transform", "translate(0,0)")
			.call(yAxis_line1)
			.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y",-30)
			.style("text-anchor","end")
			.attr("font-weight", "bold")
			.text(yaxis_title)
			;	
		
		// Legend
		var legend_line_labels = ["Average",GP["gp_name"]]
		var legend_line = line1_graph.selectAll(".legend")
			.data(["blue","red"])
			.enter()
			.append("g")
			.attr("class", "legend")
			;
		var leg_w = 20, leg_h = 20;
	
		legend_line.append("rect")
			.attr("x", line1_width*0.75)
			.attr("y", function(d, i){ return (i*leg_h-40);})
			.attr("width", leg_w)
			.attr("height", leg_h)
			.style("fill", function(d, i) { return d; })
			.style("opacity", 1.0);
		
		legend_line.append("text")
			.attr("x", line1_width*0.75 + leg_w + 2)
			.attr("y", function(d, i){ return (i*leg_h-27);})
			.text(function(d,i) { return legend_line_labels[i]; })
			.style("font-size","10px")
			;
	}
				
	
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
	 
		mapSVG.selectAll(".state_name").remove();
		
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
		
		mapVis.selectAll("path").remove();
		
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
	mapSVG.selectAll(".table").remove();
	mapSVG.selectAll(".border").remove();
	mapSVG.selectAll(".line_graph").remove();
	mapSVG.selectAll("text").remove();
	zoom_level = 1;
	Legend();
	Zoom(BLOCK);
	gpMap(BLOCK, perf_data);
	mapSVG
		.on("click", function(){
			tooltip2
				.style("opacity",0)
		})
		
	}

