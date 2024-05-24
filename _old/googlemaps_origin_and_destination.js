// Place this script in the header or use Qualtrics to inject it when the survey page loads.
Qualtrics.SurveyEngine.addOnload(function() {
  // for reference: https://api.qualtrics.com/82bd4d5c331f1-qualtrics-java-script-question-api-class
  
  
  // THIS SCRIPT HAS TO BE CONNECTED TO A PURE TEXT TYPE QUESTION. (NO OTHER INPUT)
  
  
  
  // THE FOLLOWING FIELDS NEED TO BE ADAPTED AND ADDED AS EMBEDDED FIELDS IN THE SURVEY FLOW
  
  // TEXT FIELDS
  // These fields should contain text that is displayed. You are responsible for translating them in the survey flow.
  
  // The origin field is displayed above the first input box
  let origin_field = "__ORIGIN";
  // The destination field is displayed above the second input box
  let destination_field = "__DESTINATION";
  
  // DATA FIELDS
  // These fields contain data after respondents filled in the question
  
  // contains the text name of the origin
  let origin_field_result = "w6_q1_wohnort";
  // contains the coordinates (comma separated latitude and longitude) of the origin
  let origin_field_result_coordinates = "w6_q1_wohnort_coordinates";
  // contains the text name of the destination
  let destination_field_result = "w6_q1_arbeitsort";
  // contains the coordinates (comma separated latitude and longitude) of the destination
  let destination_field_result_coordinates = "w6_q1_arbeitsort_coordinates";
  
  
  // API KEYS
  // These fields need to be defined in the survey as embedded FIELDS
  
  // The Google Maps Api Key
  let API_KEY = Qualtrics.SurveyEngine.getEmbeddedData("__MAP_API_KEY");
  // The Map ID from your google cloud map platform (https://console.cloud.google.com/google/maps-apis/home)
  let MAP_ID  = Qualtrics.SurveyEngine.getEmbeddedData("__MAP_ID");
  
  
  // **************************************
  // DO NOT edit anything beyond this point
  // **************************************
  
  var qid = this.questionId;
  
  let dropdownLabelText = "Transportmittel";
  
  let show_add_and_remove_buttons = false;
  let show_directions = false;
  let show_travel_modes = false;
  let show_travel_time = false;
  let number_initial_locations = 2;
  let max_locations = 2;
  
  
  const style = document.createElement('style');
  style.textContent = `
  .LocationInputText, .LocationDropdown {
	  width:78%;
	  padding: 10px!important;
  }
  .LocationDropdown {
	  margin-bottom: 20px;
	  border: 2px solid #787878;
  }
  .LocationQuestionText {
	  width:100%!important;
	  display: block;
	  padding: 10px;
  }
  .LocationRemoveButton, .LocationAddButton {
	  width:10%;
	  padding-top: 10px!important;
	  padding-bottom: 10px!important;
	  margin-left: 2px;
  }
  .LocationDiv {
	  margin-bottom:20px;
  }
  `;
  document.head.append(style);

  // Function to load the Google Maps API script dynamically
  function loadGoogleMapsAPI(callback) {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://maps.googleapis.com/maps/api/js?v=3.53&key="+API_KEY+"&libraries=places&callback=" + callback;
    document.head.appendChild(script);
  }

  // Function to initialize the Google Map
  window.initMap = function() {
    var mapDiv = document.createElement("div");
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

    const autocompleteOptions = {
      fields: ["address_components", "geometry", "icon", "name", "formatted_address"],
      strictBounds: false,
	  componentRestrictions: {
		country: "CH" // Switzerland
	  }
    };
    var questionElements = document.getElementsByClassName('QuestionBody');
    var questionElement = questionElements[0];
	
	// initialise map services and renderers
	var directionsServices = [];
	var directionsRenderers = [];
	
	// Options for the dropdown
    const travel_modes = [
        { value: 'DRIVING', text: 'Auto' },
        { value: 'TRANSIT', text: 'ÖV' },
        { value: 'WALKING', text: 'Zu Fuss' },
        { value: 'BICYCLING', text: 'Velo' }
    ];
    
	
	for (let i = 0; i < max_locations; i++) {
		directionsServices.push(new google.maps.DirectionsService());
		directionsRenderers.push(new google.maps.DirectionsRenderer({map: map, suppressMarkers: true}));
	}

	// improvement suggestion: put all of these in to separate objects for each location
	let counter = 0;
	let markers = [];
	let address_texts = [];
	
	// this saves all important attributes
	let locations = [];

	// adds a location in the lists after index (e.g. index == 0 => new location at index == 1)
	function addLocation(id=null, title="") {
		if (locations.length >= max_locations) return;
		
		if (id != null && locations.some(elem => elem.id === id)) { 
			// id is valid 
			index = locations.findIndex(elem => elem.id === id)+1;
		}
		else { // default add index at end
			id = null;
			index = locations.length;
		}
		
		// new marker for new location
		let marker =  null;
		// new id for new location
		let newId = counter++; // set newId to counter and then count + 1
		
		let newLocation = {
			marker: marker,
			id: newId,
			addressText: "",
			travelMode: travel_modes[0].value
		}
		
		// add location at correct position in locations array
		locations = [
			...locations.slice(0, index),
			newLocation,
			...locations.slice(index)
		];
		
		let inputId = "input-"+newId;

		const locationDiv = document.createElement('div');
		locationDiv.setAttribute('class', 'LocationDiv');
		locationDiv.setAttribute('id', inputId);
		
		if (id == null){ // append at end
			questionElement.appendChild(locationDiv);
		} else { // insert at index
			let inputIdAtIndex = "input-"+id;
			let elementAtIndex = document.getElementById(inputIdAtIndex);
			elementAtIndex.insertAdjacentElement("afterend", locationDiv);
		}

		// New label for the location
		const locationLabel = document.createElement('label');
		locationLabel.setAttribute('for', inputId);
		locationLabel.setAttribute('id', inputId+"-label");
		locationLabel.setAttribute('class', 'LocationQuestionText');
		locationLabel.innerText = title;
		locationDiv.appendChild(locationLabel);
		
		// New input for the location
		const locationInput = document.createElement('input');
		locationInput.setAttribute('id', inputId+"-input");
		locationInput.setAttribute('class', 'LocationInputText');
		locationInput.setAttribute('type', 'TEXT');
		locationInput.setAttribute('placeholder', '');
		locationDiv.appendChild(locationInput);
		
		if (show_add_and_remove_buttons){
			// New add  button for the location
			const addButton = document.createElement('button');
			addButton.setAttribute('id', inputId+"-add");
			addButton.setAttribute('class', 'LocationAddButton');
			addButton.innerText = "+";
			locationDiv.appendChild(addButton);
			addButton.addEventListener('click', function() { addLocation(newId); });
			
			// New remove  button for the location
			const removeButton = document.createElement('button');
			removeButton.setAttribute('id', inputId+"-remove");
			removeButton.setAttribute('class', 'LocationRemoveButton');
			removeButton.innerText = "-";
			locationDiv.appendChild(removeButton);
			removeButton.addEventListener('click', function() { removeLocation(newId); });
		}
		
		// Add a dropdown after the input field to select the travel mode on this leg
		if (show_travel_modes) {
			// New label for the location
			const dropdownLabel = document.createElement('label');
			dropdownLabel.setAttribute('for', inputId+"-dropdown");
			dropdownLabel.setAttribute('id', inputId+"-dropdown-label");
			dropdownLabel.setAttribute('class', 'LocationQuestionText');
			dropdownLabel.innerText = dropdownLabelText;
			locationDiv.appendChild(dropdownLabel);
			
			const selectElement = document.createElement('select');
			selectElement.setAttribute('class', 'LocationDropdown');
			selectElement.setAttribute('id', inputId+"-dropdown");
			
			// Loop through the options and create an option element for each one
			travel_modes.forEach(mode => {
				const optionElement = document.createElement('option');
				optionElement.value = mode.value;
				optionElement.textContent = mode.text;
				selectElement.appendChild(optionElement);
			});

			// Append the select element to the container
			locationDiv.appendChild(selectElement);
			
			// update the mode if it changes
			selectElement.addEventListener('change', function() {
				index = locations.findIndex(elem => elem.id === newId);
				locations[index].travelMode = this.value;
				updateDirections();
				updateQualtricsData();
			});
		}
		
		
		const autocomplete = new google.maps.places.Autocomplete(locationInput, autocompleteOptions);

		// Listen for the 'place_changed' event on the autocomplete object
		autocomplete.addListener('place_changed', function() {
		  // Get the place details from the autocomplete object.
		  var place = autocomplete.getPlace();
		  
		  index = locations.findIndex(elem => elem.id === newId);
		  
		  locations[index].addressText = place.formatted_address;

		  // Check if the place has a geometry (location)
		  if (place.geometry) {
			// Set or update the marker's position
			if (locations[index].marker == null) {
				locations[index].marker = new google.maps.Marker({ 
				  map,
				  position: { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
				});
			} else {
				locations[index].marker.setPosition(place.geometry.location);
			}
			locations[index].marker.setMap(map); // In case the marker was previously not associated with the map

			var bounds = new google.maps.LatLngBounds();
			let markercount = 0;
			locations.forEach((elem) => {	
				if (elem.marker != null) {
					markercount++;
					bounds.extend(elem.marker.getPosition());
				}
			});
			map.fitBounds(bounds);
			if (markercount == 1) {
				map.setZoom(map.getZoom() - 4);
			}
		  } else {
			// Handle case where no place was selected
			console.log('No place selected or place has no location data.');
		  }
		  
		  updateDirections();
		  updateQualtricsData();
		});
	}
	
	function removeLocation(id) {
		
		if (id != null && locations.some(elem => elem.id === id) && locations.length > 1) { 
			// id is valid 
			index = locations.findIndex(elem => elem.id === id);
		} 
		else return;
		
		// remove marker
		if (marker != null) {
			locations[index].marker.setMap(null);
		}
		
		locations = [
			...locations.slice(0, index),
			...locations.slice(index+1)
		];
				
		let inputId = "input-"+id;
		const locationDiv = document.getElementById(inputId);
		locationDiv.remove();
		
		var bounds = new google.maps.LatLngBounds();
		locations.forEach((elem) => {
			if (elem.marker != null) {
				bounds.extend(elem.marker.getPosition());
			}
		});
		map.fitBounds(bounds);	
		
		updateDirections();
		updateQualtricsData();
	}
	
	function updateDirections() {
		if (!show_directions) return;
		
		let durationTotal = 0;
		let distanceTotal = 0;
		
		for (let i = 0; i < locations.length - 1; i++) {
			
			// Access the current item and the next item
			// --> iterate through all legs of the route
			const current = locations[i];
			const next = locations[i + 1];
			
			if (current.marker == null || next.marker == null) continue;
			
			var request = {
			  origin: current.marker.getPosition(),
			  destination: next.marker.getPosition(),
			  travelMode: current.travelMode
			};
			directionsServices[i].route(request, function (result, status) {
			  if (status === 'OK') {				  
				directionsRenderers[i].setDirections(result);
				durationTotal += result.routes[0].legs[0].duration.value;
				distanceTotal += result.routes[0].legs[0].distance.value;
				
				if (show_travel_time) {
					output.innerText = "Total " + (durationTotal/60) + " min, " + (distanceTotal/1000) + " km";
				}
			  }
			});
			
			
		}
	}
	
	function updateQualtricsData() {
		
		if (locations[0].marker != null) {
			// save origin data
			Qualtrics.SurveyEngine.setEmbeddedData(origin_field_result, locations[0].addressText );
			Qualtrics.SurveyEngine.setEmbeddedData(origin_field_result_coordinates, locations[0].marker.getPosition().lat() + ", " + locations[0].marker.getPosition().lng());
		}
		
		
		if (locations[1].marker != null) {
			// save destination data
			Qualtrics.SurveyEngine.setEmbeddedData(destination_field_result, locations[1].addressText );
			Qualtrics.SurveyEngine.setEmbeddedData(destination_field_result_coordinates, locations[1].marker.getPosition().lat() + ", " + locations[1].marker.getPosition().lng() );
		}
	}
	

	// Add initial locations
	addLocation(null, Qualtrics.SurveyEngine.getEmbeddedData(origin_field));
	addLocation(null, Qualtrics.SurveyEngine.getEmbeddedData(destination_field));
	

	// A text field where text can be displayed programmatically
    const output = document.createElement('p');
    output.setAttribute('class', 'QuestionText');
    document.getElementById("map").appendChild(output);
    
  };

  // Load the Google Maps API script and initialize the map
  loadGoogleMapsAPI('initMap');
});



// Add a general click event listener to the map
    /*map.addListener('click', function(e) {
      var latLng = e.latLng;
      var lat = latLng.lat();
      var lng = latLng.lng();

      // Update a text input field with the latitude and longitude
      document.getElementById("QR~"+qid).value = "Lat: " + lat + ", Lng: " + lng; // Adjust the ID accordingly
    });*/



Qualtrics.SurveyEngine.addOnReady(function()
{
  /*Place your JavaScript here to run when the page is fully displayed*/

});

Qualtrics.SurveyEngine.addOnUnload(function()
{
  /*Place your JavaScript here to run when the page is unloaded*/
});
