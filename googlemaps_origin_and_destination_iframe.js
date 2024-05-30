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
		const element = document.getElementById("mapsScript")
		if (!element) {
			let script = document.createElement("script");
			script.id = "mapsScript";
			script.type = "text/javascript";
			script.src = "https://maps.googleapis.com/maps/api/js?v=weekly&key="+API_KEY+"&libraries=places&callback=" + callback + "&language=" + Qualtrics.SurveyEngine.getEmbeddedData("Q_Language").toLowerCase();
			document.head.appendChild(script);
		} else {
			initAutocomplete();
		}
	}
	
	function createIframe() {
        // Create iframe
        let iframe = document.createElement('iframe');
        iframe.style.width = "100%";
        iframe.style.height = "400px";
        iframe.id = "mapIframe";
        document.getElementById(qid).appendChild(iframe);

        // Write the Google Maps API code inside the iframe
        let iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body, html { height: 100%; margin: 0; padding: 0; }
                    #map { height: 100%; }
                </style>
                <script>
					window.markers = [null, null]
					
					let apiKey = "";
					let mapId = "";

					window.addEventListener("message", function(event) {
						if (event.data.type === "initMap") {
							apiKey = event.data.apiKey;
							mapId = event.data.mapId;
							loadGoogleMapsAPIIframe();
						} else if (event.data.type === "place_changed") {
							const place = event.data.place;
							const location = place.geometry.location;
							if (location) {
								const latLng = new google.maps.LatLng(location.lat, location.lng);
								if (window.markers[place.id] == null) {
									window.markers[place.id] = new google.maps.Marker({
										map: window.map,
										position: latLng
									});
								} else {
									window.markers[place.id].setPosition(latLng);
								}
								var bounds = new google.maps.LatLngBounds();
								let markercount = 0;
								window.markers.forEach((elem) => {	
									if (elem != null) {
										markercount++;
										bounds.extend(elem.getPosition());
									}
								});
								map.fitBounds(bounds);
								if (markercount == 1) {
									map.setZoom(map.getZoom() - 4);
								}
							}
						} else if (event.data.type === "ready") {
                            window.parent.postMessage({ type: "iframeReady" }, "*");
                        }
					});
				
                    function loadGoogleMapsAPIIframe() {
						
                        let script = document.createElement("script");
                        script.type = "text/javascript";
                        script.src = "https://maps.googleapis.com/maps/api/js?v=weekly&key="+apiKey+"&libraries=places&callback=initMap";
                        document.head.appendChild(script);
                    }

                    function initMap() {
                        window.map = new google.maps.Map(document.getElementById('map'), {
                            center: { lat: 47, lng: 8 },
                            zoom: 8,
                            mapId: mapId
                        });
						
						
                    }
					
					// Notify parent window that iframe is ready
                    window.onload = function() {
                        window.parent.postMessage({ type: "iframeReady" }, "*");
                    };
                </script>
            </head>
            <body>
                <div id="map"></div>
            </body>
            </html>
        `);
        iframeDoc.close();
		
		//iframe.onload = function() {
		//	iframe.contentWindow.postMessage({ type: "initMap", apiKey: API_KEY, mapId: MAP_ID }, "*");
		//};
    }

	// Function to initialize the Google Map
	window.initAutocomplete = function() {
		const autocompleteOptions = {
		  fields: ["address_components", "geometry", "icon", "name", "formatted_address"],
		  strictBounds: false,
		  componentRestrictions: {
			country: "CH" // Switzerland
		  }
		};
		var questionElements = document.getElementsByClassName('QuestionBody');
		var questionElement = questionElements[0];

		function addLocation(id, title) {			
			let inputId = "input-"+id;

			const locationDiv = document.createElement('div');
			locationDiv.setAttribute('class', 'LocationDiv');
			locationDiv.setAttribute('id', inputId);
			
			questionElement.appendChild(locationDiv);

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
			
			
			const autocomplete = new google.maps.places.Autocomplete(locationInput, autocompleteOptions);

			// Listen for the 'place_changed' event on the autocomplete object
			autocomplete.addListener('place_changed', function() {
				// Get the place details from the autocomplete object.
				var place = autocomplete.getPlace();

				if (id == 0) {
					// save origin data
					Qualtrics.SurveyEngine.setEmbeddedData(origin_field_result, place.name );
					Qualtrics.SurveyEngine.setEmbeddedData(origin_field_result_coordinates, place.geometry.location.lat() + ", " + place.geometry.location.lng());
				}
				if (id == 1) {
					// save destination data
					Qualtrics.SurveyEngine.setEmbeddedData(destination_field_result, place.name );
					Qualtrics.SurveyEngine.setEmbeddedData(destination_field_result_coordinates, place.geometry.location.lat() + ", " + place.geometry.location.lng());
				}
			
				// Send the place details to the iframe
				const placeData = {
					id: id, 
					name: place.name,
					formatted_address: place.formatted_address,
					geometry: {
						location: {
							lat: place.geometry.location.lat(),
							lng: place.geometry.location.lng()
						}
					}
				};

				// Send the place details to the iframe
				let iframe = document.getElementById('mapIframe');
				iframe.contentWindow.postMessage({ type: "place_changed", place: placeData }, "*");
				
			});
		}


		// Add initial locations
		addLocation(0, Qualtrics.SurveyEngine.getEmbeddedData(origin_field));
		addLocation(1, Qualtrics.SurveyEngine.getEmbeddedData(destination_field));
	};


	createIframe();
	loadGoogleMapsAPI('initAutocomplete');
	
	window.addEventListener("message", function(event) {
        if (event.data.type === "iframeReady") {
            let iframe = document.getElementById('mapIframe');
            iframe.contentWindow.postMessage({ type: "initMap", apiKey: API_KEY, mapId: MAP_ID }, "*");
        }
    });
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
