/**
   Executes script on the page
*/
function executeScript(script) {
	var scriptTag = document.createElement('script');
	scriptTag.id = "scriptExecutor";
	scriptTag.text= script + " document.querySelector('script#scriptExecutor').remove();";
	document.getElementsByTagName('head')[0].appendChild(scriptTag);
}

/**
    Loads script from the given url and executes it
*/
function loadScript(url) {
	var scriptTag = document.createElement('script');
	scriptTag.src = chrome.extension.getURL('cod_complete.js');
	scriptTag.onload = function() {
		this.remove();
	};
	(document.head || document.documentElement).appendChild(scriptTag);
}

/**
   Checks whether extension popup is active

   @return true if popup active, false otherwise
*/
function isExtensionPopupActive() {
	return document.querySelectorAll('.tingle-modal.ontology_ids_selector_popup, .tingle-modal.handling_search_popup, .tingle-modal.first_run_loader').length > 0;
}

/**
   Opens and handles ontologies selector popup, assigns ontologies to input fields
*/
function open_and_handle_selector_popup() {
	// If set to true search of relevant ontologies will be performed using Recommender Service, otherwise it will be performed locally (much more faster, but not that intelligent)
	var useRecommenderSearch = true;
	
	// Checking whether extension popup is active to avoid 2 popups at the same time
	if(!isExtensionPopupActive()) {
		// Creating (but not showing) ontologies selector popup
		var modal = new tingle.modal({ 
		    footer: true,
		    stickyFooter: false,
		    closeMethods: [],
		    closeLabel: "Cancel",
		    cssClass: ['ontology_ids_selector_popup']
		});

		// Setting ontologies selector popup content
		modal.setContent('<p style="margin: 0px !important;">You can add/remove BioPortal Ontologies IDs.</p><p style="margin: 0px !important;">Note! You can add/remove ontologies later on anytime.</p><br><select id="ontology_ids" multiple></select>');
		// Adding footer button and event handler for that
		modal.addFooterBtn('OK', 'tingle-btn tingle-btn--primary tingle-btn--pull-left', function() {
			if(ontology_ids_selector.getValue() == '') { // If no ontologies selected, then doing nothing
				return false;
			} else {
				// Storing selected ontologies in variable
				defaultOntologies = ontology_ids_selector.getValue().toString();
			}

			if(useRecommenderSearch) {
				// Initialize variable for caching bioportal responses (if not initialized)
				if(typeof bioPortalRecommenderCache === "undefined") {
					bioPortalRecommenderCache = {};
				}

				// Creating (but not showing) search loader popup
	       		var loader = new tingle.modal({
				    closeMethods: [],
				    cssClass: ['handling_search_popup']
				});

				// Setting search loader popup content
				if(jQuery.isEmptyObject(bioPortalRecommenderCache)) {
					loader.setContent('<div id="preloader"><div id="loader"></div></div><br><br>Setting up the relevant ontologies for every input field.<br>It can take some time for the first run on the page. Please, wait!');
				} else {
					loader.setContent('<div id="preloader"><div id="loader"></div></div><br><br>Setting up the relevant ontologies for every input field.<br>Please, wait!');
				}
	       	} else {
	       		// Local ontologies search library object creation (if not created)
				if(typeof ontologiesSearch === "undefined") {
					ontologiesSearch = new Sifter(allOntologies);
				}
			}
	       	
			var searchPerformed = false;
			jQuery('input:text:not(#ontology_ids-selectized)').each(function() { // Iterating input fields
		       	var $element = jQuery(this); 
	       		var $label = jQuery("label[for='" + this.id + "']");

	       		// Defining callback function
	       		callback = function(recommenderOntologies) {
					var defaultOntologiesArray = defaultOntologies.toString().split(","); // Convert string into array for array-array comparsion to find the intersection
				
					// Finding the intersection of found ontologies and ontologies selected by user
					var qualifiedOntologies = defaultOntologiesArray.filter(function(ontology) {
						return recommenderOntologies.indexOf(ontology) !== -1;
					});
					
					// Assigning qualified ontology ids to the input field
					if(qualifiedOntologies.length > 0) {
						if($element.attr('class') != undefined) {
							$element.attr('class', $element.attr('class').replace(/[ ]*bp_form_complete-[a-zA-Z0-9_,]*-name/g, ''));
						}
						$element.attr("data-ontologies", qualifiedOntologies.join(',')); // Ontologies for input field should be set this way
						$element.addClass("bp_form_complete-" + qualifiedOntologies.join(',') + "-name"); // Saved for back support
					} else {
						if($element.attr('class') != undefined) {
							$element.attr('class', $element.attr('class').replace(/[ ]*bp_form_complete-[a-zA-Z0-9_,]*-name/g, ''));
						}
						$element.attr("data-ontologies", defaultOntologiesArray.join(',')); // Ontologies for input fields should be set this way
						$element.addClass("bp_form_complete-" + defaultOntologiesArray.join(',') + "-name"); // Saved for back support
					}
					$element.attr("data-bp_include_definitions", "true");
					$element.css('background-color', '#f9f9d2');

					// If search is performed using recommender and it's the last input field, then closing popup and executing autocomplete code
					if(($label.length > 0 || $element.attr('aria-label')) != undefined && useRecommenderSearch && typeof activeRequestsToBioPortal == "number" && activeRequestsToBioPortal == 1) {
					    loader.close();
						document.querySelector('.tingle-modal.handling_search_popup').remove();

						loadScript(chrome.extension.getURL('cod_complete.js'));
					}
				}
				// Running search for input field or assigning all selected ontologies (if there is nothing to search by)
	       		if($label.length > 0) {
	       			searchPerformed = true;
	       			if(useRecommenderSearch) {
	       				searchOntologiesUsingBioportal($label.text(), callback); // Search of relevant ontologies using BioPortal Recommender
	       			} else {
						searchOntologies($label.text(), callback); // Local search of relevant ontologies
					}
				} else if($element.attr('aria-label') != undefined) {
	       			searchPerformed = true;
	       			if(useRecommenderSearch) {
	       				searchOntologiesUsingBioportal($element.attr('aria-label'), callback); // Search of relevant ontologies using BioPortal Recommender
	       			} else {
						searchOntologies($element.attr('aria-label'), callback); // Local search of relevant ontologies
					}
				} else {
	       			callback([]);
				}
			});

			if(useRecommenderSearch && searchPerformed) {
				// Opening loader popup if there is ajax search request
		    	loader.open();
		    } else {
		    	// Executing autocomplete code
				loadScript(chrome.extension.getURL('cod_complete.js'));
		    }

		    // Closing ontologies selector popup
		    modal.close();
		    document.querySelector('.tingle-modal.ontology_ids_selector_popup').remove();
		});
		// Adding footer button and event handler for that
		modal.addFooterBtn('Cancel', 'tingle-btn tingle-btn--default tingle-btn--pull-left', function() {
		    // Closing ontologies selector popup
		    modal.close();
		    document.querySelector('.tingle-modal.ontology_ids_selector_popup').remove();
		});

		// Opening ontologies selector popup
		modal.open();

		// Getting user selected (or defualt) ontology ids
		if(typeof defaultOntologies === "undefined") {
			defaultOntologies = 'NCBITAXON,DOID,GO,OBI,PR,IDO,CL';
		}
		// Showing ontologies dropdown list
		var $select = jQuery('select#ontology_ids').selectize({
			options: allOntologies,
			items: defaultOntologies.toString().split(','),
			plugins: ['remove_button'],
		    delimiter: ',',
		    persist: false,
		    searchField: ['value', 'text'],
		    //sortField: {'field': 'text', 'direction': 'asc'}
		});
		var ontology_ids_selector = $select[0].selectize;
	}
}

