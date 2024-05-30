Qualtrics.SurveyEngine.addOnload(function() {
    // for reference: https://api.qualtrics.com/82bd4d5c331f1-qualtrics-java-script-question-api-class

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

    let qid = this.questionId;

    // Function to create an iframe and load Google Maps API inside it
    function createIframe() {
        // Create iframe
        let iframe = document.createElement('iframe');
        iframe.style.width = "100%";
        iframe.style.height = "400px";
        iframe.id = "mapIframe";
		//iframe.src = "about:blank?apiKey="+API_KEY+"&mapId="+MAP_ID;
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
					window.marker = null;
					
					let apiKey = "";
                    let mapId = "";

					window.addEventListener("message", function(event) {
						if (event.data.type === "initMap") {
							console.log("TEST");
							console.log(event.data.apiKey);
							console.log(event.data.mapId);
							
							apiKey = event.data.apiKey;
							mapId = event.data.mapId;
							loadGoogleMapsAPIIframe();
						} else if (event.data.type === "place_changed") {
							const place = event.data.place;
							const location = place.geometry.location;
							if (location) {
								const latLng = new google.maps.LatLng(location.lat, location.lng);
								if (window.marker == null) {
									window.marker = new google.maps.Marker({
										map: window.map,
										position: latLng
									});
								} else {
									window.marker.setPosition(latLng);
								}
								window.map.setCenter(latLng);
								window.map.setZoom(14);
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

    // Function to initialize Google Places Autocomplete
	window.initAutocomplete = function() {
		console.log("initAutocomplete");
        const input = document.getElementById("QR~" + qid);
		console.log(input);
        const autocompleteOptions = {
            fields: ["address_components", "geometry", "icon", "name", "formatted_address", "name", "place_id", "types"],
            strictBounds: false,
            componentRestrictions: {
                country: "CH" // Switzerland
            },
            types: ["transit_station", "train_station", "subway_station", "light_rail_station", "bus_station"] // restrict to transit stations
        };

        const autocomplete = new google.maps.places.Autocomplete(input, autocompleteOptions);

		console.log(autocomplete);
		
        // Listen for the 'place_changed' event on the autocomplete object
        autocomplete.addListener('place_changed', function () {
					
            // Get the place details from the autocomplete object.
            let place = autocomplete.getPlace();

            if (place.geometry && place.geometry.location) {
                Qualtrics.SurveyEngine.setEmbeddedData(EMBEDDED_DATA_FIELD_COORDINATES, place.geometry.location.lat() + ", " + place.geometry.location.lng());
            } else {
                console.error("Selected place has no geometry.");
            }
            Qualtrics.SurveyEngine.setEmbeddedData(EMBEDDED_DATA_FIELD_ADDRESS, place.name);

            console.log(place.name + ", " + place.formatted_address);

            // Send the place details to the iframe
			const placeData = {
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

        input.setAttribute('placeholder', '');
    }

    // Create the iframe and initialize Google Places Autocomplete
	function loadGoogleMapsAPI(callback) {		
		// add google maps script, but only once
		const element = document.getElementById("mapsScript")
		if (!element) {
			let script = document.createElement("script");
			script.id = "mapsScript";
			script.type = "text/javascript";
			script.src = "https://maps.googleapis.com/maps/api/js?v=weekly&key="+API_KEY+"&libraries=places&callback=" + callback+ "&language=" + Qualtrics.SurveyEngine.getEmbeddedData("Q_Language").toLowerCase();
			document.head.appendChild(script);
		} else {
			initAutocomplete();
		}
	}
	
    createIframe();
	loadGoogleMapsAPI('initAutocomplete');
	
	window.addEventListener("message", function(event) {
        if (event.data.type === "iframeReady") {
			console.log("iframeReady!");
			
            let iframe = document.getElementById('mapIframe');
            iframe.contentWindow.postMessage({ type: "initMap", apiKey: API_KEY, mapId: MAP_ID }, "*");
        }
    });
});

Qualtrics.SurveyEngine.addOnReady(function () {
    /* Place your JavaScript here to run when the page is fully displayed */
});

Qualtrics.SurveyEngine.addOnUnload(function () {
    /* Place your JavaScript here to run when the page is unloaded */
});