chrome.runtime.setUninstallURL("https://cedarondemand.typeform.com/to/lGm792");
chrome.browserAction.onClicked.addListener(function (tab) {
	chrome.tabs.executeScript(tab.ib, {
		file: 'load_libraries.js'
	}, function() {
		chrome.tabs.executeScript(tab.ib, {
			file: 'cod.js'
		});
	});
});