/** 
   Searches ontologies by given string using BioPortal Recommender
   Executes callback function, passing an array of ontology IDs 
*/
function searchOntologiesUsingBioportal(text, callback) {
	// Check if callback is given
	if(typeof callback !== "function") {
		return;
	}

	// Initializing counter for active requests to the Bioportal (if not initialized)
	if(typeof activeRequestsToBioPortal != "number") {
		activeRequestsToBioPortal = 0;
	}
	if(typeof bioPortalRecommenderCache[text] === "undefined") {
		// Performing the request
		jQuery.ajax({
			url: 'https://data.bioontology.org/recommender?input=' + text + '&include=ontologies&display_links=false&display_context=false&apikey=89f4c54e-aee8-4af5-95b6-dd7c608f057f', 
		    dataType: 'JSON',
		    cache: true,
		    beforeSend: function() {
		    	activeRequestsToBioPortal++;
		    },
			success: function(data) {
				// Converting retrieved data to an array of ontology ids
		        for(i = 0; i < data.length; i++) {
					data[i] = data[i]['ontologies'][0]['acronym'];
				}

				// Caching the response data
				bioPortalRecommenderCache[text] = data;

				// Executing a callback function, passing an array of ontology IDs
				callback(data);
		    },
		    error: function() {
		    	// Executing callback function, passing an empty array
				callback([]);
		    },
		    complete: function() {
		    	activeRequestsToBioPortal--;
		    }
		});
	} else {
		activeRequestsToBioPortal++;
		setTimeout(function() {
			callback(bioPortalRecommenderCache[text]);
			activeRequestsToBioPortal--;
		}, 250);
	}
}

