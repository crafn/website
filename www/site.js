var onSiteLoad= function()
{
	// Create list of tags
	var tag_counts= {}
	for (var i= 0; i < g_entries.length; ++i) {
		var entry= g_entries[i];
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
	$("#content").html(code);
};

var tag= function(tag)
{
	var entries= [];
	for (var i= 0; i < g_entries.length; ++i) {
		if ($.inArray(tag, g_entries[i].tags) != -1)
			entries.push(g_entries[i]);
	}

	var code= "<ul>";
	for (var i= 0; i < entries.length; ++i) {
		code += "<li>" + entries[i].title + "</li>";
	}
	code += "</ul>";
	changeContent(code);
};
