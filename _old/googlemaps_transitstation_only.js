// Place this script in the header or use Qualtrics to inject it when the survey page loads.
Qualtrics.SurveyEngine.addOnload(function() {
	// for reference: https://api.qualtrics.com/82bd4d5c331f1-qualtrics-java-script-question-api-class
	
	// problems with qualtrics, Array.From and google Maps: version 5.53 is now deprecated
	// https://stackoverflow.com/questions/76955952/array-from-with-an-implementation-that-doesnt-support-iterables-google-maps
	// https://developers.google.com/maps/documentation/javascript/releases
	// --> Array.from
	
	// THIS SCRIPT HAS TO BE CONNECTED TO A TEXT INPUT TYPE QUESTION.
	
	
	
	// THE FOLLOWING FIELDS NEED TO BE ADAPTED AND ADDED AS EMBEDDED FIELDS IN THE SURVEY FLOW
	
	// DATA FIELDS
    // These fields contain data after respondents filled in the question
  
	// Contains the text name of the input field
	let EMBEDDED_DATA_FIELD_ADDRESS = "w6_q18_address";
	// Contains the coordinates of the input field
	let EMBEDDED_DATA_FIELD_COORDINATES = "w6_q18_coordinates";
	
	

	// API KEYS
	// These fields need to be defined in the survey as embedded FIELDS

	// The Google Maps Api Key
	let API_KEY = Qualtrics.SurveyEngine.getEmbeddedData("__MAP_API_KEY");
	// The Map ID from your google cloud map platform (https://console.cloud.google.com/google/maps-apis/home)
	let MAP_ID  = Qualtrics.SurveyEngine.getEmbeddedData("__MAP_ID");
	
  
	// **************************************
	// DO NOT edit anything beyond this point
	// **************************************
	

	let qid = this.questionId;

	// Function to load the Google Maps API script dynamically
	function loadGoogleMapsAPI(callback) {
		let script = document.createElement("script");
		script.type = "text/javascript";
		script.src = "https://maps.googleapis.com/maps/api/js?v=3.53&key="+API_KEY+"&libraries=places&callback=" + callback;
		document.head.appendChild(script);
	}

	// Function to initialize the Google Map
	window.initMap = function() {
		let mapDiv = document.createElement("div");
		mapDiv.style.width = "100%";
		mapDiv.style.height = "400px";
		mapDiv.id = "map";

		// Insert the map div into the Qualtrics question text or after an input field
		document.getElementById(qid).appendChild(mapDiv); // Adjust "QID1" to your specific question ID

		const map = new google.maps.Map(document.getElementById('map'), {
		  center: { lat: 47, lng: 8 },
		  zoom: 8,
		  mapId: MAP_ID
		});
		
		let marker = null;
	
		const autocompleteOptions = {
		  fields: ["address_components", "geometry", "icon", "name", "formatted_address","name","place_id","types"],
		  strictBounds: false,
		  componentRestrictions: {
			country: "CH" // Switzerland
		  },
		  types: ["transit_station", "train_station", "subway_station", "light_rail_station", "bus_station"] // Restrict to establishments
		};
		
		const input = document.getElementById("QR~"+qid);

		// autocomplete	
		const autocomplete = new google.maps.places.Autocomplete(input, autocompleteOptions);

		// Listen for the 'place_changed' event on the autocomplete object
		autocomplete.addListener('place_changed', function() {			 
			// Get the place details from the autocomplete object.
			let place = autocomplete.getPlace();
		  
			if (place.geometry && place.geometry.location) {
				Qualtrics.SurveyEngine.setEmbeddedData(EMBEDDED_DATA_FIELD_COORDINATES, place.geometry.location.lat() + ", " + place.geometry.location.lng());
			} else {
				console.error("Selected place has no geometry.");
			}
			Qualtrics.SurveyEngine.setEmbeddedData(EMBEDDED_DATA_FIELD_ADDRESS, place.name + ", " + place.formatted_address);
			
			console.log(place.name + ", " + place.formatted_address);
			
			if (marker == null) {
				marker =  new google.maps.Marker({ 
				  map,
				  position: { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }, 
				});
			}
			marker.setMap(map); // In case the marker was previously not associated with the map
			marker.setPosition(place.geometry.location);
			let bounds = new google.maps.LatLngBounds();
			bounds.extend(marker.getPosition());
			map.fitBounds(bounds);
			map.setZoom(map.getZoom() - 4);
		});    
		
		input.setAttribute('placeholder', '');
	};

	// Load the Google Maps API script and initialize the map
	loadGoogleMapsAPI('initMap');
});


Qualtrics.SurveyEngine.addOnReady(function()
{
  /*Place your JavaScript here to run when the page is fully displayed*/

});

Qualtrics.SurveyEngine.addOnUnload(function()
{
  /*Place your JavaScript here to run when the page is unloaded*/
});