/**
   Locally searches ontologies by given string
   Returns array of ontology IDs or executes callback function, if given, passing the array of ontology IDs
*/
function searchOntologies(text, callback = null) {
	// Searching and storing results into a variable
	var result = [];
	ontologiesSearch.search(text, {fields: ['value', 'text']})['items'].forEach(function(item) {
		result.push(allOntologies[item['id']]['value']);
	});
	if(typeof callback == "function") {
		// Executing callback function, if given, passing the array of ontology IDs
		callback(result);
	} else {
		// Returning array of ontology IDs
		return result;
	}
}

if(!isExtensionPopupActive()) { // Checks whether extension popup is active to avoid 2 popups at the same time
	if(typeof allOntologies === 'undefined') { // If first run on the page (variable, storing all the ontologies, is not defined)
		// Creating (but not showing) first run loader popup
		var loader = new tingle.modal({
		    closeMethods: [],
		    cssClass: ['first_run_loader', 'footer_buttons_centralised']
		});
		// Setting first run loader popup content
		loader.setContent('<div id="preloader"><div id="loader"></div></div><br><br>Retrieving list of ontologies.<br>Please, wait!');
		// Opening first run loader popup
		loader.open();

		// Performing request to retrieve all the ontologies
		jQuery.ajax({
			url: 'https://data.bioontology.org/ontologies?include=name,acronym&display_links=false&display_context=false&apikey=89f4c54e-aee8-4af5-95b6-dd7c608f057f',
			dataType: 'JSON',
			success: function(data) {
				// Removing spaces at the beginning and the end of the ontology names
				for(i = 0; i < data.length; i++) {
					data[i]['name'] = data[i]['name'].trim();
		        }
		        // Sorting ontologies
				data.sort(function(a, b) {
					if(a.name < b.name) {
						return -1;
					}
					if(a.name > b.name) {
						return 1;
					}
					return 0;
				});
				// Saving all ontologies on the page and storing into the variable
				allOntologies = [];
				for(i = 0; i < data.length; i++) {
					allOntologies.push({value: data[i]['acronym'], text: data[i]['name']});
		        }

				// Closing first run loader popup
			    loader.close();
				document.querySelector('.tingle-modal.first_run_loader').remove();	

				open_and_handle_selector_popup();
			},
			error: function() {
				// Showing connection error in first run loader popup
				loader.setContent('<div class="swal-icon swal-icon--error"><div class="swal-icon--error__x-mark"><span class="swal-icon--error__line swal-icon--error__line--left"></span><span class="swal-icon--error__line swal-icon--error__line--right"></span></div></div>Problem connecting to NCBO BioPortal.<br>Sorry for the inconvenience caused. Please try again later!');
				// Setting up automatic closing of error popup (3 sec.)
				automaticHiding = setTimeout(function() {
			    	loader.close();
				}, 3000);
				loader.opts.onClose = function() {
					if(document.querySelector('.tingle-modal.first_run_loader') != null) {
						document.querySelector('.tingle-modal.first_run_loader').remove();
					}
					clearTimeout(automaticHiding);
				}
				// Letting user close the error popup by clicking on the overlay
				loader.opts.closeMethods = ['overlay', 'escape'];
			}
		});
	} else {
		open_and_handle_selector_popup();
	}
}