var onSiteLoad= function()
{
	// Create list of tags
	var tag_counts= {}
	for (var i= 0; i < g_contentCfg.length; ++i) {
		var entry= g_contentCfg[i];
		for (var k= 0; k < entry.tags.length; ++k) {
			var tag= entry.tags[k];
			var count= tag_counts[tag] || 0;
			++count;
			tag_counts[tag]= count;
		}
	}
	var sortable_tags= [];
	for (var key in tag_counts) {
		if (tag_counts.hasOwnProperty(key))
			sortable_tags.push([tag_counts[key], key]);
	}
	sortable_tags.sort();
	var tags= []
	for (var i= 0; i < sortable_tags.length; ++i) {
		tags.push(sortable_tags[sortable_tags.length - i - 1][1]);
	}

	// Create navigation
	for (var i= 0; i < tags.length; ++i) {
		link_code= "<a href=\"\" onclick=\"tag('"
			+ tags[i] + "'); return false;\">"
			+ tags[i] + " &nbsp;||||</a></br>";
		$("#nav").append(link_code);
	}
};
window.onload= onSiteLoad;

var changeContent= function(code)
{
};

var tag= function(str)
{
	changeContent("<p>" + str + "</p>");
};
